#!/bin/bash
set -e

# Auction Fluency – shell build script (no Gradle)
# Builds Android APK for Meta Portal device using Android SDK build tools directly.
# Pattern matches My Sous Chef app and Beehive Monitor Portal app deployment workflow familiar to Jo,
# but simplified to shell commands without Gradle wrapper overhead per artifact specification.
#
# What this script does step by step:
#  1. Locate Android SDK at ANDROID_HOME or ~/Library/Android/sdk or ~/Android/Sdk
#  2. Find latest build-tools version automatically (aapt, d8, zipalign, apksigner)
#  3. Find highest installed platform android.jar (prefers 34, falls back to 36,35...28) for compilation;
#     AndroidManifest declares minSdk 28 targetSdk 28 for Portal compatibility, compiling against newer platform is safe.
#  4. Locate JDK 17 or 11 via /usr/libexec/java_home, JAVA_HOME env, or ~/jdk manual tarball fallback
#     (manual tarball documented because Homebrew /opt/homebrew permissions often require sudo fix on fresh Macs)
#  5. Clean build directory
#  6. aapt package: compile resources, assets, manifest into unsigned APK skeleton
#  7. javac compile: compile MainActivity.java against android.jar bootclasspath to .class files
#  8. d8 dex: convert .class files to classes.dex Dalvik bytecode; explicit file list required not directory on newer d8 versions
#  9. aapt add: insert classes.dex into APK at root path (must cd into build dir so internal path is correct, not build/classes.dex)
# 10. zipalign: align uncompressed data on 4-byte boundaries for runtime efficiency
# 11. apksigner: sign APK with debug keystore at ~/.android/debug.keystore (auto-generated via keytool if missing)
# 12. Output final APK to build/AuctionFluency.apk ready for adb install
#
# Usage:
#   chmod +x build.sh
#   export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"   # or your JDK path
#   export PATH="$JAVA_HOME/bin:$PATH"
#   ./build.sh
# Expected output ends with "=== SUCCESS ===" and APK size around 33KB.
#
# Troubleshooting see README.md Troubleshooting section or run ./scripts/test.sh first to validate project structure.

APP_NAME="AuctionFluency"
PACKAGE="com.meta.auctionfluency"
BUILD_DIR="build"
SRC_DIR="src"
RES_DIR="res"
ASSETS_DIR="assets"
MANIFEST="AndroidManifest.xml"

echo "=== Auction Fluency build ==="

# 1. Find Android SDK
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    SDK_DIR="$ANDROID_HOME"
elif [ -d "$HOME/Library/Android/sdk" ]; then
    SDK_DIR="$HOME/Library/Android/sdk"
elif [ -d "$HOME/Android/Sdk" ]; then
    SDK_DIR="$HOME/Android/Sdk"
else
    echo "ERROR: Android SDK not found. Set ANDROID_HOME or install SDK to ~/Library/Android/sdk"
    echo "  See Portal Hacking Setup Guide: https://docs.google.com/document/d/1_ECxsB_qlhhxY4gGT8nAsUyqCF-Cs9sq1FeQJBnTc6o/edit"
    exit 1
fi
echo "SDK: $SDK_DIR"

# 2. Find build-tools (pick latest)
BUILD_TOOLS_DIR=$(ls -1 "$SDK_DIR/build-tools" 2>/dev/null | sort -V | tail -n1)
if [ -z "$BUILD_TOOLS_DIR" ]; then
    echo "ERROR: No build-tools found in $SDK_DIR/build-tools"
    echo "  Install via sdkmanager: sdkmanager 'build-tools;34.0.0'"
    exit 1
fi
BUILD_TOOLS="$SDK_DIR/build-tools/$BUILD_TOOLS_DIR"
echo "Build-tools: $BUILD_TOOLS_DIR"

AAPT="$BUILD_TOOLS/aapt"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"

for tool in "$AAPT" "$D8" "$ZIPALIGN" "$APKSIGNER"; do
    if [ ! -x "$tool" ]; then
        echo "ERROR: Missing $tool"
        exit 1
    fi
done

# 3. Find platform android.jar (prefer 34, fallback to highest installed; manifest declares 28 for Portal compatibility)
PLATFORM_JAR=""
for ver in 34 36 35 33 32 31 30 29 28; do
    if [ -f "$SDK_DIR/platforms/android-$ver/android.jar" ]; then
        PLATFORM_JAR="$SDK_DIR/platforms/android-$ver/android.jar"
        PLATFORM_VER=$ver
        break
    fi
done
if [ -z "$PLATFORM_JAR" ]; then
    echo "ERROR: No android.jar found in $SDK_DIR/platforms/"
    echo "  Install platform via: sdkmanager 'platforms;android-34'"
    exit 1
fi
echo "Platform jar: android-$PLATFORM_VER (manifest targets API 28 for Portal)"

# 4. Find JDK
JAVA_HOME_CANDIDATE=""
if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    JAVA_HOME_CANDIDATE=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 11 2>/dev/null || true)
fi
if [ -z "$JAVA_HOME_CANDIDATE" ] && [ -n "$JAVA_HOME" ]; then
    JAVA_HOME_CANDIDATE="$JAVA_HOME"
fi
# Fallback to manual tarball install location used on this machine to bypass brew permissions issue
if [ -z "$JAVA_HOME_CANDIDATE" ] && [ -d "$HOME/jdk" ]; then
    # pick newest jdk-17* or jdk-11* directory under ~/jdk
    JDK_DIR=$(ls -1d "$HOME"/jdk/jdk-17* "$HOME"/jdk/jdk-11* 2>/dev/null | sort -V | tail -n1)
    if [ -n "$JDK_DIR" ] && [ -d "$JDK_DIR/Contents/Home" ]; then
        JAVA_HOME_CANDIDATE="$JDK_DIR/Contents/Home"
    elif [ -n "$JDK_DIR" ] && [ -x "$JDK_DIR/bin/javac" ]; then
        JAVA_HOME_CANDIDATE="$JDK_DIR"
    fi
fi
if [ -z "$JAVA_HOME_CANDIDATE" ]; then
    echo "ERROR: JDK not found."
    echo "  Option A — brew (may need sudo chown fix first):"
    echo "    brew install openjdk@17"
    echo "    export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    echo "  Option B — manual tarball (works without brew permissions, already used successfully on this machine):"
    echo "    mkdir -p ~/jdk && cd ~/jdk"
    echo "    curl -L -o openjdk17.tar.gz https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.11_9.tar.gz"
    echo "    tar -xzf openjdk17.tar.gz"
    echo "    export JAVA_HOME=\$HOME/jdk/jdk-17.0.11+9/Contents/Home"
    echo "  Then: export PATH=\"\$JAVA_HOME/bin:\$PATH\""
    exit 1
fi
export JAVA_HOME="$JAVA_HOME_CANDIDATE"
export PATH="$JAVA_HOME/bin:$PATH"
echo "JDK: $JAVA_HOME"

JAVAC="$JAVA_HOME/bin/javac"
KEYTOOL="$JAVA_HOME/bin/keytool"
if ! command -v "$JAVAC" >/dev/null 2>&1; then
    echo "ERROR: javac not found in $JAVA_HOME/bin"
    exit 1
fi

# 5. Clean and prepare build dir
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/classes"

# 6. aapt package resources + assets + manifest -> unsigned apk base
echo "[1/6] aapt package..."
"$AAPT" package -f -M "$MANIFEST" -S "$RES_DIR" -A "$ASSETS_DIR" -I "$PLATFORM_JAR" -F "$BUILD_DIR/unsigned.apk" --no-crunch

# 7. javac compile MainActivity
echo "[2/6] javac compile..."
"$JAVAC" -d "$BUILD_DIR/classes" -source 1.8 -target 1.8 -bootclasspath "$PLATFORM_JAR" -sourcepath "$SRC_DIR" "$SRC_DIR/com/meta/auctionfluency/MainActivity.java"

# 8. d8 dex
echo "[3/6] d8 dex..."
# Find all .class files – d8 needs explicit file list not just directory on some versions
CLASS_FILES=$(find "$BUILD_DIR/classes" -name "*.class")
"$D8" --lib "$PLATFORM_JAR" --output "$BUILD_DIR" $CLASS_FILES

# 9. add classes.dex to apk
echo "[4/6] aapt add dex..."
# Must add from inside build directory so APK internal path is classes.dex not build/classes.dex
( cd "$BUILD_DIR" && "$AAPT" add unsigned.apk classes.dex >/dev/null )

# 10. zipalign
echo "[5/6] zipalign..."
"$ZIPALIGN" -f 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"

# 11. keystore and sign
KEYSTORE="$HOME/.android/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    echo "Generating debug keystore at $KEYSTORE..."
    mkdir -p "$(dirname "$KEYSTORE")"
    "$KEYTOOL" -genkey -v -keystore "$KEYSTORE" -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi

echo "[6/6] apksigner..."
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out "$BUILD_DIR/$APP_NAME.apk" "$BUILD_DIR/aligned.apk"

echo ""
echo "=== SUCCESS ==="
echo "APK: $BUILD_DIR/$APP_NAME.apk"
ls -lh "$BUILD_DIR/$APP_NAME.apk"
echo ""
echo "Deploy to Portal:"
echo "  adb install -r $BUILD_DIR/$APP_NAME.apk"
echo "  adb shell am start -n $PACKAGE/.MainActivity"

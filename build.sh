#!/bin/bash
set -e

# Auction Fluency – shell build script (no Gradle)
# Pattern matches My Sous Chef app Jo already deploys to Portal
# Resolves SDK, build-tools, platform jar, JDK automatically

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
if [ -z "$JAVA_HOME_CANDIDATE" ]; then
    echo "ERROR: JDK not found."
    echo "  Install OpenJDK 17: brew install openjdk@17"
    echo "  Then: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    echo "        export PATH=\"\$JAVA_HOME/bin:\$PATH\""
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
"$D8" --lib "$PLATFORM_JAR" --output "$BUILD_DIR" "$BUILD_DIR/classes"

# 9. add classes.dex to apk
echo "[4/6] aapt add dex..."
"$AAPT" add "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/classes.dex" >/dev/null

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

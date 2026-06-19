#!/bin/bash
set -e
#
# Auction Fluency – refresh script for rapid iteration during development
# Rebuilds APK from current source and redeploys to USB-connected Portal in one command.
# Pattern matches My Sous Chef Portal app refresh workflow and Beehive Monitor refresh.sh concept,
# though Beehive uses Gradle assembleDebug and Python dashboard generation step which we omit here
# because Auction Fluency content is static bundled assets not generated at build time.
#
# Usage: ./scripts/refresh.sh   (from project root or scripts directory)
# Prerequisites same as deploy.sh: Portal USB connected, ADB enabled, APK built at least once before to verify toolchain.
# This script calls ./build.sh internally so JDK and Android SDK must be configured (see README Prerequisites).
#
cd "$(dirname "$0")/.."

# Ensure JAVA_HOME set for build step — try common locations automatically to reduce manual export burden
if [ -z "${JAVA_HOME:-}" ]; then
  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 11 2>/dev/null || true)
  fi
  if [ -z "${JAVA_HOME:-}" ] && [ -d "$HOME/jdk" ]; then
    JDK_DIR=$(ls -1d "$HOME"/jdk/jdk-17* "$HOME"/jdk/jdk-11* 2>/dev/null | sort -V | tail -n1)
    if [ -n "$JDK_DIR" ] && [ -d "$JDK_DIR/Contents/Home" ]; then
      export JAVA_HOME="$JDK_DIR/Contents/Home"
    elif [ -n "$JDK_DIR" ] && [ -x "$JDK_DIR/bin/javac" ]; then
      export JAVA_HOME="$JDK_DIR"
    fi
  fi
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "==> Rebuilding APK from current source..."
./build.sh

echo "==> Pushing updated APK to Portal..."
adb install -r build/AuctionFluency.apk

echo "==> Launching refreshed app..."
adb shell am start -n com.meta.auctionfluency/.MainActivity

echo ""
echo "Refreshed successfully. On Portal you should see updated content immediately."
echo "If Portal still shows old content, WebView cache may persist despite LOAD_NO_CACHE setting."
echo "Force clear app data to guarantee fresh assets from new APK:"
echo "  adb shell pm clear com.meta.auctionfluency"
echo "  adb shell am start -n com.meta.auctionfluency/.MainActivity"
echo "Note: clearing app data resets progress tracking localStorage back to 0% — expected after content update."

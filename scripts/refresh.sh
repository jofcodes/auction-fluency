#!/bin/bash
set -e
cd "$(dirname "$0")/.."
# Refresh script for parity with My Sous Chef Portal app pattern (shell build, no Gradle).
# Since assets are bundled inside APK, refresh still requires rebuild.
# This script rebuilds and pushes updated APK without full uninstall.
echo "Rebuilding..."
./build.sh
echo "Pushing update to Portal..."
adb install -r build/AuctionFluency.apk
adb shell am start -n com.meta.auctionfluency/.MainActivity
echo "Refreshed."

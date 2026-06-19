#!/bin/bash
set -e
cd "$(dirname "$0")/.."
APK="build/AuctionFluency.apk"
if [ ! -f "$APK" ]; then
  echo "APK not found at $APK – run ./build.sh first"
  exit 1
fi
echo "Checking adb..."
adb devices
echo "Installing APK to Portal..."
adb install -r "$APK"
echo "Launching Auction Fluency..."
adb shell am start -n com.meta.auctionfluency/.MainActivity
echo "Done. App should be visible on Portal in landscape fullscreen."
echo ""
echo "# Optional: keep Portal awake while USB powered (uncomment to enable)"
echo "# adb shell settings put global stay_on_while_plugged_in 3"

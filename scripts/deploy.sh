#!/bin/bash
set -e
#
# Auction Fluency – deploy script for Meta Portal device via ADB
# Pattern matches Beehive Monitor deploy.sh but simplified for shell-built APK (no Gradle step, no dashboard generation).
# Usage: ./scripts/deploy.sh   (from project root or scripts directory)
# Prerequisites: Portal connected via USB-C, ADB enabled in Settings → Debug, tap Allow on Portal screen authorization popup.
#                APK built already via ./build.sh resulting in build/AuctionFluency.apk
#
cd "$(dirname "$0")/.."
APK="build/AuctionFluency.apk"
PKG="com.meta.auctionfluency"
ACT="$PKG/.MainActivity"

if [ ! -f "$APK" ]; then
  echo "ERROR: APK not found at $APK"
  echo "  Run ./build.sh first to compile APK. See README.md Build section for JDK setup instructions."
  exit 1
fi

echo "==> Checking adb device connection..."
adb devices
# adb devices should list one device ID with 'device' status. If empty or unauthorized:
#   - Check USB-C cable firmly connected Portal to Mac
#   - On Portal go to Settings → Debug → ensure ADB Enabled toggle is on
#   - On Portal screen tap Allow when RSA fingerprint authorization dialog appears
#   - Then re-run adb devices to confirm

echo "==> Verifying APK structure before install..."
# Quick sanity check that APK contains expected components at correct paths (not build/ prefix which caused INSTALL_FAILED_INVALID_APK previously)
"$(ls -1 ~/Library/Android/sdk/build-tools 2>/dev/null | sort -V | tail -n1 | xargs -I{} echo $HOME/Library/Android/sdk/build-tools/{}/aapt | xargs -I{} sh -c 'test -x {} && echo {}' | head -n1)" list "$APK" | grep -q "^classes.dex$" || { echo "WARNING: classes.dex not found at APK root – build may be malformed. Re-run ./build.sh"; }
# Above uses latest aapt found; warning only, not fatal, since aapt path detection here is best-effort for contributor convenience.

echo "==> Installing APK to Portal (preserving app data with -r flag)..."
adb install -r "$APK"
# Expected output: "Performing Streamed Install" then "Success". If you see INSTALL_FAILED_INVALID_APK, run ./build.sh again to regenerate clean APK, then retry.

echo "==> Forcing launcher icon cache refresh..."
# Portal launcher sometimes caches app list aggressively after fresh install. These commands prod it to recognize new package without full reboot.
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
adb shell am force-stop com.android.launcher3 2>/dev/null || true
adb shell am force-stop com.facebook.portal.launcher 2>/dev/null || true
adb shell am force-stop com.android.launcher 2>/dev/null || true
# If icon still not visible after this script completes, fallback is full device reboot: adb reboot (takes ~60 seconds)

echo "==> Launching Auction Fluency on Portal..."
adb shell am start -n "$ACT"
# Expected output: Starting: Intent { cmp=com.meta.auctionfluency/.MainActivity }

echo ""
echo "Done. Auction Fluency should now be visible on Portal in landscape fullscreen immersive mode."
echo "Press Portal home button to see app drawer — icon should appear next to Beehive Monitor with Meta blue background and white gavel."
echo ""
echo "To verify installation details:"
echo "  adb shell pm list packages | grep auction   # should show package:com.meta.auctionfluency"
echo "  adb shell dumpsys package com.meta.auctionfluency | grep -A2 category | head   # should show MAIN LAUNCHER intent filter registered"
echo "  adb shell pidof com.meta.auctionfluency   # should show numeric PID if app is currently running"
echo ""
echo "# Optional: keep Portal screen awake while USB powered (uncomment to enable, same as Beehive Monitor setup):"
echo "# adb shell settings put global stay_on_while_plugged_in 3"

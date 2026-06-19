#!/bin/bash
set -e
#
# Auction Fluency – test suite for local validation without Portal hardware or Android build tools
# Validates JSON syntax, required project files existence, AndroidManifest correctness.
# Run this before every commit or pull request to catch common mistakes early.
# Usage: ./scripts/test.sh   (from project root or scripts directory)
# Expected output ends with "=== ALL TESTS PASS ===". Exit code 0 means pass, non-zero means fail.
# No Android SDK, no JDK, no ADB required — pure Python and shell checks, runs in under 2 seconds.
#
cd "$(dirname "$0")/.."
echo "=== Auction Fluency test suite ==="
echo "[1/3] Validate JSON syntax..."
python3 << 'PY'
import json, glob, sys
ok=True
required_keys={"title","topic","readingLinks","concepts","quiz"}
for p in sorted(glob.glob("assets/www/data/*.json")):
    try:
        d=json.load(open(p))
    except Exception as e:
        print(f"FAIL {p}: invalid JSON {e}"); ok=False; continue
    if p.endswith("checkpoint.json"):
        need={"ordering","explainBack","openQuestions"}
    else:
        need=required_keys
    missing=need-d.keys()
    if missing:
        print(f"FAIL {p}: missing keys {missing}"); ok=False
    else:
        q=len(d.get("quiz",[])) if "quiz" in d else 0
        print(f"OK {p} keys ok quiz_items={q}")
if not ok:
    sys.exit(1)
print("All JSON valid")
PY
echo "[2/3] Check required project files..."
for f in AndroidManifest.xml build.sh src/com/meta/auctionfluency/MainActivity.java assets/www/index.html assets/www/style.css assets/www/app.js res/values/strings.xml res/drawable/ic_launcher.xml README.md CONTRIBUTING.md LICENSE docs/brief.md scripts/deploy.sh scripts/refresh.sh scripts/test.sh; do
  test -f "$f" || { echo "MISSING $f"; exit 1; }
  echo "found $f"
done
echo "[2b] Check UI components in HTML for new user onboarding features..."
grep -q 'onboarding-overlay' assets/www/index.html && echo "onboarding overlay html ok" || { echo "missing onboarding overlay"; exit 1; }
grep -q 'glossary-overlay' assets/www/index.html && echo "glossary modal html ok" || { echo "missing glossary"; exit 1; }
grep -q 'settings-overlay' assets/www/index.html && echo "settings modal html ok" || { echo "missing settings"; exit 1; }
grep -q 'celebration-overlay' assets/www/index.html && echo "celebration overlay html ok" || { echo "missing celebration"; exit 1; }
grep -q 'stepper-container' assets/www/index.html && echo "stepper html ok" || { echo "missing stepper"; exit 1; }
grep -q 'quiz-progress-dots' assets/www/index.html && echo "quiz progress dots html ok" || { echo "missing quiz dots"; exit 1; }
echo "[2c] Check CSS for enhanced UI styles..."
grep -q 'modal-overlay' assets/www/style.css && echo "modal css ok" || { echo "missing modal css"; exit 1; }
grep -q 'step-dot' assets/www/style.css && echo "stepper css ok" || { echo "missing stepper css"; exit 1; }
grep -q 'flashcard-inner' assets/www/style.css && echo "flashcard 3d css ok" || { echo "missing flashcard css"; exit 1; }
grep -q 'confetti' assets/www/style.css && echo "celebration css ok" || { echo "missing celebration css"; exit 1; }
grep -q 'progress-ring' assets/www/style.css && echo "progress ring css ok" || { echo "missing progress ring css"; exit 1; }
echo "[2d] Check JavaScript for enhanced UI functions..."
grep -q 'showOnboarding' assets/www/app.js && echo "onboarding js ok" || { echo "missing onboarding js"; exit 1; }
grep -q 'openGlossary' assets/www/app.js && echo "glossary js ok" || { echo "missing glossary js"; exit 1; }
grep -q 'openSettings' assets/www/app.js && echo "settings js ok" || { echo "missing settings js"; exit 1; }
grep -q 'showCelebration' assets/www/app.js && echo "celebration js ok" || { echo "missing celebration js"; exit 1; }
grep -q 'updateStepper' assets/www/app.js && echo "stepper js ok" || { echo "missing stepper js"; exit 1; }
grep -q 'renderReviewSummary' assets/www/app.js && echo "review summary js ok" || { echo "missing review js"; exit 1; }
grep -q 'DAY_DATA' assets/www/app.js && echo "embedded data js ok" || { echo "missing embedded data"; exit 1; }
grep -q 'GLOSSARY_DATA' assets/www/app.js && echo "glossary data js ok" || { echo "missing glossary data"; exit 1; }
echo "[3/3] Validate AndroidManifest package and SDK..."
grep -q 'package="com.meta.auctionfluency"' AndroidManifest.xml && echo "package ok" || { echo "package wrong"; exit 1; }
grep -q 'minSdkVersion.*28' AndroidManifest.xml && echo "minSdk 28 ok" || { echo "minSdk wrong"; exit 1; }
grep -q 'targetSdkVersion.*28' AndroidManifest.xml && echo "targetSdk 28 ok" || { echo "targetSdk wrong"; exit 1; }
echo ""
echo "=== ALL TESTS PASS ==="
echo "Next: ./build.sh to produce APK, then python3 -m http.server in assets/www to preview UI in browser"

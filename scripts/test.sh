#!/bin/bash
set -e
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
for f in AndroidManifest.xml build.sh src/com/meta/auctionfluency/MainActivity.java assets/www/index.html assets/www/style.css assets/www/app.js res/values/strings.xml res/drawable/ic_launcher.xml; do
  test -f "$f" || { echo "MISSING $f"; exit 1; }
  echo "found $f"
done
echo "[3/3] Validate AndroidManifest package and SDK..."
grep -q 'package="com.meta.auctionfluency"' AndroidManifest.xml && echo "package ok" || { echo "package wrong"; exit 1; }
grep -q 'minSdkVersion.*28' AndroidManifest.xml && echo "minSdk 28 ok" || { echo "minSdk wrong"; exit 1; }
grep -q 'targetSdkVersion.*28' AndroidManifest.xml && echo "targetSdk 28 ok" || { echo "targetSdk wrong"; exit 1; }
echo ""
echo "=== ALL TESTS PASS ==="
echo "Next: ./build.sh to produce APK, then python3 -m http.server in assets/www to preview UI in browser"

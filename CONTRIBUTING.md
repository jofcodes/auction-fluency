# Contributing to Auction Fluency

Thank you for contributing! This document is for new contributors who want to understand codebase conventions quickly without reading entire git history.

## Quick orientation for new contributors

This is an Android WebView wrapper around static HTML/CSS/JS educational content — not a native Android UI app, not a React app, not a server-backed web app. All learning logic lives client-side in single-page JavaScript app bundled inside APK assets folder. That design choice enables:

- Content edits without Android SDK knowledge — just edit JSON files
- Offline-first operation on Portal devices with no guaranteed Wi-Fi
- Shell-based build without Gradle overhead for rapid Portal side-loading iteration

If you're coming from bee project background: bee uses Gradle build with Python-generated dashboard HTML at build time. Auction Fluency uses shell build with static bundled HTML and embedded JSON data at runtime — simpler, no Python dependency, no Gradle wrapper needed. Keep the two projects separate in your mind and in filesystem paths.

## Development workflow in 4 commands

```bash
# 1. Validate after any edit (JSON syntax, required files, manifest)
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
./scripts/test.sh
# expect ALL TESTS PASS

# 2. Preview in desktop browser without Android build (fast iteration for content and UI tweaks)
cd assets/www
python3 -m http.server 8000
# open http://localhost:8000  → test home → day → quiz → checkpoint flow

# 3. Build APK (requires JDK 17 and Android SDK installed once per machine — see README prerequisites)
cd ..
export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
./build.sh
# expect build/AuctionFluency.apk ~33KB and aapt dump output showing correct package

# 4. Deploy to USB-connected Portal
./scripts/deploy.sh
# or manual: adb install -r build/AuctionFluency.apk && adb shell am start -n com.meta.auctionfluency/.MainActivity
```

## Code style conventions

**Java — MainActivity.java:**
- Keep single Activity pattern. Do not add multiple activities unless absolutely necessary — increases APK complexity for no benefit in single-page WebView app.
- All WebView configuration centralized in onCreate. If adding new WebSettings, comment why it's needed specifically for Portal constraints.
- Always log JavaScript console to logcat via WebChromeClient onConsoleMessage override with tag "AuctionFluency" — enables remote debugging via `adb logcat -s AuctionFluency:D`
- Keep immersive sticky fullscreen flags in onWindowFocusChanged — required for Portal to hide status/nav bars reliably across focus changes.

**JavaScript — app.js:**
- No frameworks, no bundlers, vanilla JS only to keep APK small and WebView compatible on older Portal WebView (Chromium ~90 era on API 28).
- All educational content embedded as `DAY_DATA` and `CHECKPOINT_DATA` constants at top of file to avoid fetch() CORS issues on file:// scheme in Android WebView. Source of truth for content authoring remains JSON files in assets/www/data/ for readability and git diff clarity; embedded copy in app.js must be kept in sync — ideally via future script automation, currently manual sync step documented in README.
- localStorage key is `auctionFluencyProgress` — do not rename without migration logic or users lose progress on update.
- Touch event handlers use 50px delta threshold for swipe detection — tuned for Portal 10" touch sensitivity, do not lower below 40px or accidental swipes increase.

**CSS — style.css:**
- Base font 20px minimum — do not reduce, Portal viewed from 2 feet.
- Minimum touch target 56px height AND width on all interactive elements — enforced via .btn, .quiz-option, .day-card, .order-item min-height and min-width rules. Do not override to smaller.
- Color tokens defined in :root — use CSS variables not hardcoded hex scattered through file, to enable easy theming.
- Explanation boxes use blue informational style #e7f3ff background with blue left border — deliberately not yellow to avoid looking like warning/error. Green is reserved for correct answers, orange/red for incorrect answers only.

**JSON content — day1.json through day5.json and checkpoint.json:**
- Follow exact schema validated by scripts/test.sh — title string, topic string, readingLinks array of objects with title and url, concepts array of 3-5 strings, quiz array mixing mc/flashcard/tf types with required fields per type.
- Keep reading links to internalfb.com wiki URLs and Google Docs as specified in original brief — these require corpnet Wi-Fi to open from Portal browser intent, which is expected behavior documented to user via offline indicator.
- Content is best-effort conceptual, not authoritative internal definitions — keep disclaimer in README accurate.

**Shell scripts — build.sh, deploy.sh, refresh.sh, test.sh:**
- Always start with `#!/bin/bash` and `set -e` (or `set -euo pipefail` where appropriate) to fail fast on errors.
- Use absolute paths or cd to script directory first via `cd "$(dirname "$0")/.."` pattern to ensure script works regardless of invocation working directory.
- build.sh must remain Gradle-free per artifact specification — uses aapt, javac, d8, zipalign, apksigner directly. Do not introduce Gradle wrapper unless project scope fundamentally changes and artifact spec is updated.

## Git workflow and project separation

**Critical: this repository is completely separate from bee project.**

- Auction Fluency path: `/Users/j0sephine/Documents/AI outputs/auction-fluency/` → remote `github.com/jofcodes/auction-fluency`
- Bee path: `/Users/j0sephine/Documents/AI outputs/bee/` → remote `github.com/jofcodes/bee`

Never edit bee files when working on auction-fluency. Verify separation before committing:
```bash
pwd   # should end with auction-fluency not bee
git remote -v   # should show jofcodes/auction-fluency not jofcodes/bee
```

Commit message style: concise imperative summary under 72 characters subject line, optional blank line then bullet details. Example existing commits in this repo follow that pattern — check `git log --oneline` for reference.

Do not commit build artifacts — .gitignore already excludes build/, *.apk, *.dex, *.ap_, Gradle and IDE files, Python cache, DS_Store. If you see build artifacts in `git status`, something is wrong with .gitignore.

## Testing checklist before opening pull request or asking for review

Run these three commands in order, all must pass:
```bash
./scripts/test.sh
# expect ALL TESTS PASS with JSON valid and manifest correct

export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home" && export PATH="$JAVA_HOME/bin:$PATH" && ./build.sh
# expect === SUCCESS === and APK around 33KB

# optional if Portal USB connected:
adb devices   # expect device listed
./scripts/deploy.sh
# expect Success and app launches on Portal; then manually verify on Portal screen that Day 1 loads without fetch error, quiz works, progress persists after app restart
```

If any step fails, fix before requesting review — do not push broken build to main branch.

## Architecture decision records to preserve

When making significant changes, preserve these original architectural decisions unless there's strong justification to change and you've documented rationale in commit message or docs/adr/ folder:

- WebView wrapper not native UI — enables rapid content iteration by non-Android developers
- Shell build not Gradle — per artifact spec simplicity requirement, matches My Sous Chef pattern
- Embedded JSON in app.js not fetch() at runtime — avoids file:// CORS issues on Portal WebView observed during initial testing (original fetch implementation caused "failed to fetch assets/www/data/day1" error on device)
- API 28 target — matches Meta Portal device OS version, do not raise without verifying Portal OS upgrade path
- localStorage for progress — simple key-value persistence sufficient for single-user single-device educational app scope, no server backend needed

## Questions or suggestions

Open an issue on GitHub repository or start discussion in MetaCode Feedback Workplace group. For bugs found on Portal hardware, include `adb logcat -s AuctionFluency:D` output snippet showing JavaScript console logs from WebView — MainActivity bridges console to logcat specifically for this purpose.

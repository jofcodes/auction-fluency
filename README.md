# Auction Fluency — Portal Learning App

Self-paced onboarding Android app teaching Meta's ads auction system over 5 days. Designed for Meta Portal devices (10" or 15" landscape touchscreen), deployed via ADB sideload with shell-based build — no Gradle, no Android Studio required for iteration. Same WebView wrapper pattern as My Sous Chef recipe app and Beehive Monitor Portal app, but simplified for static educational content.

**Live repository:** https://github.com/jofcodes/auction-fluency — completely separate from bee project at `github.com/jofcodes/bee`. Different folder, different git history, different purpose. See "Project Separation" section below for verification commands.

---

## For New Users — 5 Minute Start

### What you'll see after install
- Portal home screen shows app icon labeled **"Auction Fluency"** with Meta blue background and white gavel icon, next to Beehive Monitor if you have that installed.
- Tap icon → fullscreen landscape app opens, no status bar, no browser chrome.
- Home shows 5 day cards in 2-column grid with progress bar top. Tap Day 1 → Reading links section, Key Concepts section, Quiz section.
- Quiz types: multiple choice with immediate green/orange feedback + blue explanation box, tap-to-reveal flashcards, true/false with why explanation.
- Swipe left/right with finger to navigate between days, or use Prev/Next buttons.
- Progress persists across app restarts via localStorage. "Continue where you left off" button appears on home after first session.
- Day 5 ends with Final Checkpoint: ordering exercise to arrange auction pipeline stages, explain-back flashcards, 5 open discussion questions.

### Prerequisites — one-time setup on your Mac
1. **Android SDK** installed at one of these locations (checked automatically by build.sh in order):
   - `$ANDROID_HOME`
   - `~/Library/Android/sdk`  ← default macOS Android Studio location, most common
   - `~/Android/Sdk`
   - Must contain `build-tools` directory with `aapt`, `d8`, `zipalign`, `apksigner` — any recent version works, script picks latest automatically. You likely already have this from Portal hacking setup or Beehive Monitor project (which uses 34.0.0 or 37.0.0).

2. **JDK 17 or 11** — build.sh auto-detects in this order:
   - `/usr/libexec/java_home -v 17` then `-v 11` (macOS system Java)
   - `$JAVA_HOME` environment variable
   - `~/jdk/jdk-17*` or `~/jdk/jdk-11*` manual tarball fallback (recommended if Homebrew permissions are broken)

   **If JDK missing, pick one install method:**

   *Option A — Homebrew (requires sudo to fix permissions first on some machines):*
   ```bash
   sudo chown -R $(whoami) /opt/homebrew
   brew install openjdk@17
   echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
   source ~/.zshrc
   ```

   *Option B — manual tarball no sudo needed (used successfully for this project):*
   ```bash
   mkdir -p ~/jdk && cd ~/jdk
   curl -L -o openjdk17.tar.gz "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.11_9.tar.gz"
   tar -xzf openjdk17.tar.gz
   echo 'export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"' >> ~/.zshrc
   echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

   Verify: `java -version` should show openjdk 17, `javac -version` should show javac 17.

3. **ADB platform tools** for Portal deployment:
   ```bash
   brew install --cask android-platform-tools
   # or already installed at /usr/local/platform-tools/adb or ~/Library/Android/sdk/platform-tools/adb
   adb --version   # should show Android Debug Bridge version
   ```

4. **Portal device setup** (one time):
   - Connect Portal to Mac via USB-C cable
   - On Portal: Settings → Debug → enable ADB → tap Allow on authorization popup on Portal screen
   - On Mac terminal: `adb devices` should list one device ID with "device" status, not blank and not unauthorized

### Quick Start — three ways to test

**Way A — Browser preview without Portal or Android build (fastest, 30 seconds, for content review):**
```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency/assets/www"
python3 -m http.server 8000
# open http://localhost:8000 in browser
```
Click through Home → Day 1 → Quiz → Checkpoint. Reload page to confirm progress persists via localStorage. Works fully offline after initial load. Reading links open in new browser tab and need corpnet VPN for internal wiki URLs.

**Way B — Build APK without device (verifies Android toolchain, 15 seconds):**
```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
chmod +x build.sh
./build.sh
```
Expected last lines show `=== SUCCESS ===` and `APK: build/AuctionFluency.apk` around 33KB. Verify details:
```bash
~/Library/Android/sdk/build-tools/37.0.0/aapt dump badging build/AuctionFluency.apk | grep -E "package|sdkVersion|application-label|launchable"
```
Should show package `com.meta.auctionfluency`, sdkVersion 28, targetSdkVersion 28, application-label Auction Fluency, launchable activity MainActivity.

**Way C — Deploy to Portal hardware (full end-to-end test, requires USB-connected Portal):**
```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
adb devices   # confirm Portal listed
./scripts/deploy.sh
```
Or manual equivalent:
```bash
adb install -r build/AuctionFluency.apk
adb shell am start -n com.meta.auctionfluency/.MainActivity
```
Expected on Portal: app opens fullscreen landscape immediately, no status bar. Press home button → app drawer shows Auction Fluency icon next to Beehive Monitor, Contacts, Settings etc. Tap icon anytime to relaunch.

To force refresh launcher icon cache if icon doesn't appear immediately after install (rare, same issue as Beehive Monitor sometimes):
```bash
adb shell monkey -p com.meta.auctionfluency -c android.intent.category.LAUNCHER 1
# or full reboot as last resort:
adb reboot
```

To view JavaScript console logs from Portal for debugging (we enabled WebChromeClient onConsoleMessage logging in MainActivity.java):
```bash
adb logcat -s AuctionFluency:D chromium:D | grep -i -E "auction|day|fetch|error|console"
```
Should show no fetch errors because Day JSON data is now embedded directly in app.js version 2.1 to avoid file:// CORS issues on WebView. JavaScript console logs from WebView are bridged to logcat via WebChromeClient onConsoleMessage override with tag AuctionFluency for debugging.

To inspect via Chrome DevTools remote inspector (because we enabled WebView.setWebContentsDebuggingEnabled true):
- With Portal USB connected and app running, open Chrome on Mac → navigate to `chrome://inspect` → under Remote Target you should see Portal device and Auction Fluency WebView → click Inspect to see console, network, DOM live.

---

## Project Structure Explained for New Contributors

```
auction-fluency/
├── AndroidManifest.xml          # Package declaration, permissions, launcher activity config for Portal; sensorLandscape, singleTask launchMode, hardwareAccelerated true matching Beehive Monitor pattern
├── build.sh                     # Shell build pipeline: aapt package → javac compile → d8 dex → aapt add dex → zipalign → apksigner sign. No Gradle. Auto-detects SDK, build-tools, platform jar, JDK including ~/jdk fallback.
├── src/com/meta/auctionfluency/
│   └── MainActivity.java        # Android Activity hosting WebView fullscreen immersive sticky, keep screen on, JS console logging to logcat with tag AuctionFluency, WebView debugging enabled for chrome://inspect, cache disabled to prevent stale assets
├── res/
│   ├── values/strings.xml       # App display name "Auction Fluency"
│   └── drawable/ic_launcher.xml # Vector icon: Meta blue background #0064E0, white gavel icon, fluency swoosh lines — renders in Portal launcher alongside Beehive Monitor
├── assets/www/                  # Web app bundled inside APK, loaded via file:///android_asset/www/index.html, fully offline capable
│   ├── index.html               # Single-page app shell with 5 views: onboarding overlay, home, module with stepper, checkpoint with hint system, glossary modal, settings modal, celebration overlay
│   ├── style.css                # Portal-optimized styles v2.1: 20px base font with 1.6 line height for 2-foot readability, 56px min touch targets, landscape 2-column grid, Meta blue theme, card UI with Duolingo-style progress visualization, modal overlay system, stepper dots, progress rings, flashcard 3D flip animation, confidence buttons, review summary styles, celebration confetti animation, blue informational notes (changed from yellow per user feedback), accessibility focus outlines and colorblind dual encoding via icons alongside colors
│   ├── app.js                   # Single-page app logic v2.1: onboarding tour with dismiss persistence, enhanced home rendering with progress rings time estimates difficulty badges unlock visualization and streak counter, stepper navigation with IntersectionObserver auto-update based on scroll position, quiz engine with question counter progress dots review summary and retry missed placeholder, flashcard 3D flip with confidence self-assessment tracking to localStorage, glossary modal with alphabetical touch filter no keyboard required per Portal spec, settings modal with version display reset progress and learning science basis explanation, celebration overlay with confetti animation and personalized PM messaging for Jo, reading progress tracking separate from quiz with visited checkmarks persisted to separate localStorage key, checkpoint ordering exercise with hint system and partial credit feedback, embedded DAY_DATA CHECKPOINT_DATA GLOSSARY_DATA constants to avoid file:// fetch CORS issues, robust error handling with fallback to fetch for browser dev server testing
│   └── data/                    # Source JSON files for content authoring — authoritative source of truth for version control history; embedded copy inside app.js must be kept in sync manually for now (see Edit Content section)
│       ├── day1.json … day5.json    # 5 daily modules following Reading → Concepts → Quiz structure per brief
│       └── checkpoint.json          # Final checkpoint ordering exercise, explain-back flashcards, open questions
├── scripts/
│   ├── test.sh                  # Validates JSON syntax, required project files exist including new CONTRIBUTING.md and LICENSE, AndroidManifest package and SDK versions correct, no Android SDK required runs under 2 seconds
│   ├── deploy.sh                # adb install -r + am start with launcher cache refresh via monkey command and force-stop launcher variants, verification commands printed after deploy to confirm package installed and activity registered
│   └── refresh.sh               # rebuild + redeploy shortcut with JAVA_HOME auto-detection fallback matching build.sh, clears app data tip included for cache invalidation after content updates
├── docs/
│   └── brief.md                 # Distilled original brief artifact with reference links preserved
├── .gitignore                   # excludes build/, *.apk, *.dex, *.ap_, Gradle/IDE files, Python cache, DS_Store, jdk/
├── LICENSE                      # MIT License Copyright Jo Foucher 2026
├── CONTRIBUTING.md              # Contributor guide with development workflow, code style conventions per language tied to Portal constraints and learning science principles, git workflow emphasizing project separation from bee, testing checklist, architecture decision records
└── README.md                    # this file
```

**Key architectural decisions documented for new contributors:**
- **Why WebView not native Android UI?** Rapid content iteration without recompiling Java — educational content lives in JSON and HTML, designers/PMs can edit text without Android SDK knowledge. Same pattern as My Sous Chef and Beehive Monitor Portal apps already deployed successfully.
- **Why shell build not Gradle?** Artifact spec explicitly requires shell-based build matching My Sous Chef pattern for simplicity and speed on Portal side-loading workflow. Gradle adds significant overhead and complexity for single-activity WebView wrapper. Tradeoff: no dependency management, no resource merging beyond aapt basic — acceptable for this scope.
- **Why embedded JSON in app.js instead of fetch()?** Android WebView blocks fetch() from file:// scheme even with setAllowFileAccessFromFileURLs true on some WebView versions due to CORS opaque origin handling. Embedding data as JavaScript constants guarantees offline functionality on Portal without network and avoids "failed to fetch" errors reported during initial testing. Fetch fallback remains in code for browser dev server testing via python http.server where fetch works normally.
- **Why API 28 target not higher?** Meta Portal devices run Android API 28 (Android 9 Pie). Targeting higher would risk incompatibility; targeting 28 ensures maximum compatibility while compiling against newer platform jar (34 or 36) available locally is safe due to backward compatibility.

---

## Editing Content — No Code Changes Needed for Content Updates

All learning content lives as structured JSON in `assets/www/data/`. Edit these files directly in any text editor, then rebuild APK and redeploy — no Java or Android SDK knowledge required beyond running build script.

**File to content mapping:**
- `day1.json` — Auction Fundamentals: second-price auction, VCG mechanism, bid = value × probability, reserve prices, auction density, welfare maximization. Reading links to Ads Ranking Auction wiki and Bidding wiki.
- `day2.json` — Bidding & Pacing: wage and rate model, budget pacing, bid shading vs throttling, bid landscape, delivery guarantees. Reading link to Pacing wiki.
- `day3.json` — Full Funnel: impression → click → conversion funnel, oCPM, value optimization, attribution windows, conversion modeling.
- `day4.json` — Gradient Auction & OVAR: gradient auction pilot, generative auction vision, organic value aligned ranking, GR2 reward model, meta-optimization. Reading link to WS1 Canonical Google Doc.
- `day5.json` — Simulation & GR2: pacing simulator, experiment design, counterfactual measurement, scaling pilot to production, DPA test surfaces.
- `checkpoint.json` — Final checkpoint separate from day5: ordering exercise correct order array, explain-back flashcards with prompts and model answers, open questions list for team discussion.

**JSON schema per day file — follow this exactly or test.sh will fail:**
```json
{
  "title": "Day X: Topic Name",
  "topic": "Topic Name",
  "readingLinks": [
    {"title": "Human readable link title", "url": "https://..."}
  ],
  "concepts": [
    "3 to 5 bullet point strings explaining key concepts concisely"
  ],
  "quiz": [
    {
      "type": "mc",
      "question": "Question text?",
      "options": ["A","B","C","D"],
      "correctIndex": 1,
      "explanation": "Why correct answer is right and others wrong"
    },
    {
      "type": "flashcard",
      "front": "Question or prompt shown initially",
      "back": "Detailed answer revealed on tap"
    },
    {
      "type": "tf",
      "statement": "True or false statement here",
      "answer": true,
      "why": "Explanation of why true or false"
    }
  ]
}
```

**After editing content, validate and rebuild:**
```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
./scripts/test.sh
# expect ALL TESTS PASS
export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
./build.sh
adb install -r build/AuctionFluency.apk
adb shell am start -n com.meta.auctionfluency/.MainActivity
```
Or use shortcut: `./scripts/refresh.sh` does rebuild + redeploy in one command (still requires JAVA_HOME set).

**Important:** After editing JSON source files in `assets/www/data/`, you must also update the embedded copy inside `assets/www/app.js` OR run the embed update helper (we should add a script for this — currently manual process is to edit both JSON source and app.js DAY_DATA constant to keep in sync, or re-run python embed generator). For now the source JSON files are authoritative for content authoring and version control history, and app.js contains embedded copy for runtime. When you edit JSON, tell me and I'll sync embedded copy into app.js autonomously and rebuild — that's part of my autonomous workflow per your "assume go for it" rule.

---

## Customizing Styles

All visual design tokens live at top of `assets/www/style.css` in `:root` CSS variables:
```css
:root {
  --blue: #0064E0;       /* Meta blue primary accent */
  --bg: #f0f2f5;         /* light gray page background */
  --card: #ffffff;       /* white card background */
  --text: #1c1e21;       /* near-black text */
  --green: #00a400;      /* correct answer feedback */
  --orange: #e87400;     /* incorrect answer feedback */
  --border: #dadde1;
}
```
Change these hex values to retheme entire app. Base font size 20px defined on body for Portal 2-foot readability. Minimum touch target 56px defined on .btn, .quiz-option, .day-card, .order-item per Portal accessibility spec — do not reduce below 56px or Portal touch targets become hard to hit.

Explanation boxes use light blue background `#e7f3ff` with blue left border to read as informational note, distinct from green success and orange error states. Previously used yellow which looked like warning mistake — changed based on user feedback in commit history.

---

## Troubleshooting Common Issues

**App icon not showing in Portal launcher after adb install:**
- App is actually installed — verify via `adb shell pm list packages | grep auction` should return `package:com.meta.auctionfluency`
- Force launcher refresh: `adb shell monkey -p com.meta.auctionfluency -c android.intent.category.LAUNCHER 1`
- If still not visible, reboot Portal: `adb reboot` then wait 60 seconds for boot, then check app drawer again. Same behavior occasionally seen with Beehive Monitor after fresh install.

**Day content shows error instead of quiz:**
- Likely JSON syntax error in edited day JSON file. Run `./scripts/test.sh` locally — it validates JSON syntax and required keys and will pinpoint which file and what's missing.
- If error persists on Portal but not in browser preview, likely WebView cache serving old app.js from previous APK version. Uninstall fully then reinstall fresh: `adb uninstall com.meta.auctionfluency && adb install build/AuctionFluency.apk`

**Build fails with "JDK not found":**
- Run `export JAVA_HOME="$HOME/jdk/jdk-17.0.11+9/Contents/Home"` then `export PATH="$JAVA_HOME/bin:$PATH"` then retry `./build.sh`. If ~/jdk directory missing, follow manual tarball install steps in Prerequisites section above — works without Homebrew sudo permissions.

**Build fails with "aapt: command not found" or similar Android SDK tools missing:**
- Ensure Android SDK installed at `~/Library/Android/sdk` — typical path after installing Android Studio or command line tools. Run `ls ~/Library/Android/sdk/build-tools/` to confirm at least one version directory exists containing aapt, d8, zipalign, apksigner. If empty, install via Android Studio SDK Manager or via sdkmanager command line: `sdkmanager "build-tools;34.0.0" "platforms;android-34"`

**Reading links don't open on Portal:**
- Expected behavior when Portal is not on corpnet Wi-Fi — reading links point to internalfb.com wiki URLs requiring Meta corporate network. Quiz functionality works fully offline by design. Offline pill indicator at top right should show blue informational message when offline.

**App shows old content after content edit and redeploy:**
- WebView cache issue — MainActivity.java sets `LOAD_NO_CACHE` mode to mitigate, but Android WebView sometimes persists DOM storage separately from HTTP cache. Run `adb shell pm clear com.meta.auctionfluency` to wipe app data including localStorage progress and WebView cache, then relaunch. Note this resets progress tracking — user starts fresh at 0% complete, which is expected after content update.

---

## Project Separation from Bee — Important Context for New Contributors

**This repository is NOT the bee project.** They live side by side under same parent AI outputs folder but are completely independent:

| Aspect | Bee Project | Auction Fluency Project |
|--------|-------------|------------------------|
| Path | `/Users/j0sephine/Documents/AI outputs/bee/` | `/Users/j0sephine/Documents/AI outputs/auction-fluency/` |
| GitHub remote | `github.com/jofcodes/bee` | `github.com/jofcodes/auction-fluency` |
| Purpose | Beehive camera anomaly detection with Python ML and Android Portal dashboard showing video clips | Self-paced learning app for Meta ads auction system with 5-day curriculum and quizzes |
| Android build system | Gradle with gradlew wrapper, complex multi-module | Shell script with aapt javac d8 apksigner, no Gradle per artifact spec |
| Android package | `com.josephine.beehive` | `com.meta.auctionfluency` |
| MainActivity purpose | WebView showing generated dashboard HTML from Python analysis results | WebView showing static educational HTML with embedded JSON quiz content |
| Language primary | Python + Java/Gradle + HTML | Java shell-build + HTML/CSS/JS only, no Python runtime needed |

**Verification commands to confirm separation anytime:**
```bash
ls -ld "/Users/j0sephine/Documents/AI outputs/bee" "/Users/j0sephine/Documents/AI outputs/auction-fluency"
cd "/Users/j0sephine/Documents/AI outputs/bee" && git remote -v
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency" && git remote -v
# first shows bee origin, second shows auction-fluency origin — never same
```

Do not edit bee files when working on auction-fluency and vice versa. You may read bee portal_app as reference pattern for Portal deployment best practices, but keep codebases separate.

---

## References

- Original brief artifact: Metamate cd49da6b-3bc6-4d59-a2a3-94a74b58e6c2 Auction Fluency Portal App Brief
- Portal Hacking Setup Guide: https://docs.google.com/document/d/1_ECxsB_qlhhxY4gGT8nAsUyqCF-Cs9sq1FeQJBnTc6o/edit
- Workplace: Portal Possible Again https://fb.workplace.com/groups/rlfyi/posts/4480505675608296/
- Saba Voice Assistant for Portal https://fb.workplace.com/groups/claude.code.community/permalink/919684220573699/
- My Sous Chef build pattern reference https://fb.workplace.com/permalink.php?story_fbid=pfbid032hiMPo1dn5JhqCVc6Zf2B9V4ADfYyAxgMDEMpZS8Vq7xr7ToeEaYwxAwoENhrhfCl&id=100034965797817
- Jo 30-60-90 Plan https://docs.google.com/documented/19zBkDTfJUfubH9TXIg0Z6Tu7nueaFA0EimIrlCv8gVc
- Internal wiki links embedded in day JSON content per brief specification

---

## License

MIT License — see LICENSE file. Copyright (c) 2026 Jo Foucher

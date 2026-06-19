# Auction Fluency — Portal Learning App

Self-paced onboarding app for Meta's ads auction system in 5 days. Built for Jo Foucher, PM on Generative Auction & OVAR. Runs on Meta Portal device (Android API 28) via ADB sideload, shell build no Gradle – same pattern as My Sous Chef recipe app.

## What this is

5 daily modules teaching auction fundamentals through to Gradient Auction, OVAR, and GR2 simulation. Each day has reading links, key concepts, interactive quiz (multiple choice, tap-to-reveal flashcards, true/false), progress tracking in localStorage, and swipe navigation. Day 5 ends with ordering exercise, explain-back flashcards, and open questions for team discussion.

**Content note:** Day JSON files contain best-effort conceptual summaries based on public auction knowledge and internal wiki links from the brief. They are marked for review/edit by Jo – not authoritative internal definitions. Edit `assets/www/data/day*.json` directly to refine.

## Portal constraints recap

- 10.1" or 15.6" landscape only
- Touch-only, no keyboard – flashcards not free text
- All tap targets >=56px height
- Base font 20px readable from 2 feet
- Full-screen immersive, keep screen awake
- Swipe left/right between days
- Works offline for quizzes; reading links need corpnet
- Card UI like Duolingo, Meta blue #0064E0 accent

## Project structure

```
auction-fluency/
├── build.sh                         # shell build aapt javac d8 zipalign apksigner
├── AndroidManifest.xml
├── src/com/meta/auctionfluency/MainActivity.java
├── res/values/strings.xml
├── res/drawable/ic_launcher.xml
├── assets/www/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── data/day1.json … day5.json checkpoint.json
├── scripts/deploy.sh
├── scripts/refresh.sh
└── docs/brief.md
```

## Build

Prerequisites checked by build.sh:
- Android SDK at `$ANDROID_HOME` or `~/Library/Android/sdk` or `~/Android/Sdk`
- Build-tools with aapt d8 zipalign apksigner (you have 34.0.0)
- Platform android.jar – picks highest installed (34 or 36) since 28 not installed locally; manifest still declares min/target 28 for Portal compatibility
- JDK 17 or 11 – **not installed yet on this machine**. Install first:

```bash
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Then build:

```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
chmod +x build.sh
./build.sh
```

Expect `build/AuctionFluency.apk`. If JDK missing, script exits with clear install hint.

## Test in browser without Portal

```bash
cd assets/www
python3 -m http.server 8000
# open http://localhost:8000
# click through home → module → quiz → checkpoint, reload to confirm progress persists
```

## Deploy to Portal

Portal connected via USB-C, ADB enabled in Settings → Debug, tap Allow.

```bash
adb devices   # should list Portal
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
./scripts/deploy.sh
```

Or manually:

```bash
adb install -r build/AuctionFluency.apk
adb shell am start -n com.meta.auctionfluency/.MainActivity
```

Confirm landscape fullscreen, 5 day cards, quizzes work offline, swipe nav, progress bar, continue where left off on relaunch.

Optional keep awake while USB powered (commented in deploy.sh):
```bash
adb shell settings put global stay_on_while_plugged_in 3
```

## Edit content

All learning content lives in `assets/www/data/` as JSON. Edit day1.json … day5.json and checkpoint.json, then rebuild `./build.sh` and redeploy. No code changes needed for content updates.

Reading links embedded per brief:
- Day1: Ads_Ranking/Auction wiki, Ads_Ranking/Bidding wiki
- Day2: Ads_Ranking/Pacing wiki
- Day4: WS1 Canonical Doc Google Doc
Others open in external browser when corpnet available; offline indicator shows when no network.

## References

- Original brief artifact: Metamate cd49da6b-3bc6-4d59-a2a3-94a74b58e6c2 Auction Fluency Portal App Brief
- Portal Hacking Setup Guide: https://docs.google.com/document/d/1_ECxsB_qlhhxY4gGT8nAsUyqCF-Cs9sq1FeQJBnTc6o/edit
- Workplace: Portal Possible Again https://fb.workplace.com/groups/rlfyi/posts/4480505675608296/
- Saba Voice Assistant for Portal https://fb.workplace.com/groups/claude.code.community/permalink/919684220573699/
- My Sous Chef build pattern reference https://fb.workplace.com/permalink.php?story_fbid=pfbid032hiMPo1dn5JhqCVc6Zf2B9V4ADfYyAxgMDEMpZS8Vq7xr7ToeEaYwxAwoENhrhfCl&id=100034965797817
- Jo 30-60-90 Plan https://docs.google.com/document/d/19zBkDTfJUfubH9TXIg0Z6Tu7nueaFA0EimIrlCv8gVc

## Git – completely separate from bee project

**This is NOT the bee repo.** Bee lives at `/Users/j0sephine/Documents/AI outputs/bee/` with remote `github.com/jofcodes/bee`. Auction Fluency lives at `/Users/j0sephine/Documents/AI outputs/auction-fluency/` with its own git history and proposed separate remote `github.com/jofcodes/auction-fluency`.

Local git already initialized on main branch with initial commit. No remote configured yet to avoid accidental push to bee.

To create separate GitHub repo and push:

```bash
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency"
# verify you're in auction-fluency not bee:
pwd
git remote -v   # should show nothing yet, NOT bee origin
# create empty repo on GitHub named auction-fluency, then:
git remote add origin git@github.com:jofcodes/auction-fluency.git
git push -u origin main
```

To double-check separation anytime:
```bash
ls -ld "/Users/j0sephine/Documents/AI outputs/bee" "/Users/j0sephine/Documents/AI outputs/auction-fluency"
cd "/Users/j0sephine/Documents/AI outputs/bee" && git remote -v
cd "/Users/j0sephine/Documents/AI outputs/auction-fluency" && git remote -v
```
First should show bee origin, second should show auction-fluency origin (or nothing until you add it). Never the same remote.

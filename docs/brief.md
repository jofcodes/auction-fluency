# Auction Fluency — Portal App Brief (distilled)

Source artifact: Metamate cd49da6b-3bc6-4d59-a2a3-94a74b58e6c2 – Auction Fluency Portal App Brief for Claude Code.

## Context

- **What:** Self-paced onboarding app – Meta's ads auction system in 5 days
- **Where:** Meta Portal device (Android API 28), deployed via ADB USB-C
- **Who:** Jo Foucher, PM on Generative Auction & OVAR
- **Setup:** Portal connected via USB-C, ADB enabled, previous apps deployed (My Sous Chef pattern)
- **Build pattern:** Shell-based no Gradle – same as My Sous Chef recipe app

## App Requirements Summary

5 daily modules table from brief:

| Day | Topic | Key Concepts |
|-----|-------|--------------|
|1|Auction Fundamentals|Second-price, VCG, bid=value×probability, reserves|
|2|Bidding & Pacing|Wage & rate, budget pacing, bid shading, throttling|
|3|Full Funnel|Impression→click→conversion, oCPM, value opt, attribution|
|4|Gradient Auction & OVAR|Gradient pilot, generative auction, OVAR, GR2|
|5|Simulation & GR2|Pacing simulator, experiment design, counterfactual, scaling|

Each module: reading links tappable cards → key concepts 3-5 bullets → interactive quiz (MC with feedback, tap-to-reveal flashcards, TF with explanation).

Final checkpoint Day5 bonus: ordering exercise tap to arrange pipeline stages, explain-back flashcards, open questions list for team discussion.

Progress tracking via localStorage persists across sessions, tracks modules completed, quiz scores, overall %, continue where left off.

## Portal Constraints

- Screen 10.1" or 15.6" landscape orientation
- Touch-only no physical keyboard → flashcards not free text
- All tap targets >=56px
- Base font 20px readable from 2 feet
- Full-screen immersive mode keep screen awake
- Swipe left/right between days
- Works fully offline for quizzes; reading links need corpnet

## Project Structure (from brief)

```
AuctionFluency/
├── build.sh
├── AndroidManifest.xml
├── src/com/meta/auctionfluency/MainActivity.java
├── res/drawable/ic_launcher.xml
└── assets/www/
    ├── index.html
    ├── style.css
    ├── app.js
    └── data/day1.json … day5.json
```

## Design Direction

Card-based UI like Duolingo / Brilliant. Meta blue #0064E0 accent, white cards, light gray #f0f2f5 background. Green correct, orange incorrect + explanation. Progress bar home. Smooth CSS transitions.

## References from brief

- Portal Hacking Setup Guide: https://docs.google.com/document/d/1_ECxsB_qlhhxY4gGT8nAsUyqCF-Cs9sq1FeQJBnTc6o/edit
- Workplace Portal Possible Again: https://fb.workplace.com/groups/rlfyi/posts/4480505675608296/
- Saba Voice Assistant for Portal: https://fb.workplace.com/groups/claude.code.community/permalink/919684220573699/
- My Sous Chef build pattern reference: https://fb.workplace.com/permalink.php?story_fbid=pfbid032hiMPo1dn5JhqCVc6Zf2B9V4ADfYyAxgMDEMpZS8Vq7xr7ToeEaYwxAwoENhrhfCl&id=100034965797817
- Jo 30-60-90 Plan: https://docs.google.com/document/d/19zBkDTfJUfubH9TXIg0Z6Tu7nueaFA0EimIrlCv8gVc
- WS1 Canonical Doc (Day4 reading): https://docs.google.com/document/d/1ZE-KcKbSMiJdV3QymbiG_VQJkUi8gFi79XMP-Oi58i8/edit
- Internal wikis Day1-2: Ads_Ranking/Auction , Ads_Ranking/Bidding , Ads_Ranking/Pacing

## Prompt from brief (for reference)

Original Metamate artifact contains full prompt to paste into Claude Code on VS Code – already implemented in this scaffold. See README for build commands matching artifact:

```
chmod +x build.sh && ./build.sh
adb install -r build/AuctionFluency.apk
adb shell am start -n com.meta.auctionfluency/.MainActivity
```

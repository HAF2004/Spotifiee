# Spotifiee 🎵🛡️

<div align="center">
  <img src="icons/icon128.png" alt="Spotifiee Logo" width="100" height="100">
  <h3>Ultra-Fast Ad Muter, Skipper & Banner Blocker for Spotify Web Player</h3>
  <p>Manifest V3 • Dual-World Memory Engine • Zero-Latency Ad Skipping</p>

  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-1DB954?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Version](https://img.shields.io/badge/Version-1.7.0-1DB954?style=for-the-badge)](https://github.com/HAF2004/Spotifiee)
  [![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-black?style=for-the-badge&logo=googlechrome)](https://open.spotify.com/)
  [![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)
</div>

---

## 🌟 Overview

**Spotifiee** is a specialized, lightweight browser extension built with **Manifest V3** for Chromium browsers (Google Chrome, Brave, Microsoft Edge, Opera). It provides a seamless, distraction-free listening experience on the **Spotify Web Player** (`open.spotify.com`) by intercepting and fast-skipping audio advertisements at **0ms latency**, silencing ad sound instantly, and stripping out visual banner promotions without causing player crashes or page reloads.

---

## ✨ Features

- **⚡ Zero-Latency In-Player Skip**: Captures in-memory `HTMLMediaElement` instances directly in the page execution context and advances playback instantly to the next track.
- **🔇 Instant Auto-Mute**: Silences ad audio the exact millisecond an ad begins, preserving your original volume slider and restoring it smoothly when your music resumes.
- **🛡️ Network-Level Ad Shield**: Leverages Chrome's `declarativeNetRequest` API to block external tracking beacons, Google DoubleClick networks, and crashdump telemetry before requests reach your browser.
- **🚫 Visual Banner & Promo Cleaner**: Injects CSS to hide billboard ads, sponsor overlays, and persistent upgrade nag modals without breaking player layout.
- **🎯 Precision Detection (Zero False Positives)**: Multilingual ad detection algorithm that verifies track metadata against real artist links to ensure normal songs are **never** skipped or muted.
- **📊 Glassmorphic Control Dashboard**: Sleek Spotify-themed popup UI featuring live status indicators, customizable toggles, total ads blocked counter, and estimated listening time saved.

---

## 🏗️ Architecture & How It Works Under the Hood

Unlike traditional ad blockers that try to block Spotify streams at the DNS level (which breaks playback and triggers *"Playback Paused"* freeze loops), Spotifiee uses a **Dual-Layer In-Memory & DOM Automation Engine**:

```
                       Spotify Web Player (open.spotify.com)
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
 ┌──────────────────────────────────────────────┐        ┌───────────────────────────────────┐
 │       MAIN Execution World (page_script.js)   │        │     Network Layer (rules.json)    │
 ├──────────────────────────────────────────────┤        ├───────────────────────────────────┤
 │ • Hooks HTMLMediaElement.prototype.play      │        │ • Blocks doubleclick.net          │
 │ • Captures window.Audio instances in memory  │        │ • Blocks googleads & syndication  │
 │ • Listens to loadedmetadata & play (0ms)     │        │ • Blocks adeventtracker & logs    │
 │ • Sets currentTime = duration & 16x speed    │        └───────────────────────────────────┘
 │ • Dispatches native 'ended' event            │                          │
 │ • Hooks React Fiber tree (onSkipToNext)      │                          ▼
 └──────────────────────┬───────────────────────┘        ┌───────────────────────────────────┐
                        │ (window.postMessage)           │  Visual Cleaner Layer (styles.css)│
                        ▼                                ├───────────────────────────────────┤
 ┌──────────────────────────────────────────────┐        │ • Hides billboard banners         │
 │     ISOLATED Execution World (content.js)    │        │ • Strips upgrade promo modals     │
 ├──────────────────────────────────────────────┤        │ • Hides sidebar ad break text     │
 │ • Injects in-player floating status badge    │        └───────────────────────────────────┘
 │ • Synchronizes user toggle settings          │
 │ • Reports stats to background service worker │
 └──────────────────────┬───────────────────────┘
                        │ (chrome.runtime.sendMessage)
                        ▼
 ┌──────────────────────────────────────────────┐
 │     Background Service Worker (background.js)│
 ├──────────────────────────────────────────────┤
 │ • Persists metrics to chrome.storage.local   │
 │ • Tab-level muting fallback                  │
 └──────────────────────────────────────────────┘
```

### Key Technical Mechanisms

1. **Memory Audio Interception (`world: "MAIN"`)**:
   Spotify instantiates audio elements in JavaScript memory (`new Audio()`). In Manifest V3, standard content scripts run in an isolated sandbox and cannot access these memory instances. Spotifiee runs `page_script.js` directly in the page's `MAIN` execution world, allowing direct manipulation of the live media stream.
2. **0ms Event-Driven Skipping**:
   Instead of relying solely on periodic timers, Spotifiee hooks `loadedmetadata`, `play`, and `canplay` events on `HTMLMediaElement.prototype`. When an ad begins loading, Spotifiee sets `currentTime = duration` and `playbackRate = 16.0` before the first frame even renders.
3. **React Fiber Player Hook**:
   When Spotify hides or disables the forward button `[data-testid="control-button-skip-forward"]` during ad breaks, Spotifiee traverses Spotify's internal React Fiber tree (`__reactFiber$`) to trigger the component's internal `skipToNext()` dispatcher.
4. **Precision Ad Verification**:
   Spotify tracks that have valid artist links (`a[href*="/artist/"]`) and do not match explicit ad titles (`Advertisement`, `Iklan`, `Publicité`, `Werbung`, `Anuncio`) are guaranteed to be **real music** and are protected from accidental muting or skipping.

---

## 🚀 Installation Guide

### Prerequisites
- Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser.

### Steps to Install:

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/HAF2004/Spotifiee.git
   ```
   *(Or download and extract the ZIP file).*

2. **Open Extensions Page**:
   - In Chrome / Brave: `chrome://extensions`
   - In Microsoft Edge: `edge://extensions`

3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top-right corner to **ON**.

4. **Load Unpacked Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the cloned **Spotifiee** folder.

5. **Start Listening**:
   - Open [https://open.spotify.com/](https://open.spotify.com/).
   - Play any playlist, artist, or daily mix and enjoy uninterrupted music!

---

## 📂 Project Structure

```
Spotifiee/
├── manifest.json        # Extension Manifest V3 configuration (v1.7.0)
├── page_script.js       # MAIN world engine: hooks memory audio elements & React Fiber
├── content.js           # ISOLATED world script: UI badge & storage coordinator
├── background.js        # Service worker for stats persistence & tab controls
├── rules.json           # declarativeNetRequest network blocking rules
├── styles.css           # Injected stylesheet for banner suppression & status toast
├── popup.html           # Modern Spotify-themed dashboard interface
├── popup.css            # Popup dark glassmorphism styling
├── popup.js             # Dashboard toggles, stats counter & tab synchronization
├── icons/               # High-resolution extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore           # Git ignore rules
└── README.md            # Comprehensive project documentation
```

---

## 🎛️ Popup Dashboard & Controls

Click the **Spotifiee** icon in your browser toolbar to open the control panel:

- **⚡ Auto-Skip Ads**: Automatically advances playback to the next song when an ad is detected.
- **🔇 Auto-Mute Ads**: Instantly zeroes audio volume during ad transitions.
- **🚫 Block Banners**: Removes billboard sponsor boxes and upgrade recommendation popups.
- **🔔 In-Player Toast**: Displays a non-intrusive floating pill on Spotify's player bar (*"⚡ Spotifiee Active"*).
- **📊 Real-Time Analytics**: Tracks your total ads blocked count and estimated time saved.

---

## 🔒 Privacy & Permissions

Spotifiee is designed with strict privacy principles:
- **Zero Data Collection**: No telemetry, tracking, or personal data is collected or transmitted to third parties.
- **Local Storage Only**: All settings and statistics are saved locally in your browser via `chrome.storage.local`.
- **Targeted Permissions**: Scoped strictly to `https://open.spotify.com/*`.

---

## ⚖️ Disclaimer

*Spotifiee is an open-source educational project developed to research browser extension audio manipulation and DOM automation. Spotify is a registered trademark of Spotify AB. This project is not affiliated with, endorsed by, or sponsored by Spotify.*

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.

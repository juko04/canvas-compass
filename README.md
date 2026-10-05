# 🧭 Canvas Compass (CU Boulder Edition)

**Canvas Compass** is a Manifest V3 Chrome Extension built specifically for University of Colorado Boulder students. It connects to your Canvas session, scans favorited courses, and merges every graded deadline, reading, studio demo, and exam into one unified, ranked, and editable list.

---

## ✨ Features

- **Draggable Liquid Glass Button**: 40px circular glass button with a **5-color urgency gradient** (💙 Calm Blue → 🩵 Teal → 💛 Yellow → 🧡 Orange → ❤️ Red) based on upcoming deadlines in the next 7 days. Drag it to any corner of your screen!
- **Apple iOS 26 Liquid Glass UI**: 420px slide-in panel with translucent layered tints, specular highlights, luminous borders, and soft layered shadows — without heavy backdrop blurs.
- **Three-Tier Ranking System**:
  - **🔥 This Week**: 7-day rolling window with collapsing empty days. Small recurring homeworks grouped cleanly.
  - **🔭 On the Horizon**: Pinned major milestones (Exams, Final Capstones, Showcase Demos, or anything >15% of your grade).
  - **🗓️ Later**: Future deadlines organized cleanly.
  - **✅ Completed**: Collapsible completed section with strikethrough.
- **Multi-Source Merge Engine**:
  1. **Canvas Live Data**: Authoritative for dates, points, and submission statuses.
  2. **Syllabus & Schedule Docs**: Positional PDF table parser + HTML/Canvas text parser to fill gaps (notes, materials, locations, grade weights).
  3. **Custom Tasks**: Add your own tasks (never overwritten by scans).
- **Two Parsing Tiers**:
  - **Tier 1 (Offline, Rule-Based)**: Coordinate-based PDF table reconstruction using positional items via `pdf.js`. Anchors all dates to the official Canvas term start/end, ignoring stale years (e.g. "Fall 2023" in a 2026 syllabus). Automatically expands recurring schedules (e.g. weekly Sunday 11:59 PM submissions) while skipping CU Boulder breaks (Labor Day, Fall Break).
  - **Tier 2 (AI-Assisted, Opt-In)**: BYO Gemini API key in settings for Flash-tier JSON schema extraction and conflict assistance.
- **Calendar & Data Export**:
  - RFC 5545 compliant `.ics` calendar with `America/Denver` (Mountain Time) `VTIMEZONE` and 1-hour event windows for import into Apple Calendar or Google Calendar.
  - Full JSON backup export.
- **Diagnostic Debug Drawer**: Inline push drawer with timestamped logs of Canvas API requests, PDF parser runs, and merge matches.

---

## 🚀 Quick Install for Friends (Takes 60 Seconds — No Coding Required)

### Step 1: Download the Extension
1. Download **`canvas-compass.zip`** from this repository (or from the Releases page).
2. Double-click to **unzip** `canvas-compass.zip` on your computer so you have a regular folder.

### Step 2: Install into Google Chrome
1. In Google Chrome, go to: `chrome://extensions/`
2. In the top right corner, toggle **Developer mode** to **ON**.
3. In the top left corner, click **Load unpacked**.
4. Select the unzipped folder (containing `manifest.json`, `content.js`, etc.).

### Step 3: Open Canvas
1. Navigate to **[canvas.colorado.edu](https://canvas.colorado.edu)** and log in.
2. The **floating Compass orb** will appear on your page!
3. Click the orb (or press `Cmd + Shift + C` / `Ctrl + Shift + C`) to open Canvas Compass.
4. Drag the orb to any position or dock it — it automatically remembers your preference.

---

## 💻 Building from Source (For Developers)

If you'd like to modify or contribute to Canvas Compass:

```bash
# 1. Clone the repository
git clone https://github.com/juko04/canvas-compass.git
cd canvas-compass

# 2. Install dependencies
npm install

# 3. Build the production extension
npm run build

# 4. (Optional) Run tests
npm test
```
The compiled extension will be in the `dist/` directory. Load `dist/` via **Load unpacked** in `chrome://extensions/`.

### Step 4 (Optional): Add Gemini API Key for Tier 2 AI
1. Click the gear icon (**⚙️**) in the top right of the Compass panel.
2. Check **Enable Gemini Flash AI Parser**.
3. Paste your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
4. Data leaves the browser only to Gemini when enabled.

---

## 🛠️ Development & Testing

```bash
# Run unit tests and golden fixture tests
npm test

# Run build watcher for local dev
npm run dev

# Production build
npm run build

# Create distributable zip for friends
npm run zip
```

### Golden Test Fixtures
Golden tests in `tests/tier1-golden.test.ts` verify parser accuracy against real CU Boulder syllabi:
1. `F2026_ENVD 4365 Syllabus.pdf` — Combined syllabus + schedule PDF (verifies project weights and extra credit extraction).
2. `THTR 3055 Weekly Sched 08_20_2026.pdf` — Separate schedule table PDF (verifies coordinate-based multi-column parsing, Remote Quizzes, and lab deadlines).
3. `learnvibebuild Syllabus.rtf` — Canvas page text syllabus (verifies 14-week recurring rhythm expansion, Fall Break skipping, showcase dates, and TBD final reflection).

---

## 📄 License & Distribution
Built for University of Colorado Boulder students. Free non-commercial distribution.

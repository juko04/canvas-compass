# 🧭 Canvas Compass (CU Boulder Edition)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%2014%2F14%20Passing-success.svg)](tests/)
[![License](https://img.shields.io/badge/License-CU%20Boulder%20Student-gold.svg)](LICENSE)

> 🚀 **Want to install Canvas Compass on Chrome?**  
> Check out the **[Student Installation & User Guide (INSTRUCTIONS.md)](INSTRUCTIONS.md)** for a 60-second setup guide (no coding or terminal needed!).

---

## 📖 Overview

**Canvas Compass** is a Manifest V3 Chrome extension designed specifically for **University of Colorado Boulder** students. 

College students routinely juggle 4–6 Canvas courses, each configured inconsistently: some professors publish Canvas assignments with due dates, others bury PDF schedules in Canvas Files, while others list readings and studio critiques inside module pages. 

Canvas Compass connects to your active Canvas session, automatically scans your favorited courses and syllabi, and reconciles every homework, quiz, exam, studio milestone, and office hours session into **one ranked, editable, and interactive dashboard**.

---

## ✨ Key Features

### 1. Draggable Liquid Glass UI & Urgency Orb
- **Dynamic 5-Color Urgency Indicator**: A 48px draggable circular floating orb with real-time gradient glow reflecting your next 7 days of deadlines:
  - 🔵 **Calm Blue** (`0.0 - 0.25`): Relaxed workload, no immediate deadlines.
  - 🟢 **Cyan / Teal** (`0.25 - 0.50`): Moderate upcoming tasks.
  - 🟡 **Warm Amber** (`0.50 - 0.70`): Elevated due dates across courses.
  - 🟠 **Energetic Orange** (`0.70 - 0.85`): High volume due in 48–72 hours.
  - 🔴 **Crimson Red** (`0.85 - 1.00`): Urgent deadlines due within 24 hours.
- **Flight Transition & Docking**: The orb smoothly animates and centers into the top header dock when the main panel is opened, and remembers your custom placement on the screen.
- **Apple Liquid Glass Aesthetic**: Semi-translucent 50% opacity backdrop with physical specular highlights, double-beveled borders, and WCAG AAA/AA high-contrast color tokens for both dark and light modes.

### 2. Three-Tier Rolling Horizon Ranking
- **🔥 This Week**: 7-day rolling window with empty day compression and urgency-scored priority badges.
- **🔭 On the Horizon**: Pinned high-stakes milestones (midterms, final capstones, project exhibitions, or any item worth >15% of your grade).
- **🗓️ Later**: Future milestones cleanly organized without visual clutter.
- **✅ Completed**: Strikethrough section with instant unchecking restoration if an assignment was toggled by mistake.

### 3. Multi-Source Reconciliation Engine
Reconciles coursework across three independent data sources without data loss:
1. **Canvas REST API**: Authoritative for live points, submission states, assignment links, and submission timestamps.
2. **Syllabus & Schedule Document Parsers**: Extracts unlisted deadlines, reading milestones, studio cycles, and grade weights from uploaded PDF/DOCX syllabi and Canvas page bodies.
3. **User-Created Tasks**: Add your own study groups, personal milestones, or off-Canvas tasks that are preserved across automatic resyncs.

### 4. Instructor & Office Hours Integration
- Automatically parses professor and TA contact info, office hours schedules, office room locations, and Zoom/Calendly/Google Calendar booking links directly from syllabus text.
- Integrated **Office Hours Card** with direct 1-click meeting links and an in-drawer editor that syncs across devices via `chrome.storage.sync`.

### 5. Academic Calendar Awareness (Fall 2026)
- Automatically anchors ambiguous or yearless dates (e.g. *"Tuesday, Oct 6"* or *"Week 8"*) to the official CU Boulder academic calendar dates.
- Automatically skips university holidays and breaks (e.g. Labor Day, Fall Break / Thanksgiving).

### 6. RFC 5545 Mountain Time Calendar Export
- Generates fully compliant `.ics` calendar files with `America/Denver` (Mountain Time) `VTIMEZONE` blocks for seamless 1-click import into Apple Calendar, Google Calendar, or Outlook.

### 7. Local-First & Privacy-Preserving
- Authenticates securely via your active Canvas session cookie (`canvas.colorado.edu`).
- Zero external tracking, telemetry, or third-party servers. All data is cached locally on your device in `chrome.storage.local` with lightweight sync through `chrome.storage.sync`.

---

## 🏗️ Technical Architecture

Canvas Compass is built with a modular, maintainable TypeScript architecture:

```
src/
├── ai/                     # Tier 2 Gemini Flash API client & prompt builder
├── api/                    # Canvas REST client, academic calendar & scan orchestrator
│   ├── academicCalendar.ts # CU Boulder term dates, breaks & holidays
│   ├── canvasClient.ts     # Rate-limited Canvas REST API wrapper with backoff
│   ├── scanner.ts          # Multi-course scan pipeline & syllabus discovery
│   └── termAnchors.ts      # Yearless date anchoring algorithms
├── content.ts              # Content script entrypoint & Shadow DOM mount
├── export/                 # RFC 5545 .ics generator & JSON backup exporter
├── merge/                  # Deduplication, conflict resolution & merger engine
├── mock/                   # Sample fixture datasets for offline testing
├── parsers/                # Document extraction engines
│   ├── classifier.ts       # Assignment vs Exam vs Quiz categorization rules
│   ├── docxParser.ts       # DOCX document XML parser
│   ├── htmlParser.ts       # Canvas syllabus_body & page HTML parser
│   ├── officeHoursParser.ts# Instructor name, email, Zoom, and Calendly parser
│   └── pdfParser.ts        # Coordinate-based table reconstruction via PDF.js
├── rank/                   # Scoring algorithm, weight vector & horizon ranker
├── service-worker.ts       # Background service worker & alarm scheduler
├── storage/                # Reactive store with local/sync storage persistence
├── types/                  # TypeScript interface definitions
└── ui/                     # Apple Liquid Glass UI components & views
    ├── components/         # Item cards, badges, and vector icons
    ├── views/              # Relevance, By Course, Calendar, Custom, Settings
    ├── floatingButton.ts   # Animated, draggable floating orb
    ├── liquidGlass.ts      # CSS design system & WCAG color tokens
    └── panel.ts            # Slide-in panel container & scroll manager
```

### Parser Pipeline Tiers:
- **Tier 1 (Offline, Deterministic)**: Extracts text runs using `pdf.js` coordinates to reconstruct multi-column schedule tables and extract dates, assignments, and office hours without network dependency.
- **Tier 2 (AI-Assisted, Opt-In)**: Allows students to provide their own Google Gemini API key to run zero-shot JSON deadline extraction on complex or non-standard syllabi.

---

## 💻 Developer Setup & Building

If you'd like to develop, test, or contribute to Canvas Compass:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- `npm` (v9.0.0 or later)

### Installation
```bash
# Clone the repository
git clone https://github.com/juko04/canvas-compass.git
cd canvas-compass

# Install dependencies
npm install
```

### Build Commands
```bash
# Run unit tests and golden fixture tests
npm test

# Run build watcher during active development
npm run dev

# Compile production build to dist/
npm run build

# Package production dist/ into canvas-compass.zip
npm run zip
```

### Golden Test Suite
Canvas Compass includes end-to-end golden parser tests ([`tests/tier1-golden.test.ts`](tests/tier1-golden.test.ts)) evaluated against real University of Colorado Boulder syllabi:
1. **ENVD 4365**: Combined syllabus + schedule PDF with Calendly appointment links and grading weight structures.
2. **THTR 3055**: Complex multi-column coordinate-based schedule PDF with lab assignments, remote quizzes, and production dates.
3. **ATLS 4519**: Canvas syllabus page body verifying recurring rhythm expansion, break skipping, and milestone detection.

---

## 📄 License & Student Usage

Created for **University of Colorado Boulder** students. Distributed freely for educational and personal use under standard open academic sharing.

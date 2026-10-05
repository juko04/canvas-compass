# 🧭 Canvas Compass — Installation & Student User Guide

Welcome to **Canvas Compass**! This guide walks you through installing and using the extension in Google Chrome. **No coding or terminal experience required — setup takes under 60 seconds.**

---

## ⚡ 60-Second Quick Start

```
1. Download ZIP  ➔  2. Unzip Folder  ➔  3. Load in chrome://extensions  ➔  4. Open Canvas!
```

### Step 1: Download the Extension
1. Download **[`canvas-compass.zip`](canvas-compass.zip)** from this repository (or from the [Releases](../../releases) tab).
2. Locate `canvas-compass.zip` in your Downloads folder and **unzip** it:
   - **Mac**: Double-click `canvas-compass.zip`. It will extract a folder named `canvas-compass`.
   - **Windows**: Right-click `canvas-compass.zip` → select **Extract All...** → click **Extract**.

---

### Step 2: Install into Google Chrome
1. Open Google Chrome.
2. In the address bar, type:
   ```
   chrome://extensions
   ```
   and press **Enter**.
3. In the top-right corner, turn **ON** the **Developer mode** toggle.
4. In the top-left corner, click the **Load unpacked** button.
5. Select the unzipped `canvas-compass` folder (the folder containing `manifest.json`, `content.js`, and `icons/`).
6. You will see **Canvas Compass (CU Boulder)** appear in your list of extensions!

---

### Step 3: Open Canvas
1. Go to **[canvas.colorado.edu](https://canvas.colorado.edu)** and log in.
2. Look at your screen — you’ll see the **glowing liquid glass Compass Orb**!
3. Click the orb (or press `Cmd + Shift + C` on Mac / `Ctrl + Shift + C` on Windows) to open your dashboard.

> [!TIP]
> **Pin the Extension**: Click the puzzle piece icon (🧩) in Chrome's top toolbar next to your profile picture, find **Canvas Compass**, and click the pin icon (📌) so it stays visible in your toolbar.

---

## 🎮 How to Use Canvas Compass

### 1. The Floating Compass Orb
* **Urgency Glow**: The orb dynamically shifts between 5 colors based on what's due in the next 7 days:
  * 🔵 **Calm Blue**: No urgent deadlines coming up.
  * 🟢 **Teal / Cyan**: Normal weekly pace.
  * 🟡 **Warm Amber**: Several assignments due this week.
  * 🟠 **Orange**: Multiple assignments due in the next 48–72 hours.
  * 🔴 **Crimson Red**: Immediate deadlines within 24 hours.
* **Drag Anywhere**: Click and hold the orb to drag it to any comfortable spot on your screen. Its position is saved automatically.
* **Dock Mode**: When the panel is open, the orb snaps smoothly into the top header dock.

---

### 2. The Views

| View | Purpose |
| :--- | :--- |
| **Relevance** | **Default view**: Groups everything dynamically into **This Week** (rolling 7 days), **On the Horizon** (major exams, projects, capstones), **Later**, and **Completed**. |
| **By Course** | An accordion list of your classes. Click any course to expand assignments, view instructor office hours, or export that specific class schedule. |
| **Calendar** | A clean, chronologically organized timeline jumping directly to your next upcoming deadline. |
| **Custom** | Add personal study sessions, group project deadlines, or reading reminders that Canvas doesn't track. |

---

### 3. Syncing Your Courses & Assignments
* **Sync from Canvas**: When you first open the extension, it reads your favorited courses from your active Canvas session.
* **Rescanning a Course**: In the **By Course** tab, click **Rescan** on any class to re-fetch live assignments, quizzes, and syllabus updates.
* **Muting Classes**: If you are a TA or don't want a specific class cluttering your deadlines, click the **Tracked / Muted** button on that course card.

---

### 4. Instructor & Office Hours Integration
* Expand any course in the **By Course** tab to view your professor’s details:
  * 👤 **Professor / TA Name**
  * ✉️ **Direct Email** (click to open a new email draft)
  * 🎥 **Zoom or Calendly Link** (click to join or book office hours directly)
  * 🕒 **Office Hours Schedule** (e.g. *Tuesdays & Thursdays 2:00 PM – 3:30 PM*)
  * 📍 **Office Room Location** (e.g. *ECCR 244*)
* **Editing Details**: Click **Edit** or **+ Add Details** to update or paste Zoom/Calendly links anytime. Click **Save** to keep them synced across your devices.

---

### 5. Drag & Drop Syllabus PDF Ingestion
Have a syllabus with schedule tables that the professor never added to the Canvas calendar?
1. Open the **By Course** tab and expand the course.
2. Click **Import Gemini JSON** or locate the **Drop Syllabus PDF** box.
3. Drag your course `.pdf` syllabus directly into the box.
4. Canvas Compass parses the document entirely inside your browser (offline via PDF.js) and extracts every dated homework, quiz, and exam into your schedule!

---

### 6. Marking Assignments Complete
* Check the checkbox on any assignment card to mark it **Done**.
* Completed assignments move to the **Completed** group at the bottom with a strikethrough.
* **Accidentally clicked?** Click the checkbox again in the Completed section to uncheck and restore it to your active due list!

---

### 7. Exporting to Apple Calendar / Google Calendar
Want your deadlines on your phone or desktop calendar?
* Click **Export ICS** on any course (or export all items from Settings).
* Double-click the downloaded `.ics` file to import it into **Apple Calendar**, **Google Calendar**, or **Outlook** with Mountain Time (`America/Denver`) timezones!

---

### 8. (Optional) Enabling Gemini Flash AI
Canvas Compass works 100% offline using built-in table and text parsing. If you want extra AI assistance for unconventional syllabus formats:
1. Click the gear icon (**⚙️**) in the top right to open **Settings**.
2. Toggle **Enable Gemini Flash AI Parser** to ON.
3. Grab a free API key from [Google AI Studio](https://aistudio.google.com/) and paste it into the key field.
4. Your key is stored strictly on your device.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd + Shift + C` (Mac) / `Ctrl + Shift + C` (Win) | **Toggle Compass Panel** open or closed |
| `Cmd + F` / `Ctrl + F` (while open) | **Focus Search Bar** |
| `Escape` | **Clear search** or close panel |

---

## ❓ Troubleshooting & FAQs

### Q: Why aren't all my courses showing up?
> **Answer**: Canvas Compass reads your **favorited** courses on Canvas.
> 1. In Canvas, click **Courses** on the far-left sidebar → click **All Courses**.
> 2. Click the star icon (⭐) next to your current semester's courses to favorite them.
> 3. Open Canvas Compass and click **Sync from Canvas** at the top of the **By Course** tab.

### Q: Chrome shows a banner saying "Disable developer mode extensions". Is this normal?
> **Answer**: Yes! Chrome displays this standard reminder for any extension loaded via "Load unpacked". You can simply click the small **✕** to dismiss it. It will never harm your computer or browser.

### Q: How do I update to a new version when Julian updates it?
> **Answer**:
> 1. Download the new `canvas-compass.zip` from GitHub and unzip it.
> 2. Replace your old folder with the new folder.
> 3. Go to `chrome://extensions` and click the circular **Reload** arrow on the Canvas Compass card. Done!

### Q: Is my Canvas login or student data safe?
> **Answer**: Absolutely. Canvas Compass runs **100% locally** inside your own browser using your existing Canvas session cookie. It has no external backend, does not collect analytics, and never transmits your data to any third-party servers.

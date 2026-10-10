# UI DESIGN SYSTEM MANUAL

## 1. Color System
The UI fuses three distinct aesthetics:

### A. Claude Warm Dark Palette
- **Main Canvas Background**: `#191716` (Deep Warm Espresso / Graphite)
- **Secondary Surfaces & Sidebar**: `#1b1917` / `#141211`
- **Card & Input Container**: `#262320` (Warm Charcoal)
- **Borders & Dividers**: `#2d2926` / `#38342f`
- **Signature Accent**: `#d97746` (Claude Terracotta Orange)
  - Used for the `✳` star, active navigation pills, primary send buttons, and highlights.
- **Text Hierarchy**:
  - Primary: `#f3f1ee` (Warm Cream White)
  - Secondary: `#e8e5e0` / `#d4cec5`
  - Muted: `#8f8880` / `#6d665f`

### B. Slack Workspace Hierarchy
- **Top Global Navigation**: Continuous top bar spanning the window with `< > 🕒` history and central search bar.
- **Far-Left Activity Rail** (56px width): Icon-focused navigation with tooltips and badge counters.
- **Rich Message Reactions**: Compact pill buttons (`🔥 3`, `👏 2`, `🚀 4`, `🎉 6`).

### C. Grok Bot Character Styling
- **Minimalist Bot Faces**: High-contrast circular avatars with expressive eyes (Trinity).
- **Gold Star Badge**: `★` badge on the core orchestrator.
- **Role Tags**: Discrete background badges (`Research Assistant`, `Infrastructure`, `QA`).

---

## 2. Interactive Components

### A. Top Global Search Bar & Command Palette (`⌘K`)
- Triggered via clicking the header bar or typing `⌘K`.
- Allows instant fuzzy-search jumping between bots, workspaces, and IDE views.

### B. Grok Bot "Computer" View
- Located in the right split pane under the `Computer` tab.
- **Asleep State**: Shows "The computer is asleep. Click to wake up." with wake button.
- **Awake State**: Boots into the live desktop webview or smartphone mockup.
- **Smartphone Mockup Toggle**: Wraps the live iframe in an iPhone hardware shell with dynamic island notch.

### C. Mode Switchers
- **Claude Top Switcher**: `[ Home ]` vs `[ </> Code ]`
- **Composer Mode Switcher**: `[ Chat ]` vs `[ Cowork ]`
- **Right Panel Switcher**: `[ Details ]` `[ Library ]` `[ Computer ]` `[ Code ]`

# INTEGRATION: CODE WITH ANTONIO

## 1. Overview
Project Dawn integrates the design system, UI primitives, and architecture patterns from **Code with Antonio** repositories (including Grok Bot, SaaS platforms, and AI Studio starters).

---

## 2. Integrated Assets & Primitives

### A. 60+ Shadcn UI Primitives
Located in `src/components/ui/`:
- **Buttons, Badges, & Inputs**: `button.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`
- **Dialogs & Modals**: `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `alert-dialog.tsx`
- **Navigation**: `tabs.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `menubar.tsx`
- **Data & Tables**: `table.tsx`, `card.tsx`, `separator.tsx`, `scroll-area.tsx`
- **Pickers & Sliders**: `slider.tsx`, `switch.tsx`, `checkbox.tsx`, `radio-group.tsx`
- **Avatars & Visuals**: `avatar.tsx`, `aspect-ratio.tsx`, `carousel.tsx`, `chart.tsx`

### B. Animated DiceBear Gaze Avatars
Integrated into `src/components/chat-avatar.tsx`:
- Uses `@dicebear/core` and `@dicebear/styles/gaze.json`.
- Dynamic seed hashing per bot (`trinity-core`, `kali-bot`, `nimbus-bot`, etc.).
- Eye animation tracking and high-DPI SVG rendering.

### C. Theme Engine & OKLCH Tokens
Configured in `src/app/globals.css`:
- Tailwind v4 `@theme inline` mapping.
- Dark mode OKLCH palette adapted for warm Claude espresso and Slack dark tones.
- Full compatibility with Base UI and Radix primitives.

---

## 3. Organization & Repo Hookup Instructions

To link or refresh your access to Code with Antonio organization repos:
1. Ensure your GitHub account (`kylesmcauliffe`) is accepted into the `codewithantonio` organization.
2. Verify via GitHub CLI:
   ```bash
   gh auth status
   gh repo list codewithantonio
   ```
3. To sync upstream changes from Antonio's templates into Dawn:
   ```bash
   git remote add antonio <repo-url>
   git fetch antonio
   ```
4. All component imports utilize absolute pathing `@/components/ui/...` and clean utility helper `@/lib/utils` (`cn`).

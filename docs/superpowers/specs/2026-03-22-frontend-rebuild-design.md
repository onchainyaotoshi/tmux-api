# Frontend Rebuild — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Approach:** Full Theme Overhaul — retheme from CSS variables up, terminal/hacker aesthetic, keep shadcn primitives

## Overview

Visual rebuild of the Foreman frontend. Same page structure and functionality, completely new look and feel. The goal is a distinctive hacker/terminal aesthetic that fits Foreman's identity as a tmux management tool — not generic shadcn defaults.

No new features, no structural changes. Pure visual transformation.

## Design Principles

- **Monospace everything** — JetBrains Mono as the single typeface
- **Terminal authenticity** — UI elements that feel like a real terminal, not a theme park version of one
- **Phosphor green + amber** — two accent colors, used intentionally
- **Atmosphere through subtlety** — faint scanlines, gentle glows, cursor blinks. Never distracting.
- **Responsive** — works on mobile, not just desktop

## Color Palette

### CSS Variables (dark theme only)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0a0e14` | Page background, deep dark with cool tint |
| `--foreground` | `#b6c4d0` | Default text, slightly muted |
| `--card` | `#0d1117` | Card/surface background |
| `--card-foreground` | `#c9d5e0` | Card text |
| `--primary` | `#00ff41` | Phosphor green — active states, links, key accents |
| `--primary-foreground` | `#0a0e14` | Text on green backgrounds |
| `--secondary` | `#ffb000` | Amber — warnings, counts, secondary emphasis |
| `--secondary-foreground` | `#0a0e14` | Text on amber backgrounds |
| `--muted` | `#151b23` | Muted surface |
| `--muted-foreground` | `#6b7d8f` | Dim text, comments (meets WCAG AA 4.5:1 on background) |
| `--accent` | `#1a2332` | Hover/active surface |
| `--accent-foreground` | `#00ff41` | Hover/active text |
| `--destructive` | `#ff3333` | Kill/delete actions |
| `--destructive-foreground` | `#ffffff` | Text on destructive backgrounds |
| `--popover` | `#0d1117` | Dropdown/popover backgrounds (matches card) |
| `--popover-foreground` | `#c9d5e0` | Dropdown/popover text (matches card-foreground) |
| `--border` | `rgba(0, 255, 65, 0.12)` | Subtle green-tinted borders |
| `--input` | `rgba(0, 255, 65, 0.08)` | Input backgrounds |
| `--ring` | `rgba(0, 255, 65, 0.3)` | Focus rings, green glow |

### Sidebar-specific

| Token | Value |
|---|---|
| `--sidebar-background` | `#080c10` |
| `--sidebar-foreground` | `#6b7d8f` |
| `--sidebar-primary` | `#00ff41` |
| `--sidebar-accent` | `#1a2332` |
| `--sidebar-border` | `rgba(0, 255, 65, 0.1)` |

## Typography

- **Font family:** `'JetBrains Mono', monospace` — loaded from Google Fonts
- **Applied globally** — all headings, body, nav, tables, buttons
- **Letter spacing:** `0.02em` on body text for terminal feel
- **No serif or sans-serif fallback styling** — full monospace commitment

## Sidebar

### Behavior

Collapsible sidebar — standard modern dashboard pattern:

- **Expanded state (w-56 / 14rem):** Icon + label for each nav item
- **Collapsed state (w-16 / 4rem):** Icon only, with tooltip on hover showing label
- **Toggle:** Button at bottom of sidebar to collapse/expand
- **Persistence:** Collapsed/expanded state saved in `localStorage` key `foreman-sidebar-collapsed`. Default on first visit: expanded.
- **Mobile (<md):** Sidebar hidden entirely. Slim top bar with hamburger toggle. Sidebar opens as a shadcn Sheet (slide from left) with overlay.
- **Transition:** Smooth width transition (200ms ease). Main content margin transitions in sync.
- **Implementation:** Plain `<aside>` approach (do NOT use `components/ui/sidebar.jsx` — incompatible with Tailwind v4 per CLAUDE.md). Delete the unused shadcn sidebar file.

### Styling

- **Header:** `foreman` in green monospace with animated blinking block cursor (`foreman█`). In collapsed state, just the TerminalSquare icon.
- **Section labels:** Styled as terminal comments — `# DASHBOARD`, `# RESOURCES` — dim green, uppercase. Hidden when collapsed.
- **Nav links:** Prefixed with `>` when expanded. Active state: green left border (3px) + green text. Hover: subtle green background glow.
  ```
  > Sessions
  > About Tmux
    API Docs ↗
  ```
- **Auth area (bottom):** Above the collapse toggle. Email shown as `user@foreman ~$` when expanded, user avatar/icon when collapsed. Login/Logout as dim terminal-styled text button.
- **Background:** Darkest surface in the app. Optional very faint noise texture via CSS (no images).

### Rename

"Knowledge Base" → "About Tmux" in sidebar nav. Route path remains `/knowledge-base` — label-only change.

## HomePage (Landing Page)

Unauthenticated users see a landing page. Authenticated users redirect to `/sessions`.

### Layout

Full-width centered content, no sidebar context needed (sidebar still visible but content is centered in the main area).

### Sections

1. **Hero**
   - Large ASCII art "FOREMAN" rendered in monospace (preformatted text, styled green)
   - Animated typing effect on tagline: `> orchestrate your AI workforce_` with blinking cursor
   - Login button styled as terminal command: `$ foreman login` — green border, green text, green glow on hover

2. **Features (3-column grid, stacks on mobile)**
   - Three cards styled as terminal windows with title bar chrome:
     ```
     ┌─── sessions.sh ──────────────┐
     │                               │
     │  Manage tmux sessions via     │
     │  REST API. Create, kill,      │
     │  and monitor from anywhere.   │
     │                               │
     └───────────────────────────────┘
     ```
   - Each card has: terminal title bar with filename, description text, a small icon
   - Cards: session management, terminal capture, REST API
   - Green border, slight hover lift

3. **Background**
   - Subtle matrix-style falling characters animation via lightweight `<canvas>` — opacity ~0.05 (tunable via CSS variable). Distinct sub-task during implementation.
   - Should not distract from content, purely atmospheric

## SessionsPage

### Header

Terminal prompt style: `user@foreman:~/sessions$` as the page title, with the refresh button inline.

### Session Table

- Wrapped in terminal window chrome — thin green border, rounded corners
- Header row: monospace, green text, uppercase — resembles `tmux ls` column output
- Row hover: subtle green-tinted background
- Empty state: `> no active sessions. create one to get started._` with blinking cursor
- **Columns stay the same:** Name, Windows, Created, Actions

### Action Buttons

- View: `[▸ view]` — green outline style
- Kill: `[× kill]` — red/destructive but fits the terminal aesthetic (no heavy shadcn destructive, more muted)
- Refresh: `[↻ refresh]` — green accent

### Terminal Viewer Modal

- Same functionality (window/pane selector, captured output)
- Modal gets terminal window chrome (green border, title bar with session name)
- Output `<pre>` area: black background with green-tinted text (`#33ff77`), resembles actual terminal
- Select dropdowns styled with monospace text
- Refresh button in terminal style

## Knowledge Base (About Tmux)

### Rename

- Page title: "About Tmux" (was "Tmux Knowledge Base")
- Subtitle stays Indonesian: "Visual tutorial untuk orchestrasi terminal"

### Styling

- Section headers: styled as terminal chapter separators `═══ SESSION ═══` — green, centered
- Badge nav at top: green-outlined monospace tags instead of default shadcn badges
- Shortcut tables: green header row, monospace throughout, subtle row striping with green tint
- Section cards: terminal window chrome borders
- Terminal simulator components: already terminal-ish, just align colors to new palette

## CallbackPage

No visual changes needed — it's a transient OAuth redirect handler.

## Global Styles

### CSS Additions (in `src/index.css`)

- **Scrollbar:** Thin, green thumb on dark track (`scrollbar-width: thin`, webkit overrides)
- **Selection:** Green highlight (`::selection { background: rgba(0, 255, 65, 0.25) }`)
- **Focus states:** Green glow ring on all interactive elements
- **Transitions:** 150ms default on color/background/border transitions
- **Blinking cursor animation:** Reusable `@keyframes blink` for the `█` cursor used in multiple places
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables typing animations, matrix rain, cursor blink, and sidebar transitions

### Font Loading

Add JetBrains Mono via `<link>` in `index.html` (only weights 400 and 700 to minimize payload):
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" as="style" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

All CSS variable values use hex or rgba format, replacing the default oklch values from shadcn.

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< md (768px)` | Sidebar hidden, hamburger top bar, sheet overlay. Feature grid stacks to single column. |
| `≥ md` | Sidebar visible (collapsed or expanded per user pref). Standard layout. |

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Full CSS variable overhaul, scrollbar, selection, animations |
| `index.html` | Add JetBrains Mono font link |
| `src/frontend/App.jsx` | Update layout for collapsible sidebar + mobile top bar |
| `src/frontend/components/Sidebar.jsx` | Complete rewrite — collapsible, terminal styling, mobile sheet |
| `src/frontend/pages/HomePage.jsx` | Landing page with ASCII hero, features grid, typing animation |
| `src/frontend/pages/SessionsPage.jsx` | Terminal chrome on table, restyled buttons, prompt-style header |
| `src/frontend/pages/KnowledgeBasePage.jsx` | Rename to "About Tmux", restyle sections |
| `src/frontend/components/TerminalViewerModal.jsx` | Terminal chrome, green-tinted output |
| `src/frontend/components/ConfirmModal.jsx` | Align to terminal aesthetic |
| `src/frontend/components/Section.jsx` | Terminal chapter separator styling |
| `src/frontend/components/ShortcutTable.jsx` | Green header, monospace alignment |
| `src/frontend/components/TerminalSimulator.jsx` | Align colors to new palette |
| `src/frontend/components/terminal-styles.js` | Update Tailwind class constants |
| `src/frontend/sections/*.jsx` | Inherit styling from parent components, minor tweaks |
| `src/frontend/components/ui/sidebar.jsx` | Delete — unused, incompatible with Tailwind v4 |
| `src/frontend/components/ProtectedRoute.jsx` | Unchanged — no visual output |
| `src/frontend/lib/api.js` | Unchanged — logic only |
| `src/frontend/lib/auth.js` | Unchanged — logic only |

## Accessibility

- **Color contrast:** All text meets WCAG AA 4.5:1 minimum. `--muted-foreground` set to `#6b7d8f` (~4.5:1 on `#0a0e14`).
- **Focus indicators:** Green glow ring + solid 2px fallback ring for keyboard-only users.
- **Reduced motion:** All animations respect `prefers-reduced-motion: reduce`.
- **ASCII art:** Hero ASCII "FOREMAN" wrapped in `role="img"` with `aria-label="Foreman"`.
- **Sidebar tooltips:** Collapsed sidebar icons have tooltips for label context.

## Scope

### In Scope

- Full color palette overhaul (CSS variables)
- JetBrains Mono typography
- Collapsible sidebar with mobile responsiveness
- HomePage landing page redesign
- SessionsPage terminal chrome
- Knowledge Base restyle + rename to "About Tmux"
- Terminal Viewer Modal restyle
- Global styles (scrollbar, selection, focus, animations)

### Out of Scope

- New pages or features
- Backend changes
- Route changes
- Auth flow changes
- Stack redefine (separate spec)

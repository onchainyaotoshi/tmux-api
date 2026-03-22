# Frontend Full Rewrite — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Complete frontend rewrite — layout, sidebar, all pages, theme

## Problem

The current frontend has compounding layout issues centered on the sidebar:
- Fixed positioning + margin sync (`position: fixed` + `ml-56`) is fragile and breaks
- Collapsible sidebar adds complexity without value
- Mobile Sheet drawer doesn't work properly
- Hacker/terminal aesthetic (phosphor green, ASCII art, Matrix rain, blinking cursors) is being replaced with a modern dark dashboard look
- Styling is inconsistent across pages

## Design Direction

**Modern dark dashboard** — clean, professional, like Linear/Vercel/GitHub dark mode. Neutral colors, sans-serif body text, monospace only for code/data.

## Color Palette

| Token | Value | Description |
|-------|-------|-------------|
| `--background` | `#09090b` | zinc-950, near-black |
| `--foreground` | `#fafafa` | zinc-50, primary text |
| `--card` | `#18181b` | zinc-900, surface |
| `--card-foreground` | `#fafafa` | zinc-50 |
| `--border` | `#27272a` | zinc-800 |
| `--primary` | `#3b82f6` | blue-500, accent |
| `--primary-foreground` | `#ffffff` | white |
| `--secondary` | `#27272a` | zinc-800 |
| `--secondary-foreground` | `#fafafa` | zinc-50 |
| `--muted` | `#27272a` | zinc-800 |
| `--muted-foreground` | `#a1a1aa` | zinc-400 |
| `--accent` | `#1e293b` | slate-800 |
| `--accent-foreground` | `#f8fafc` | slate-50 |
| `--destructive` | `#ef4444` | red-500 |
| `--destructive-foreground` | `#ffffff` | white |
| `--input` | `#27272a` | zinc-800 |
| `--ring` | `#3b82f6` | blue-500 |
| `--sidebar-background` | `#09090b` | same as background |
| `--sidebar-foreground` | `#a1a1aa` | zinc-400 |
| `--sidebar-border` | `#27272a` | zinc-800 |
| `--sidebar-primary` | `#3b82f6` | blue-500 |
| `--sidebar-accent` | `#1e293b` | slate-800 |

## Typography

- **Body:** `Inter`, system-ui, sans-serif — default for all UI text
- **Code/data:** `JetBrains Mono`, monospace — session names, terminal output, API references only

## Layout Architecture

### Desktop (>=768px)
CSS Grid layout, no fixed positioning:
```
grid-template-columns: 240px 1fr
min-height: 100vh
```
- Sidebar: 240px, part of grid flow
- Content: flex-1, max-w-5xl, p-8

### Mobile (<768px)
- Sidebar hidden
- Sticky top bar (h-14) with hamburger menu
- Hamburger opens shadcn Sheet (slide from left) with nav links
- Content: full width, p-4

## Sidebar

Fixed 240px, no collapse feature, no tooltips.

**Nav items:**
1. Sessions (`/sessions`) — protected
2. Agents (`/agents`) — new page
3. About Tmux (`/about-tmux`)
4. API Docs (`/docs`) — external link

**Auth area:** user email + logout button (bottom of sidebar).

**Active state:** background highlight + left border accent (blue-500).

## Pages

### HomePage (`/`)
- Unauthenticated landing page
- Clean: icon/logo, heading ("Orchestrate your AI workforce"), subtitle, "Get Started" button
- 3 feature cards: Sessions, Capture, API — shadcn Card, icon + title + one-liner
- No ASCII art, no Matrix rain, no typing animation
- Authenticated users redirect to `/sessions`

### SessionsPage (`/sessions`, protected)
- Page title "Sessions" + Refresh button
- shadcn Table: Name, Windows, Created, Actions columns
- Actions: View (outline button), Kill (destructive ghost button)
- Empty state: "No active sessions"
- TerminalViewer modal: same logic, clean styling (monospace text on dark surface, not green-on-black)
- ConfirmDialog: same logic, clean styling

### AgentsPage (`/agents`, new)
- Placeholder page
- Title "Agents" + "Coming soon" message

### About Tmux (`/about-tmux`)
- Renamed from KnowledgeBasePage
- Route changed from `/knowledge-base` to `/about-tmux`
- Same tutorial content (Indonesian), restyled with clean design
- Section nav badges with clean styling (no green glow)

### CallbackPage (`/callback`)
- Keep as-is, minimal restyle of loading text

## File Structure

```
src/frontend/
  main.jsx                         — keep, minimal changes
  App.jsx                          — rewrite: router + layouts

  layouts/
    AppLayout.jsx                  — NEW: CSS Grid, sidebar + content
    AuthLayout.jsx                 — NEW: centered layout for callback

  components/
    Sidebar.jsx                    — rewrite: fixed 240px, no collapse
    ConfirmDialog.jsx              — rewrite: clean styling
    TerminalViewer.jsx             — rewrite: clean styling
    ProtectedRoute.jsx             — keep as-is
    ui/                            — keep all 13 shadcn primitives

  pages/
    HomePage.jsx                   — rewrite: clean landing
    SessionsPage.jsx               — rewrite: clean table
    AgentsPage.jsx                 — NEW: placeholder
    AboutTmuxPage.jsx              — rewrite: rename + restyle
    CallbackPage.jsx               — keep as-is

  hooks/
    use-mobile.jsx                 — keep

  lib/
    auth.js                        — keep
    api.js                         — keep
    utils.js                       — keep

  src/index.css                    — rewrite: new theme
```

## Files to Delete

- `hooks/use-sidebar.jsx` — no collapse feature
- `components/MatrixRain.jsx` — hacker aesthetic removed
- `components/Section.jsx` — old tutorial wrapper
- `components/ShortcutTable.jsx` — old tutorial table
- `components/TerminalSimulator.jsx` — old terminal mockup
- `components/terminal-styles.js` — old style constants
- `sections/SessionSection.jsx` — content moves to AboutTmuxPage
- `sections/WindowSection.jsx`
- `sections/PaneSection.jsx`
- `sections/NavigationSection.jsx`
- `sections/ResizeSection.jsx`
- `sections/CopyModeSection.jsx`

## What Gets Preserved

- All business logic: auth flow, API calls, session management, terminal viewer data fetching
- shadcn/ui primitives (13 components)
- OAuth callback flow
- Protected route guard
- Mobile breakpoint detection hook

## Out of Scope

- Backend changes
- New API endpoints
- Agent CRUD UI (just placeholder page)
- Authentication flow changes

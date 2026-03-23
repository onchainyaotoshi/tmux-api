# Design: Extract About Tmux into Standalone `tmux-tutorial` Repo

**Date:** 2026-03-23
**Status:** Approved

## Goal

Extract the "About Tmux" interactive tutorial from the tmux-api frontend into a standalone repository (`tmux-tutorial`) that will be deployed to Cloudflare Pages as a single-page static site.

## Context

The About Tmux page (`src/frontend/pages/AboutTmuxPage.jsx`) is a self-contained ~667-line interactive tmux tutorial in Indonesian (Bahasa Indonesia). It has zero coupling to the tmux-api backend — no API calls, no shared state. It only depends on 4 shadcn/ui primitives and Tailwind CSS theming.

Extracting it:
- Decouples the tutorial from the API server
- Enables independent deployment via Cloudflare Pages
- Simplifies tmux-api's frontend (which becomes just the home page + API docs link)

## New Repo: `tmux-tutorial`

**Location:** `/home/claude/devops/tmux-tutorial`
**Stack:** Vite + React 19 + Tailwind CSS v4 + shadcn/ui (subset)
**Type:** Single-page static site (no router)

### Structure

```
tmux-tutorial/
  src/
    App.jsx              — Renders AboutTmux directly (no router)
    main.jsx             — Entry point, renders App into #root
    index.css            — Tailwind directives + shadcn dark theme vars
    lib/utils.js         — cn() helper (clsx + tailwind-merge)
    components/ui/       — shadcn primitives (4 files only)
      card.jsx
      badge.jsx
      button.jsx
      table.jsx
    components/
      AboutTmux.jsx      — The tutorial component (from AboutTmuxPage.jsx)
  index.html             — HTML shell with <html class="dark">
  vite.config.js         — Vite + React + Tailwind v4, @ alias
  jsconfig.json          — Path alias: @ -> src/
  package.json
  .gitignore
```

### package.json

```json
{
  "name": "tmux-tutorial",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.2.2",
    "@tailwindcss/vite": "^4.2.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "@radix-ui/react-slot": "^1.2.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0"
  }
}
```

**Not needed:** react-router-dom, lucide-react, @radix-ui/react-dialog, @radix-ui/react-separator, @fastify/* — none of these are used by the tutorial component.

### Files Copied from tmux-api

| Source (tmux-api) | Destination (tmux-tutorial) | Changes |
|---|---|---|
| `src/frontend/pages/AboutTmuxPage.jsx` | `src/components/AboutTmux.jsx` | Rename function `AboutTmuxPage` → `AboutTmux` |
| `src/index.css` | `src/index.css` | Remove all `sidebar`-prefixed CSS custom properties from all blocks (`@theme inline`, `:root`, `.dark`) |
| `src/frontend/lib/utils.js` | `src/lib/utils.js` | None |
| `src/frontend/components/ui/card.jsx` | `src/components/ui/card.jsx` | None (imports use `@/` alias, reconfigured in vite.config.js to `src/`) |
| `src/frontend/components/ui/badge.jsx` | `src/components/ui/badge.jsx` | None |
| `src/frontend/components/ui/button.jsx` | `src/components/ui/button.jsx` | None |
| `src/frontend/components/ui/table.jsx` | `src/components/ui/table.jsx` | None |

> **Note:** All `@/` import paths in copied files resolve correctly because the `@` alias changes from `src/frontend/` to `src/` in the new project's vite.config.js. No import path edits needed.

### New Files

- **`index.html`** — Vite HTML shell with `<html class="dark">`, Google Fonts (Inter + JetBrains Mono), loads `src/main.jsx`
- **`vite.config.js`** — Vite + React + Tailwind v4 plugin, `@` alias to `src/`
- **`jsconfig.json`** — Path alias for editor support
- **`package.json`** — As specified in package.json section above
- **`.gitignore`** — Standard Node.js ignores: `node_modules/`, `dist/`, `.env`
- **`src/main.jsx`** — Renders `<App />` into `#root` (no BrowserRouter needed)
- **`src/App.jsx`** — Simple wrapper that renders `<AboutTmux />` with page layout (centered, max-width)

### App.jsx Design

```jsx
import AboutTmux from './components/AboutTmux'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl p-8">
        <AboutTmux />
      </main>
    </div>
  )
}
```

## Changes to tmux-api

### Files Removed
- `src/frontend/pages/AboutTmuxPage.jsx`

### Files Modified
- **`src/frontend/App.jsx`** — Remove AboutTmuxPage import and `/about-tmux` route
- **`src/frontend/components/Sidebar.jsx`** — Remove "About Tmux" nav item and `BookOpen` icon import

### Components NOT Removed from tmux-api
The shadcn components (card, badge, button, table) stay in tmux-api — they're still used by `HomePage.jsx` and potentially other pages.

## Cloudflare Pages Deployment

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Framework preset:** Vite (auto-detected by Cloudflare Pages)
- Vite produces static `index.html` + JS/CSS assets — fully compatible with Cloudflare Pages static hosting
- SPA fallback not needed (single page, no client-side routing)

## What This Design Does NOT Include

- No CI/CD pipeline setup (Cloudflare Pages connects to GitHub repo directly)
- No custom domain configuration (done in Cloudflare dashboard)
- No content changes to the tutorial itself
- No new GitHub repo creation (done manually or separately)

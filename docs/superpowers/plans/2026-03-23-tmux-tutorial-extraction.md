# tmux-tutorial Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the About Tmux interactive tutorial from tmux-api into a standalone `tmux-tutorial` repo deployable to Cloudflare Pages.

**Architecture:** New Vite + React 19 + Tailwind CSS v4 single-page app. Copy the self-contained tutorial component and its 4 shadcn/ui dependencies. Remove the page from tmux-api.

**Tech Stack:** Vite 6, React 19, Tailwind CSS v4, shadcn/ui (card, badge, button, table), Cloudflare Pages

**Spec:** `docs/superpowers/specs/2026-03-23-tmux-tutorial-extraction-design.md`

---

## Task 1: Initialize tmux-tutorial repo with project scaffolding

**Files:**
- Create: `/home/claude/devops/tmux-tutorial/package.json`
- Create: `/home/claude/devops/tmux-tutorial/.gitignore`
- Create: `/home/claude/devops/tmux-tutorial/vite.config.js`
- Create: `/home/claude/devops/tmux-tutorial/jsconfig.json`
- Create: `/home/claude/devops/tmux-tutorial/index.html`

- [ ] **Step 1: Create directory and initialize git repo**

```bash
mkdir -p /home/claude/devops/tmux-tutorial
cd /home/claude/devops/tmux-tutorial
git init
```

- [ ] **Step 2: Create .gitignore**

Write `/home/claude/devops/tmux-tutorial/.gitignore`:

```
node_modules/
dist/
.env
```

- [ ] **Step 3: Create package.json**

Write `/home/claude/devops/tmux-tutorial/package.json`:

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

- [ ] **Step 4: Create vite.config.js**

Write `/home/claude/devops/tmux-tutorial/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

- [ ] **Step 5: Create jsconfig.json**

Write `/home/claude/devops/tmux-tutorial/jsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 6: Create index.html**

Write `/home/claude/devops/tmux-tutorial/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" as="style" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <title>Tmux Tutorial</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Run npm install**

```bash
cd /home/claude/devops/tmux-tutorial
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit scaffolding**

```bash
cd /home/claude/devops/tmux-tutorial
git add .gitignore package.json package-lock.json vite.config.js jsconfig.json index.html
git commit -m "chore: initialize tmux-tutorial project scaffolding"
```

---

## Task 2: Add shared utilities and shadcn/ui components

**Files:**
- Create: `/home/claude/devops/tmux-tutorial/src/lib/utils.js`
- Create: `/home/claude/devops/tmux-tutorial/src/components/ui/card.jsx`
- Create: `/home/claude/devops/tmux-tutorial/src/components/ui/badge.jsx`
- Create: `/home/claude/devops/tmux-tutorial/src/components/ui/button.jsx`
- Create: `/home/claude/devops/tmux-tutorial/src/components/ui/table.jsx`

- [ ] **Step 1: Create src/lib/utils.js**

Copy verbatim from `/home/claude/devops/tmux-api/src/frontend/lib/utils.js`:

```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Copy shadcn/ui components**

Copy these files verbatim (no changes needed — `@/` alias resolves to `src/` in the new project):

- `/home/claude/devops/tmux-api/src/frontend/components/ui/card.jsx` → `/home/claude/devops/tmux-tutorial/src/components/ui/card.jsx`
- `/home/claude/devops/tmux-api/src/frontend/components/ui/badge.jsx` → `/home/claude/devops/tmux-tutorial/src/components/ui/badge.jsx`
- `/home/claude/devops/tmux-api/src/frontend/components/ui/button.jsx` → `/home/claude/devops/tmux-tutorial/src/components/ui/button.jsx`
- `/home/claude/devops/tmux-api/src/frontend/components/ui/table.jsx` → `/home/claude/devops/tmux-tutorial/src/components/ui/table.jsx`

- [ ] **Step 3: Commit**

```bash
cd /home/claude/devops/tmux-tutorial
git add src/lib/utils.js src/components/ui/
git commit -m "chore: add cn() utility and shadcn/ui components (card, badge, button, table)"
```

---

## Task 3: Add CSS theme and entry points

**Files:**
- Create: `/home/claude/devops/tmux-tutorial/src/index.css`
- Create: `/home/claude/devops/tmux-tutorial/src/main.jsx`
- Create: `/home/claude/devops/tmux-tutorial/src/App.jsx`

- [ ] **Step 1: Create src/index.css**

Copy from `/home/claude/devops/tmux-api/src/index.css` but remove all `sidebar`-prefixed CSS custom properties from all three blocks (`@theme inline`, `:root`, `.dark`).

The resulting file:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}

:root {
  --radius: 0.625rem;
}

.dark {
  --background: #09090b;
  --foreground: #fafafa;
  --card: #18181b;
  --card-foreground: #fafafa;
  --popover: #18181b;
  --popover-foreground: #fafafa;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --secondary: #27272a;
  --secondary-foreground: #fafafa;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --accent: #1e293b;
  --accent-foreground: #f8fafc;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #27272a;
  --input: #27272a;
  --ring: #3b82f6;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0;
  }

  /* Scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: #3f3f46 transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: #52525b;
  }

  /* Selection */
  ::selection {
    background: rgba(59, 130, 246, 0.3);
    color: #ffffff;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

- [ ] **Step 2: Create src/main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Create src/App.jsx**

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

- [ ] **Step 4: Commit**

```bash
cd /home/claude/devops/tmux-tutorial
git add src/index.css src/main.jsx src/App.jsx
git commit -m "feat: add CSS theme, main entry point, and App shell"
```

---

## Task 4: Add the AboutTmux tutorial component

**Files:**
- Create: `/home/claude/devops/tmux-tutorial/src/components/AboutTmux.jsx`

- [ ] **Step 1: Copy AboutTmuxPage.jsx with rename**

Copy `/home/claude/devops/tmux-api/src/frontend/pages/AboutTmuxPage.jsx` to `/home/claude/devops/tmux-tutorial/src/components/AboutTmux.jsx`.

The only change: rename the exported function from `AboutTmuxPage` to `AboutTmux` on line 590:

```diff
- export default function AboutTmuxPage() {
+ export default function AboutTmux() {
```

Everything else stays identical. The `@/components/ui/*` imports resolve correctly because the `@` alias points to `src/` in the new project.

- [ ] **Step 2: Commit**

```bash
cd /home/claude/devops/tmux-tutorial
git add src/components/AboutTmux.jsx
git commit -m "feat: add AboutTmux interactive tutorial component"
```

---

## Task 5: Verify the build works

- [ ] **Step 1: Run vite build**

```bash
cd /home/claude/devops/tmux-tutorial
npm run build
```

Expected: Build succeeds, output in `dist/` directory with `index.html` + JS/CSS assets.

- [ ] **Step 2: Verify dist output exists**

```bash
ls -la /home/claude/devops/tmux-tutorial/dist/
ls -la /home/claude/devops/tmux-tutorial/dist/assets/
```

Expected: `index.html` at root, JS and CSS files in `assets/`.

- [ ] **Step 3: Commit build verification (no files to commit, just verify)**

The `dist/` directory is gitignored. Nothing to commit — just confirm the build pipeline works for Cloudflare Pages.

---

## Task 6: Remove About Tmux from tmux-api

**Files:**
- Delete: `/home/claude/devops/tmux-api/src/frontend/pages/AboutTmuxPage.jsx`
- Modify: `/home/claude/devops/tmux-api/src/frontend/App.jsx`
- Modify: `/home/claude/devops/tmux-api/src/frontend/components/Sidebar.jsx`

- [ ] **Step 1: Delete AboutTmuxPage.jsx**

```bash
rm /home/claude/devops/tmux-api/src/frontend/pages/AboutTmuxPage.jsx
```

- [ ] **Step 2: Update App.jsx — remove AboutTmuxPage import and route**

Edit `/home/claude/devops/tmux-api/src/frontend/App.jsx` to become:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import HomePage from './pages/HomePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
```

Changes:
- Remove `import AboutTmuxPage from './pages/AboutTmuxPage.jsx'` (line 4)
- Remove `<Route path="/about-tmux" element={<AboutTmuxPage />} />` (line 11)

- [ ] **Step 3: Update Sidebar.jsx — remove About Tmux nav item**

Edit `/home/claude/devops/tmux-api/src/frontend/components/Sidebar.jsx`:

- Remove `BookOpen` from the lucide-react import (line 3): change to `import { FileText, Github, Menu } from 'lucide-react'`
- Replace the `navItems` array (line 10-12) with an empty array: `const navItems = []`

- [ ] **Step 4: Verify tmux-api frontend still builds**

```bash
cd /home/claude/devops/tmux-api
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Run tmux-api tests to check nothing is broken**

```bash
cd /home/claude/devops/tmux-api
npm test
```

Expected: All tests pass. (The backend tests don't test frontend routes, so this should be clean.)

- [ ] **Step 6: Commit cleanup in tmux-api**

```bash
cd /home/claude/devops/tmux-api
git add src/frontend/pages/AboutTmuxPage.jsx src/frontend/App.jsx src/frontend/components/Sidebar.jsx
git commit -m "refactor: remove About Tmux page (extracted to tmux-tutorial repo)"
```

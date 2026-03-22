# Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Foreman frontend from generic shadcn defaults into a distinctive hacker/terminal aesthetic with collapsible responsive sidebar.

**Architecture:** Pure visual overhaul — CSS variables, typography, component restyling, and sidebar rewrite. No backend changes, no new routes, no structural changes. shadcn primitives remain but are deeply themed.

**Tech Stack:** React, Tailwind CSS v4, shadcn/ui, JetBrains Mono, CSS animations, Canvas (matrix rain)

**Spec:** `docs/superpowers/specs/2026-03-22-frontend-rebuild-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Add JetBrains Mono font links |
| `src/index.css` | Modify | Full CSS variable overhaul, global styles, animations |
| `src/frontend/App.jsx` | Modify | Layout for collapsible sidebar + mobile top bar |
| `src/frontend/components/Sidebar.jsx` | Rewrite | Collapsible sidebar with terminal styling + mobile sheet |
| `src/frontend/hooks/use-sidebar.jsx` | Create | Sidebar collapse state management (localStorage + context) |
| `src/frontend/pages/HomePage.jsx` | Rewrite | Landing page with ASCII hero, features, typing animation |
| `src/frontend/components/MatrixRain.jsx` | Create | Canvas-based matrix rain background component |
| `src/frontend/pages/SessionsPage.jsx` | Modify | Terminal chrome on table, restyled buttons |
| `src/frontend/components/TerminalViewerModal.jsx` | Modify | Terminal chrome, green-tinted output |
| `src/frontend/components/ConfirmModal.jsx` | Modify | Terminal aesthetic alignment |
| `src/frontend/pages/KnowledgeBasePage.jsx` | Modify | Rename title, restyle badge nav |
| `src/frontend/components/Section.jsx` | Modify | Terminal chapter separator styling |
| `src/frontend/components/ShortcutTable.jsx` | Modify | Green header, terminal table styling |
| `src/frontend/components/TerminalSimulator.jsx` | Modify | Align colors to new palette |
| `src/frontend/components/terminal-styles.js` | Modify | Update Tailwind class constants |
| `src/frontend/sections/*.jsx` | Modify | Minor color tweaks (inline styles → theme tokens) |
| `src/frontend/components/ui/sidebar.jsx` | Delete | Unused, incompatible with Tailwind v4 |

---

### Task 1: Foundation — CSS Variables & Typography

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Add JetBrains Mono font links to index.html**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" as="style" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <title>Foreman</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/frontend/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace all CSS variables in src/index.css**

Replace the entire `.dark` block and add global styles. The full file should become:

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
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'JetBrains Mono', monospace;
}

:root {
  --radius: 0.625rem;
  --sidebar: #080c10;
  --sidebar-foreground: #6b7d8f;
  --sidebar-primary: #00ff41;
  --sidebar-primary-foreground: #0a0e14;
  --sidebar-accent: #1a2332;
  --sidebar-accent-foreground: #00ff41;
  --sidebar-border: rgba(0, 255, 65, 0.1);
  --sidebar-ring: rgba(0, 255, 65, 0.3);
}

.dark {
  --background: #0a0e14;
  --foreground: #b6c4d0;
  --card: #0d1117;
  --card-foreground: #c9d5e0;
  --popover: #0d1117;
  --popover-foreground: #c9d5e0;
  --primary: #00ff41;
  --primary-foreground: #0a0e14;
  --secondary: #ffb000;
  --secondary-foreground: #0a0e14;
  --muted: #151b23;
  --muted-foreground: #6b7d8f;
  --accent: #1a2332;
  --accent-foreground: #00ff41;
  --destructive: #ff3333;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 255, 65, 0.12);
  --input: rgba(0, 255, 65, 0.08);
  --ring: rgba(0, 255, 65, 0.3);
  --sidebar-background: #080c10;
  --sidebar-foreground: #6b7d8f;
  --sidebar-primary: #00ff41;
  --sidebar-primary-foreground: #0a0e14;
  --sidebar-accent: #1a2332;
  --sidebar-accent-foreground: #00ff41;
  --sidebar-border: rgba(0, 255, 65, 0.1);
  --sidebar-ring: rgba(0, 255, 65, 0.3);
  --sidebar: #080c10;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
  }

  /* Scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 255, 65, 0.2) transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 65, 0.2);
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 65, 0.35);
  }

  /* Selection */
  ::selection {
    background: rgba(0, 255, 65, 0.25);
    color: #ffffff;
  }
}

/* Animations */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-blink {
    animation: none;
  }
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: overhaul CSS variables and typography for terminal theme"
```

---

### Task 2: Sidebar Hook — Collapse State Management

**Files:**
- Create: `src/frontend/hooks/use-sidebar.jsx`

- [ ] **Step 1: Create the useSidebar hook**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'foreman-sidebar-collapsed'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // localStorage unavailable
    }
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed(prev => !prev), [])

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds (file is created but not imported yet, so no change in output).

- [ ] **Step 3: Commit**

```bash
git add src/frontend/hooks/use-sidebar.jsx
git commit -m "feat: add useSidebar hook with localStorage persistence"
```

---

### Task 3: Sidebar — Complete Rewrite

**Files:**
- Rewrite: `src/frontend/components/Sidebar.jsx`
- Modify: `src/frontend/App.jsx`
- Delete: `src/frontend/components/ui/sidebar.jsx`

- [ ] **Step 1: Delete the unused shadcn sidebar component**

```bash
rm src/frontend/components/ui/sidebar.jsx
```

- [ ] **Step 2: Rewrite Sidebar.jsx**

```jsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  TerminalSquare,
  MonitorPlay,
  BookOpen,
  FileText,
  LogOut,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

function SidebarNav({ collapsed, onNavigate, onToggle }) {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      'hover:bg-accent/50 hover:text-accent-foreground',
      isActive && 'border-l-[3px] border-primary text-primary bg-accent/30',
      !isActive && 'border-l-[3px] border-transparent text-sidebar-foreground',
      collapsed && 'justify-center px-2'
    )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-sidebar-border bg-sidebar-background',
          !collapsed && 'w-56',
          collapsed && 'w-16'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-2 p-4', collapsed && 'justify-center p-3')}>
          <TerminalSquare className="size-5 shrink-0 text-primary" />
          {!collapsed && (
            <span className="font-mono text-lg text-primary">
              foreman<span className="animate-blink">█</span>
            </span>
          )}
        </div>
        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {isLoggedIn && (
            <>
              {!collapsed && (
                <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60">
                  # dashboard
                </p>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink to="/sessions" className={linkClass} onClick={onNavigate}>
                    <MonitorPlay className="size-4 shrink-0" />
                    {!collapsed && <span>&gt; Sessions</span>}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Sessions</TooltipContent>}
              </Tooltip>
            </>
          )}

          {!collapsed && (
            <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60">
              # resources
            </p>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/knowledge-base" className={linkClass} onClick={onNavigate}>
                <BookOpen className="size-4 shrink-0" />
                {!collapsed && <span>&gt; About Tmux</span>}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">About Tmux</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent/50 hover:text-accent-foreground',
                  'border-l-[3px] border-transparent text-sidebar-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <FileText className="size-4 shrink-0" />
                {!collapsed && <span>API Docs ↗</span>}
              </a>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">API Docs</TooltipContent>}
          </Tooltip>
        </nav>

        {/* Auth area */}
        <div className="border-t border-sidebar-border p-3">
          {user && !collapsed && (
            <p className="mb-2 truncate font-mono text-xs text-sidebar-foreground">
              <span className="text-primary">user@foreman</span> ~$
            </p>
          )}
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-sidebar-foreground hover:text-primary',
                collapsed && 'px-2'
              )}
              onClick={() => auth.logout()}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && <span>logout</span>}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-sidebar-foreground hover:text-primary',
                collapsed && 'px-2'
              )}
              onClick={() => auth.login()}
            >
              <LogIn className="size-4 shrink-0" />
              {!collapsed && <span>login</span>}
            </Button>
          )}
        </div>

        {/* Collapse toggle (desktop only, passed via prop) */}
        {onToggle && (
          <div className="border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn('w-full text-sidebar-foreground hover:text-primary', collapsed && 'px-2')}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const { collapsed, toggle } = useSidebar()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="fixed inset-x-0 top-0 z-50 flex h-12 items-center border-b border-sidebar-border bg-sidebar-background px-3">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="ml-2 font-mono text-sm text-primary">
            foreman<span className="animate-blink">█</span>
          </span>
        </div>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar-background border-sidebar-border">
          <SidebarNav collapsed={false} onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <SidebarNav collapsed={collapsed} onToggle={toggle} />
    </div>
  )
}
```

- [ ] **Step 3: Update App.jsx for collapsible sidebar + mobile layout**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import { SidebarProvider, useSidebar } from './hooks/use-sidebar.jsx'
import { useIsMobile } from './hooks/use-mobile.jsx'
import { cn } from '@/lib/utils'

function AppLayout() {
  const { collapsed } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={cn(
          'flex-1 p-6 md:p-10 transition-[margin] duration-200 ease-in-out',
          isMobile ? 'mt-12' : (collapsed ? 'ml-16' : 'ml-56')
        )}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <SidebarProvider>
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </SidebarProvider>
  )
}

export default App
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git rm src/frontend/components/ui/sidebar.jsx
git add src/frontend/components/Sidebar.jsx src/frontend/App.jsx
git commit -m "feat: rewrite sidebar with collapsible layout and mobile responsiveness"
```

---

### Task 4: HomePage — Landing Page with ASCII Hero

**Files:**
- Create: `src/frontend/components/MatrixRain.jsx`
- Rewrite: `src/frontend/pages/HomePage.jsx`

- [ ] **Step 1: Create the MatrixRain canvas component**

```jsx
import { useEffect, useRef } from 'react'

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'

export default function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let columns = []
    const fontSize = 14
    const speed = 33 // ~30fps

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const colCount = Math.floor(canvas.width / fontSize)
      columns = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * canvas.height / fontSize)
      )
    }

    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 20, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(0, 255, 65, 0.08)'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * fontSize
        const y = columns[i] * fontSize
        ctx.fillText(char, x, y)

        if (y > canvas.height && Math.random() > 0.975) {
          columns[i] = 0
        }
        columns[i]++
      }
    }

    resize()
    const interval = setInterval(draw, speed)
    window.addEventListener('resize', resize)

    // Respect reduced motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mql.matches) {
      clearInterval(interval)
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity: 0.05 }}
      aria-hidden="true"
    />
  )
}
```

- [ ] **Step 2: Rewrite HomePage.jsx**

```jsx
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { TerminalSquare, Eye, Wifi } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import MatrixRain from '../components/MatrixRain.jsx'

const ASCII_LOGO = `
 ███████  ██████  ██████  ███████ ███    ███  █████  ███    ██
 ██      ██    ██ ██   ██ ██      ████  ████ ██   ██ ████   ██
 █████   ██    ██ ██████  █████   ██ ████ ██ ███████ ██ ██  ██
 ██      ██    ██ ██   ██ ██      ██  ██  ██ ██   ██ ██  ██ ██
 ██       ██████  ██   ██ ███████ ██      ██ ██   ██ ██   ████`

const TAGLINE = '> orchestrate your AI workforce'

const features = [
  {
    file: 'sessions.sh',
    icon: TerminalSquare,
    text: 'Manage tmux sessions via REST API. Create, kill, and monitor from anywhere.',
  },
  {
    file: 'capture.sh',
    icon: Eye,
    text: 'Capture terminal output in real-time. See what your agents are doing without SSH.',
  },
  {
    file: 'api.sh',
    icon: Wifi,
    text: 'Full REST API with Swagger docs. Integrate Foreman into your automation pipeline.',
  },
]

function useTypingEffect(text, speed = 50) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(text)
      setDone(true)
      return
    }
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

function FeatureCard({ file, icon: Icon, text }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-0 transition-transform hover:-translate-y-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="text-primary">┌───</span>
        <span>{file}</span>
        <span className="text-primary ml-auto">───┐</span>
      </div>
      <div className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  const { displayed, done } = useTypingEffect(TAGLINE)

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center text-center">
      <MatrixRain />

      <div className="relative z-10">
        {/* ASCII Logo */}
        <pre
          role="img"
          aria-label="Foreman"
          className="mb-6 text-xs leading-tight text-primary sm:text-sm md:text-base"
        >
          {ASCII_LOGO}
        </pre>

        {/* Tagline with typing effect */}
        <p className="mb-8 font-mono text-lg text-muted-foreground">
          {displayed}
          {!done && <span className="animate-blink">█</span>}
          {done && <span className="animate-blink">_</span>}
        </p>

        {/* Login button */}
        <Button
          size="lg"
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 hover:text-primary font-mono"
          onClick={() => auth.login()}
        >
          $ foreman login
        </Button>

        {/* Feature cards */}
        <div className="mt-16 grid max-w-3xl gap-4 text-left md:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.file} {...f} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/components/MatrixRain.jsx src/frontend/pages/HomePage.jsx
git commit -m "feat: redesign homepage with ASCII hero, typing animation, and matrix rain"
```

---

### Task 5: SessionsPage — Terminal Chrome

**Files:**
- Modify: `src/frontend/pages/SessionsPage.jsx`

- [ ] **Step 1: Restyle SessionsPage with terminal chrome**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Eye } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmModal from '../components/ConfirmModal.jsx'
import TerminalViewerModal from '../components/TerminalViewerModal.jsx'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [killTarget, setKillTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)

  const fetchSessions = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const res = await apiFetch('/sessions')
      setSessions(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleKill = async () => {
    if (!killTarget) return
    try {
      await apiFetch(`/sessions/${killTarget}`, { method: 'DELETE' })
      setKillTarget(null)
      fetchSessions()
    } catch (err) {
      setError(err.message)
      setKillTarget(null)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className="max-w-3xl">
      {/* Terminal prompt header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-mono text-lg">
          <span className="text-primary">user@foreman</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-secondary">~/sessions</span>
          <span className="text-muted-foreground">$ </span>
          <span className="animate-blink">█</span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={loading}
          className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"
        >
          <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : ''} />
          {loading ? 'loading...' : '↻ refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions.length === 0 && !loading ? (
        <p className="py-10 text-center font-mono text-muted-foreground">
          &gt; no active sessions. create one to get started.
          <span className="animate-blink">_</span>
        </p>
      ) : (
        <div className="rounded-lg border border-primary/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-primary/15 hover:bg-transparent">
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Windows</TableHead>
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Created</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.name} className="border-b border-border/50 hover:bg-accent/30">
                  <TableCell className="font-mono text-foreground">{s.name}</TableCell>
                  <TableCell className="font-mono text-secondary">{s.windows}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{formatDate(s.created)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewTarget(s.name)}
                        className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"
                      >
                        ▸ view
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setKillTarget(s.name)}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 font-mono text-xs"
                      >
                        × kill
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {killTarget && (
        <ConfirmModal
          title="Kill Session"
          message={`Are you sure you want to kill session "${killTarget}"?`}
          onConfirm={handleKill}
          onCancel={() => setKillTarget(null)}
        />
      )}

      {viewTarget && (
        <TerminalViewerModal
          sessionName={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/pages/SessionsPage.jsx
git commit -m "feat: restyle sessions page with terminal chrome and prompt header"
```

---

### Task 6: Terminal Viewer Modal & Confirm Modal

**Files:**
- Modify: `src/frontend/components/TerminalViewerModal.jsx`
- Modify: `src/frontend/components/ConfirmModal.jsx`

- [ ] **Step 1: Restyle TerminalViewerModal.jsx**

Replace the `<pre>` styling and modal chrome. Key changes:
- `DialogContent` gets `className="max-w-4xl border-primary/20 bg-card"`
- `DialogTitle` keeps `font-mono` and adds `text-primary`
- The `<pre>` output area changes from `bg-zinc-950 text-zinc-100` to `bg-[#000000] text-[#33ff77]`
- Select components add `font-mono` class
- Refresh button uses terminal style: `className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"`

Apply these edits to `src/frontend/components/TerminalViewerModal.jsx`:

In the `DialogContent`:
```jsx
<DialogContent className="max-w-4xl border-primary/20 bg-card">
```

In the `DialogTitle`:
```jsx
<DialogTitle className="font-mono text-primary">Session: {sessionName}</DialogTitle>
```

In the `<pre>`:
```jsx
<pre
  ref={outputRef}
  className="font-mono text-sm bg-[#000000] text-[#33ff77] p-4 rounded-lg max-h-[60vh] overflow-auto border border-primary/10"
>
```

In the Refresh Button:
```jsx
<Button
  variant="outline"
  size="sm"
  onClick={() => fetchOutput(selectedWindow, selectedPane)}
  disabled={loading || selectedWindow === null || selectedPane === null}
  className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"
>
  <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : ''} />
  ↻ refresh
</Button>
```

- [ ] **Step 2: Restyle ConfirmModal.jsx**

Add terminal styling to the alert dialog:

```jsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="border-destructive/20 bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-destructive">{title}</AlertDialogTitle>
          <AlertDialogDescription className="font-mono">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="font-mono text-xs">cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs"
          >
            yes, kill it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/components/TerminalViewerModal.jsx src/frontend/components/ConfirmModal.jsx
git commit -m "feat: restyle terminal viewer and confirm modals with terminal aesthetic"
```

---

### Task 7: Knowledge Base — Rename & Restyle

**Files:**
- Modify: `src/frontend/pages/KnowledgeBasePage.jsx`
- Modify: `src/frontend/components/Section.jsx`
- Modify: `src/frontend/components/ShortcutTable.jsx`
- Modify: `src/frontend/components/TerminalSimulator.jsx`
- Modify: `src/frontend/components/terminal-styles.js`

- [ ] **Step 1: Update KnowledgeBasePage.jsx — rename and restyle badge nav**

```jsx
import { Badge } from '@/components/ui/badge'
import SessionSection from '../sections/SessionSection.jsx'
import WindowSection from '../sections/WindowSection.jsx'
import PaneSection from '../sections/PaneSection.jsx'
import NavigationSection from '../sections/NavigationSection.jsx'
import ResizeSection from '../sections/ResizeSection.jsx'
import CopyModeSection from '../sections/CopyModeSection.jsx'

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
]

export default function KnowledgeBasePage() {
  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="mb-2 font-mono text-2xl font-bold text-primary">About Tmux</h2>
        <p className="text-muted-foreground">Visual tutorial untuk orchestrasi terminal</p>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#${id}`}>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs cursor-pointer"
            >
              {title}
            </Badge>
          </a>
        ))}
      </nav>
      <SessionSection />
      <WindowSection />
      <PaneSection />
      <NavigationSection />
      <ResizeSection />
      <CopyModeSection />
    </>
  )
}
```

- [ ] **Step 2: Update Section.jsx with terminal chapter separators**

```jsx
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-5">
      <Card className="border-primary/15 bg-card">
        <CardHeader>
          <div className="text-center font-mono text-sm text-primary tracking-widest">
            ═══ {title.toUpperCase()} ═══
          </div>
          <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </section>
  )
}
```

- [ ] **Step 3: Update ShortcutTable.jsx with green headers**

```jsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ShortcutTable({ shortcuts }) {
  return (
    <Table className="my-5">
      <TableHeader>
        <TableRow className="border-b border-primary/15 hover:bg-transparent">
          <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Shortcut</TableHead>
          <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Keterangan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map(({ key, description }, i) => (
          <TableRow key={i} className="border-b border-border/50 hover:bg-accent/30">
            <TableCell>
              <code className="rounded bg-primary/10 px-2 py-1 font-mono text-sm text-primary whitespace-nowrap">{key}</code>
            </TableCell>
            <TableCell className="text-muted-foreground">{description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 4: Update TerminalSimulator.jsx colors**

```jsx
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TerminalSimulator({ title, steps }) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]

  return (
    <Card className="my-5 overflow-hidden bg-[#000000] font-mono text-sm border-primary/15">
      <div className="flex items-center gap-2 border-b border-primary/10 bg-[#0a0e14] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff3333]" />
        <span className="h-3 w-3 rounded-full bg-[#ffb000]" />
        <span className="h-3 w-3 rounded-full bg-[#00ff41]" />
        <span className="ml-2 text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="min-h-[200px] p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <Button
              key={i}
              variant={i === currentStep ? 'secondary' : 'outline'}
              size="sm"
              className="font-mono text-xs"
              onClick={() => setCurrentStep(i)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="overflow-hidden rounded border border-primary/10">
          {step.render()}
        </div>
        {step.statusBar && (
          <div className="mt-2 flex justify-between rounded-b bg-muted px-3 py-1 text-xs text-muted-foreground">
            <span>{step.statusBar.left}</span>
            <span>{step.statusBar.right}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
```

- [ ] **Step 5: Update terminal-styles.js**

No changes needed — the existing constants use theme tokens (`text-muted-foreground`, `text-primary`, `border-border`, `bg-primary/5`) which will automatically pick up the new palette values.

- [ ] **Step 6: Update inline color references in sections**

Some section files use inline `style={{ color: '#666' }}` for comments. Replace with theme tokens. Files with `#666`:

- `SessionSection.jsx`
- `WindowSection.jsx`
- `CopyModeSection.jsx`

```jsx
// From:
<span style={{ color: '#666' }}>...</span>
// To:
<span className="text-muted-foreground">...</span>
```

Also check `NavigationSection.jsx` and `CopyModeSection.jsx` for hardcoded `color: '#00ff41'` — replace with `className="text-primary"` for consistency with the theme system.

- [ ] **Step 7: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/frontend/pages/KnowledgeBasePage.jsx src/frontend/components/Section.jsx src/frontend/components/ShortcutTable.jsx src/frontend/components/TerminalSimulator.jsx src/frontend/components/terminal-styles.js src/frontend/sections/
git commit -m "feat: restyle knowledge base as 'About Tmux' with terminal chapter separators"
```

---

### Task 8: Final Verification & Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no warnings.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All existing tests pass (tests are backend integration tests, frontend changes should not affect them).

- [ ] **Step 3: Visual verification**

Run: `npm run dev:frontend`
Check each page manually:
- HomePage: ASCII logo visible, typing animation works, matrix rain background visible, feature cards render, login button works
- Sidebar: collapses/expands, tooltips show when collapsed, mobile hamburger works at narrow viewport
- SessionsPage: terminal prompt header, green table headers, styled buttons
- Knowledge Base: "About Tmux" title, green chapter separators, styled shortcut tables, terminal simulator colors aligned

- [ ] **Step 4: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: final cleanup and adjustments for frontend rebuild"
```

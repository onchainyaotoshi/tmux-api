# Frontend Full Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the entire Foreman frontend from hacker/terminal aesthetic to a modern dark dashboard (Linear/Vercel style), fixing layout issues caused by the sidebar's fixed positioning hack.

**Architecture:** CSS Grid layout replaces fixed positioning + margin sync. Sidebar is 240px, no collapse. Mobile uses sticky top bar + Sheet drawer. All pages rewritten with clean sans-serif design. shadcn/ui primitives kept, all custom components rewritten.

**Tech Stack:** React 19, Vite 6, Tailwind CSS v4, shadcn/ui (Radix), Inter font (Google Fonts CDN), JetBrains Mono (code only)

**Spec:** `docs/superpowers/specs/2026-03-22-frontend-full-rewrite-design.md`

---

### Task 1: Theme Foundation — Rewrite CSS + Add Inter Font

**Files:**
- Modify: `src/index.css` (full rewrite)
- Modify: `index.html` (add Inter font)

- [ ] **Step 1: Add Inter font to index.html**

In `index.html`, add Google Fonts CDN link for Inter alongside existing JetBrains Mono. Add inside `<head>`, before the existing JetBrains Mono link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Rewrite src/index.css**

Replace entire file with new theme. Key changes:
- All CSS variables switch from green hacker palette to zinc/blue neutral palette
- `--font-sans` changes from JetBrains Mono to Inter
- Remove `animate-blink` keyframes, typing animation
- Keep scrollbar styling but neutral gray instead of green
- Keep `@theme inline` block structure (required by Tailwind v4)
- Keep `@custom-variant dark` directive
- Keep `prefers-reduced-motion` media query

Full replacement for `src/index.css`:

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
  --font-sans: 'Inter', system-ui, sans-serif;
}

:root {
  --radius: 0.625rem;
  --sidebar: #09090b;
  --sidebar-foreground: #a1a1aa;
  --sidebar-primary: #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e293b;
  --sidebar-accent-foreground: #f8fafc;
  --sidebar-border: #27272a;
  --sidebar-ring: #3b82f6;
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
  --sidebar-background: #09090b;
  --sidebar-foreground: #a1a1aa;
  --sidebar-primary: #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e293b;
  --sidebar-accent-foreground: #f8fafc;
  --sidebar-border: #27272a;
  --sidebar-ring: #3b82f6;
  --sidebar: #09090b;
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

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds (existing components still reference old classes like `text-primary` which still exist, just different colors now)

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: rewrite theme — zinc/blue dark dashboard, add Inter font"
```

---

### Task 2: Layout System — AppLayout + AuthLayout

**Files:**
- Create: `src/frontend/layouts/AppLayout.jsx`
- Create: `src/frontend/layouts/AuthLayout.jsx`

- [ ] **Step 1: Create layouts directory**

```bash
mkdir -p src/frontend/layouts
```

- [ ] **Step 2: Write AppLayout.jsx**

CSS Grid layout: `240px 1fr` on desktop, single column with top bar on mobile. Imports Sidebar and renders `<Outlet>` for nested routes.

```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useIsMobile } from '@/hooks/use-mobile'

export default function AppLayout() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="p-4 pt-18">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <Sidebar />
      <main className="overflow-auto p-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Write AuthLayout.jsx**

Simple centered layout for callback page.

```jsx
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (layouts aren't wired into routes yet)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/layouts/
git commit -m "feat: add AppLayout (CSS Grid) and AuthLayout"
```

---

### Task 3: Sidebar Rewrite

**Files:**
- Rewrite: `src/frontend/components/Sidebar.jsx`

- [ ] **Step 1: Rewrite Sidebar.jsx**

Fixed 240px sidebar. No collapse, no tooltips, no SidebarProvider. Desktop: static sidebar in grid. Mobile: sticky top bar + Sheet.

```jsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  MonitorPlay,
  Bot,
  BookOpen,
  FileText,
  LogOut,
  LogIn,
  Menu,
} from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const navItems = [
  { to: '/sessions', label: 'Sessions', icon: MonitorPlay },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/about-tmux', label: 'About Tmux', icon: BookOpen },
]

function SidebarNav({ onNavigate }) {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      isActive
        ? 'border-l-2 border-primary bg-accent/50 text-foreground font-medium'
        : 'border-l-2 border-transparent text-muted-foreground'
    )

  return (
    <div className="flex h-full flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-lg font-semibold text-foreground">Foreman</span>
      </div>
      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate}>
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'border-l-2 border-transparent text-muted-foreground'
          )}
        >
          <FileText className="size-4 shrink-0" />
          <span>API Docs</span>
          <span className="ml-auto text-xs text-muted-foreground">↗</span>
        </a>
      </nav>

      {/* Auth area */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {user.email || 'Logged in'}
          </p>
        )}
        {isLoggedIn ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => auth.logout()}
          >
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => auth.login()}
          >
            <LogIn className="size-4 mr-2" />
            Login
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="ml-2 text-sm font-semibold">Foreman</span>
        </div>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar-background border-sidebar-border">
          <SidebarNav onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return <SidebarNav />
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/Sidebar.jsx
git commit -m "feat: rewrite sidebar — fixed 240px, no collapse, clean styling"
```

---

### Task 4: Router Rewrite — App.jsx + main.jsx

**Files:**
- Rewrite: `src/frontend/App.jsx`
- Modify: `src/frontend/main.jsx` (remove SidebarProvider import if present)

- [ ] **Step 1: Rewrite App.jsx**

Use `createBrowserRouter` pattern with layouts. Remove SidebarProvider wrapping.

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import AgentsPage from './pages/AgentsPage.jsx'
import AboutTmuxPage from './pages/AboutTmuxPage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Auth callback — centered layout, no sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/callback" element={<CallbackPage />} />
      </Route>

      {/* Main app — sidebar + content */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/about-tmux" element={<AboutTmuxPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 2: Update main.jsx**

Remove any SidebarProvider import. The file should be:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import '../index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build may fail because new page files don't exist yet. That's expected — we'll create them next. If it fails, just confirm the error is about missing page imports, not syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/App.jsx src/frontend/main.jsx
git commit -m "feat: rewrite router with layout system, add new routes"
```

---

### Task 5: HomePage Rewrite

**Files:**
- Rewrite: `src/frontend/pages/HomePage.jsx`

- [ ] **Step 1: Rewrite HomePage.jsx**

Clean landing page. No ASCII art, Matrix rain, or typing effects.

```jsx
import { Navigate } from 'react-router-dom'
import { TerminalSquare, Eye, Wifi } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const features = [
  {
    icon: TerminalSquare,
    title: 'Sessions',
    description: 'Manage tmux sessions via REST API. Create, kill, and monitor from anywhere.',
  },
  {
    icon: Eye,
    title: 'Capture',
    description: 'View terminal output in real-time. See what your agents are doing without SSH.',
  },
  {
    icon: Wifi,
    title: 'API',
    description: 'Full REST API with Swagger docs. Integrate Foreman into your automation pipeline.',
  },
]

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <TerminalSquare className="mb-4 size-10 text-primary" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Orchestrate your AI workforce
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Manage tmux sessions via REST API. Persistent terminal sessions controlled over HTTP.
      </p>

      <Button
        size="lg"
        className="mt-8"
        onClick={() => auth.login()}
      >
        Get Started
      </Button>

      <div className="mt-16 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="bg-card border-border">
            <CardHeader>
              <Icon className="mb-2 size-5 text-primary" />
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/pages/HomePage.jsx
git commit -m "feat: rewrite homepage — clean modern landing"
```

---

### Task 6: SessionsPage + ConfirmDialog + TerminalViewer Rewrite

**Files:**
- Rewrite: `src/frontend/pages/SessionsPage.jsx`
- Create: `src/frontend/components/ConfirmDialog.jsx` (replaces ConfirmModal.jsx)
- Create: `src/frontend/components/TerminalViewer.jsx` (replaces TerminalViewerModal.jsx)

- [ ] **Step 1: Write ConfirmDialog.jsx**

Same logic as ConfirmModal, clean styling. No terminal font everywhere.

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

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Write TerminalViewer.jsx**

Same data-fetching logic as TerminalViewerModal. Clean styling — monospace only for terminal output area.

```jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function TerminalViewer({ sessionName, onClose }) {
  const [windows, setWindows] = useState([])
  const [selectedWindow, setSelectedWindow] = useState(null)
  const [panes, setPanes] = useState([])
  const [selectedPane, setSelectedPane] = useState(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const outputRef = useRef(null)

  const fetchOutput = useCallback(async (win, pane) => {
    if (win === null || pane === null) return
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/terminals/${sessionName}/windows/${win}/panes/${pane}/capture`)
      if (!res) return
      setOutput(res.data.content)
      setTimeout(() => {
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }, 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionName])

  const fetchPanes = useCallback(async (win) => {
    try {
      const res = await apiFetch(`/terminals/${sessionName}/windows/${win}/panes`)
      if (!res) return
      setPanes(res.data)
      const firstPane = res.data.length > 0 ? String(res.data[0].index) : null
      setSelectedPane(firstPane)
      if (firstPane !== null) {
        await fetchOutput(win, firstPane)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionName, fetchOutput])

  useEffect(() => {
    async function init() {
      try {
        const res = await apiFetch(`/terminals/${sessionName}/windows`)
        if (!res) return
        setWindows(res.data)
        if (res.data.length > 0) {
          const firstWin = String(res.data[0].index)
          setSelectedWindow(firstWin)
          await fetchPanes(firstWin)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    init()
  }, [sessionName, fetchPanes])

  const handleWindowChange = async (value) => {
    setSelectedWindow(value)
    setPanes([])
    setSelectedPane(null)
    setOutput('')
    await fetchPanes(value)
  }

  const handlePaneChange = async (value) => {
    setSelectedPane(value)
    await fetchOutput(selectedWindow, value)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Session: <span className="font-mono">{sessionName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Window:</span>
            <Select
              value={selectedWindow ?? undefined}
              onValueChange={handleWindowChange}
              disabled={windows.length === 0 || loading}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select window" />
              </SelectTrigger>
              <SelectContent>
                {windows.map((w) => (
                  <SelectItem key={w.index} value={String(w.index)}>
                    {w.index}: {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pane:</span>
            <Select
              value={selectedPane ?? undefined}
              onValueChange={handlePaneChange}
              disabled={panes.length === 0 || loading}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select pane" />
              </SelectTrigger>
              <SelectContent>
                {panes.map((p) => (
                  <SelectItem key={p.index} value={String(p.index)}>
                    {p.index}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOutput(selectedWindow, selectedPane)}
            disabled={loading || selectedWindow === null || selectedPane === null}
            className="ml-auto"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {windows.length === 0 && !loading ? (
          <p className="py-10 text-center text-muted-foreground">No windows found</p>
        ) : panes.length === 0 && !loading && selectedWindow !== null ? (
          <p className="py-10 text-center text-muted-foreground">No panes found</p>
        ) : (
          <pre
            ref={outputRef}
            className="rounded-lg border border-border bg-background p-4 font-mono text-sm text-foreground max-h-[60vh] overflow-auto"
          >
            {loading ? 'Loading...' : output || '\n'}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Rewrite SessionsPage.jsx**

Clean table, no terminal prompt header.

```jsx
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
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
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import TerminalViewer from '../components/TerminalViewer.jsx'

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions.length === 0 && !loading ? (
        <p className="py-10 text-center text-muted-foreground">
          No active sessions
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Windows</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-mono">{s.name}</TableCell>
                  <TableCell>{s.windows}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(s.created)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewTarget(s.name)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKillTarget(s.name)}
                      >
                        Kill
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
        <ConfirmDialog
          title="Kill Session"
          message={`Are you sure you want to kill session "${killTarget}"?`}
          onConfirm={handleKill}
          onCancel={() => setKillTarget(null)}
        />
      )}

      {viewTarget && (
        <TerminalViewer
          sessionName={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: May still fail due to missing AgentsPage/AboutTmuxPage. That's expected.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/ConfirmDialog.jsx src/frontend/components/TerminalViewer.jsx src/frontend/pages/SessionsPage.jsx
git commit -m "feat: rewrite sessions page, confirm dialog, terminal viewer"
```

---

### Task 7: AgentsPage (Placeholder)

**Files:**
- Create: `src/frontend/pages/AgentsPage.jsx`

- [ ] **Step 1: Write AgentsPage.jsx**

```jsx
import { Bot } from 'lucide-react'

export default function AgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center">
        <Bot className="mb-4 size-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          Coming soon — agent management will be available here.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/pages/AgentsPage.jsx
git commit -m "feat: add agents placeholder page"
```

---

### Task 8: AboutTmuxPage Rewrite

**Files:**
- Create: `src/frontend/pages/AboutTmuxPage.jsx` (replaces KnowledgeBasePage.jsx)

This is the largest task. The page inlines all 6 tutorial sections with restyled helper components. The Indonesian tutorial content is preserved exactly.

- [ ] **Step 1: Write AboutTmuxPage.jsx**

The page contains:
1. Local helper components: `SectionCard`, `ShortcutTable`, `TerminalDemo` (restyled versions of the old Section, ShortcutTable, TerminalSimulator)
2. All 6 sections with their shortcuts data and step definitions
3. Section nav at the top with clean badges

The file will be long (~600 lines) because all content is inlined per spec. The structure is:

```jsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/* ── Helper Components ─────────────────────────────────────────── */

function SectionCard({ id, title, description, children }) {
  return (
    <Card id={id} className="mb-12 scroll-mt-5 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

function ShortcutTable({ shortcuts }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Shortcut</TableHead>
            <TableHead>Keterangan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shortcuts.map(({ key, description }) => (
            <TableRow key={key}>
              <TableCell className="font-mono text-sm text-primary">{key}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TerminalDemo({ title, steps }) {
  const [activeStep, setActiveStep] = useState(0)
  const current = steps[activeStep]

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">{title}</span>
      </div>

      {/* Step buttons */}
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/50 px-3 py-2">
        {steps.map((step, i) => (
          <Button
            key={i}
            variant={i === activeStep ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setActiveStep(i)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-background p-4 font-mono text-sm min-h-[180px]">
        {current.render()}
      </div>

      {/* Status bar */}
      {current.statusBar && (
        <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-1 text-xs text-muted-foreground">
          <span>{current.statusBar.left}</span>
          <span>{current.statusBar.right}</span>
        </div>
      )}
    </div>
  )
}

/* ── Styling Migration Reference ───────────────────────────────── */
//
// Old terminal-styles.js classes → New Tailwind replacements:
//   ts.paneContainer        → 'flex h-[180px] transition-all duration-300'
//   ts.paneContainerVertical→ 'flex-col' (add to paneContainer)
//   ts.pane                 → 'flex-1 p-2.5 text-muted-foreground flex items-center justify-center transition-all duration-300 border border-border text-sm'
//   ts.paneActive           → 'border-primary bg-primary/10' (was border-primary bg-primary/5)
//   ts.output               → 'text-muted-foreground whitespace-pre-wrap leading-relaxed'
//   ts.prompt               → 'text-primary' (keep as-is)
//
// Inline style color replacements (hardcoded green → blue):
//   rgba(0,255,65,0.15) → rgba(59,130,246,0.15)   (WindowSection active tab)
//   rgba(0,255,65,0.2)  → rgba(59,130,246,0.2)    (CopyMode cursor highlight)
//   rgba(0,255,65,0.3)  → rgba(59,130,246,0.3)    (CopyMode selection)
//   #00ff41             → var(--primary)            (CopyMode selected text color)
//   backgroundColor: '#00ff41', color: '#000' → backgroundColor: 'rgb(59,130,246)', color: '#fff' (search highlight)

/* ── Section 1: Session ────────────────────────────────────────── */

const sessionShortcuts = [
  { key: 'tmux new -s nama', description: 'Buat session baru dengan nama' },
  { key: 'tmux ls', description: 'Lihat daftar session' },
  { key: 'tmux attach -t nama', description: 'Masuk ke session yang ada' },
  { key: 'Ctrl+B d', description: 'Detach dari session aktif' },
  { key: 'tmux kill-session -t nama', description: 'Hapus session' },
]

const sessionSteps = [
  {
    label: 'Buat Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux new -s kerja{'\n'}
        <span className="text-muted-foreground"># Session "kerja" dibuat. Anda masuk ke dalamnya.</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:04' },
  },
  {
    label: 'List Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026){'\n'}
        dev: 2 windows (created Fri Mar 21 09:30:00 2026)
      </div>
    ),
  },
  {
    label: 'Detach',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-muted-foreground"># Di dalam tmux, tekan:</span>{'\n'}
        <span className="text-primary">Ctrl+B </span>lalu <span className="text-primary">d</span>{'\n\n'}
        [detached (from session kerja)]
      </div>
    ),
  },
  {
    label: 'Attach',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux attach -t kerja{'\n'}
        <span className="text-muted-foreground"># Kembali masuk ke session "kerja"</span>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:05' },
  },
  {
    label: 'Kill Session',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">$ </span>tmux kill-session -t dev{'\n'}
        <span className="text-primary">$ </span>tmux ls{'\n'}
        kerja: 1 windows (created Fri Mar 21 10:00:00 2026)
      </div>
    ),
  },
]

/* ── Section 2: Window ─────────────────────────────────────────── */

const windowShortcuts = [
  { key: 'Ctrl+B c', description: 'Buat window baru' },
  { key: 'Ctrl+B ,', description: 'Rename window aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B 0-9', description: 'Pindah ke window nomor tertentu' },
  { key: 'Ctrl+B &', description: 'Tutup window aktif' },
]

function WindowTabs({ windows, active }) {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
      {windows.map((w, i) => (
        <div
          key={i}
          style={{
            padding: '4px 12px',
            background: i === active ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: i === active ? 'var(--primary)' : 'var(--muted-foreground)',
            borderBottom: i === active ? '2px solid var(--primary)' : '2px solid transparent',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
          }}
        >
          {i}:{w}{i === active ? '*' : ''}
        </div>
      ))}
    </div>
  )
}

const windowSteps = [
  {
    label: 'Buat Window',
    render: () => (
      <div>
        <WindowTabs windows={['bash', 'bash']} active={1} />
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B c → window baru terbuat</span>{'\n'}
          <span className="text-primary">$ </span>▊
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash- 1:bash*', right: '"hostname" 15:10' },
  },
  {
    label: 'Rename',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash']} active={0} />
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B , → ketik nama baru → Enter</span>{'\n'}
          <span className="text-primary">$ </span>vim app.js
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor* 1:bash-', right: '"hostname" 15:11' },
  },
  {
    label: 'Switch',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash', 'logs']} active={2} />
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B n/p atau Ctrl+B 0-9</span>{'\n'}
          <span className="text-primary">$ </span>tail -f /var/log/syslog
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor 1:bash 2:logs*', right: '"hostname" 15:12' },
  },
  {
    label: 'Tutup',
    render: () => (
      <div>
        <WindowTabs windows={['editor', 'bash']} active={1} />
        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <span className="text-muted-foreground"># Ctrl+B & → konfirmasi "y" → window ditutup</span>{'\n'}
          <span className="text-primary">$ </span>▊
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:editor 1:bash*', right: '"hostname" 15:13' },
  },
]

/* ── Section 3: Pane ───────────────────────────────────────────── */

const PANE = 'flex-1 p-2.5 text-muted-foreground flex items-center justify-center transition-all duration-300 border border-border text-sm'
const PANE_ACTIVE = 'flex-1 p-2.5 flex items-center justify-center transition-all duration-300 border border-primary bg-primary/10 text-sm text-foreground'
const PANE_ROW = 'flex h-[180px] transition-all duration-300'
const PANE_COL = 'flex flex-col h-[180px] transition-all duration-300'

const paneShortcuts = [
  { key: 'Ctrl+B %', description: 'Split pane secara vertikal (kiri-kanan)' },
  { key: 'Ctrl+B "', description: 'Split pane secara horizontal (atas-bawah)' },
  { key: 'Ctrl+B x', description: 'Tutup pane aktif' },
]

const paneSteps = [
  {
    label: 'Satu Pane',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE_ACTIVE}>pane 0 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:20' },
  },
  {
    label: 'Split Vertikal',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE}>pane 0</div>
        <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:21' },
  },
  {
    label: 'Split Horizontal',
    render: () => (
      <div className={PANE_COL}>
        <div className={PANE}>pane 0</div>
        <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:22' },
  },
  {
    label: 'Multi Split',
    render: () => (
      <div className={PANE_COL}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}>pane 0</div>
          <div className={PANE_ACTIVE}>pane 1 (aktif)</div>
        </div>
        <div className={PANE}>pane 2</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:23' },
  },
  {
    label: 'Tutup Pane',
    render: () => (
      <div className={PANE_ROW}>
        <div className={PANE_ACTIVE}>pane 0 (aktif)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '"hostname" 15:24' },
  },
]

/* ── Section 4: Navigasi ───────────────────────────────────────── */

const navShortcuts = [
  { key: 'Ctrl+B ↑↓←→', description: 'Pindah antar pane dengan arrow keys' },
  { key: 'Ctrl+B q', description: 'Tampilkan nomor pane, tekan angka untuk pindah' },
  { key: 'Ctrl+B o', description: 'Pindah ke pane berikutnya' },
  { key: 'Ctrl+B ;', description: 'Pindah ke pane terakhir yang aktif' },
  { key: 'Ctrl+B n', description: 'Pindah ke window berikutnya' },
  { key: 'Ctrl+B p', description: 'Pindah ke window sebelumnya' },
  { key: 'Ctrl+B w', description: 'Pilih window dari daftar interaktif' },
  { key: 'Ctrl+B s', description: 'Pilih session dari daftar interaktif' },
]

function PaneGrid({ activeIndex }) {
  const panes = ['vim app.js', 'npm run dev', 'git log', 'htop']
  return (
    <div className={PANE_COL} style={{ height: '160px' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={activeIndex === 0 ? PANE_ACTIVE : PANE}>{panes[0]}</div>
        <div className={activeIndex === 1 ? PANE_ACTIVE : PANE}>{panes[1]}</div>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div className={activeIndex === 2 ? PANE_ACTIVE : PANE}>{panes[2]}</div>
        <div className={activeIndex === 3 ? PANE_ACTIVE : PANE}>{panes[3]}</div>
      </div>
    </div>
  )
}

const navSteps = [
  {
    label: '← Kiri',
    render: () => <PaneGrid activeIndex={0} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 0 aktif' },
  },
  {
    label: '→ Kanan',
    render: () => <PaneGrid activeIndex={1} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 1 aktif' },
  },
  {
    label: '↓ Bawah',
    render: () => <PaneGrid activeIndex={3} />,
    statusBar: { left: '[kerja] 0:bash*', right: 'Pane 3 aktif' },
  },
  {
    label: 'Ctrl+B q',
    render: () => (
      <div className={PANE_COL} style={{ height: '160px' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">0</span></div>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">1</span></div>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">2</span></div>
          <div className={PANE}><span style={{ fontSize: '2rem' }} className="text-primary">3</span></div>
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: 'Tekan angka untuk pindah' },
  },
]

/* ── Section 5: Resize ─────────────────────────────────────────── */

const resizeShortcuts = [
  { key: 'Ctrl+B Ctrl+↑', description: 'Perbesar pane ke atas' },
  { key: 'Ctrl+B Ctrl+↓', description: 'Perbesar pane ke bawah' },
  { key: 'Ctrl+B Ctrl+←', description: 'Perbesar pane ke kiri' },
  { key: 'Ctrl+B Ctrl+→', description: 'Perbesar pane ke kanan' },
  { key: 'Ctrl+B z', description: 'Zoom/unzoom pane (fullscreen toggle)' },
  { key: 'Ctrl+B Space', description: 'Ganti layout otomatis' },
]

const resizeSteps = [
  {
    label: 'Default',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>pane 0</div>
        <div className={PANE} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '50% | 50%' },
  },
  {
    label: 'Resize →',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 2 }}>pane 0 (lebih lebar)</div>
        <div className={PANE} style={{ flex: 1 }}>pane 1</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '67% | 33%' },
  },
  {
    label: 'Resize ←',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>pane 0</div>
        <div className={PANE} style={{ flex: 2 }}>pane 1 (lebih lebar)</div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash*', right: '33% | 67%' },
  },
  {
    label: 'Zoom (z)',
    render: () => (
      <div className={PANE_ROW} style={{ height: '150px' }}>
        <div className={PANE_ACTIVE} style={{ flex: 1 }}>
          pane 0 (ZOOMED - fullscreen)
        </div>
      </div>
    ),
    statusBar: { left: '[kerja] 0:bash* (zoomed)', right: '100%' },
  },
]

/* ── Section 6: Copy Mode ──────────────────────────────────────── */

const copyModeShortcuts = [
  { key: 'Ctrl+B [', description: 'Masuk ke copy mode' },
  { key: '↑↓←→', description: 'Navigasi dalam copy mode' },
  { key: 'Space', description: 'Mulai seleksi teks' },
  { key: 'Enter', description: 'Copy teks yang diseleksi' },
  { key: 'Ctrl+B ]', description: 'Paste teks yang sudah di-copy' },
  { key: 'q', description: 'Keluar dari copy mode' },
  { key: '/', description: 'Cari teks ke bawah' },
  { key: '?', description: 'Cari teks ke atas' },
  { key: 'g', description: 'Pergi ke baris paling atas' },
  { key: 'G', description: 'Pergi ke baris paling bawah' },
]

const logLines = [
  '[10:01] Server started on port 3000',
  '[10:02] Connected to database',
  '[10:03] GET /api/users 200 12ms',
  '[10:04] POST /api/login 200 45ms',
  '[10:05] GET /api/dashboard 200 23ms',
  '[10:06] WebSocket connection established',
  '[10:07] GET /api/users/42 200 8ms',
  '[10:08] Cache miss: dashboard_stats',
  '[10:09] GET /api/stats 200 156ms',
  '[10:10] Scheduled job: cleanup completed',
]

const copyModeSteps = [
  {
    label: 'Normal Mode',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <span className="text-primary">$ </span>▊
      </div>
    ),
  },
  {
    label: 'Copy Mode',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i} style={i === 4 ? { backgroundColor: 'rgba(59,130,246,0.2)' } : {}}>
            {i === 4 && <span className="text-primary">▶ </span>}
            {line}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: '[0/10]', right: 'Copy mode - ↑↓ untuk scroll' },
  },
  {
    label: 'Seleksi',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div
            key={i}
            style={
              i >= 3 && i <= 5
                ? { backgroundColor: 'rgba(59,130,246,0.3)', color: 'var(--primary)' }
                : {}
            }
          >
            {line}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: '[3 lines selected]', right: 'Enter untuk copy' },
  },
  {
    label: 'Paste',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        <span className="text-primary">$ </span>▊{'\n'}
        <span className="text-muted-foreground"># Ctrl+B ] → teks di-paste:</span>{'\n'}
        <span className="text-primary">[10:04] POST /api/login 200 45ms</span>{'\n'}
        <span className="text-primary">[10:05] GET /api/dashboard 200 23ms</span>{'\n'}
        <span className="text-primary">[10:06] WebSocket connection established</span>
      </div>
    ),
  },
  {
    label: 'Search (/)',
    render: () => (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed" style={{ height: '160px', overflow: 'hidden' }}>
        {logLines.map((line, i) => (
          <div key={i}>
            {line.includes('WebSocket') ? (
              <span>
                [10:06] <span style={{ backgroundColor: 'rgb(59,130,246)', color: '#fff', padding: '0 2px' }}>WebSocket</span> connection established
              </span>
            ) : (
              line
            )}
          </div>
        ))}
      </div>
    ),
    statusBar: { left: 'Search: WebSocket', right: '1 match found' },
  },
]

/* ── Nav Sections Index ────────────────────────────────────────── */

const sections = [
  { id: 'session', title: 'Session' },
  { id: 'window', title: 'Window' },
  { id: 'pane', title: 'Pane' },
  { id: 'navigasi', title: 'Navigasi' },
  { id: 'resize', title: 'Resize' },
  { id: 'copy-mode', title: 'Copy Mode' },
]

/* ── Page Component ────────────────────────────────────────────── */

export default function AboutTmuxPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">About Tmux</h1>
        <p className="mt-1 text-muted-foreground">
          Visual tutorial untuk orchestrasi terminal
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#${id}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              {title}
            </Badge>
          </a>
        ))}
      </nav>

      <SectionCard id="session" title="Session" description="Session adalah unit utama di tmux. Satu session bisa berisi banyak window. Session tetap berjalan di background meskipun kamu sudah keluar dari terminal.">
        <ShortcutTable shortcuts={sessionShortcuts} />
        <TerminalDemo title="Session Management" steps={sessionSteps} />
      </SectionCard>

      <SectionCard id="window" title="Window" description="Window seperti tab di browser. Satu session bisa punya banyak window, dan setiap window menampilkan satu layar terminal penuh.">
        <ShortcutTable shortcuts={windowShortcuts} />
        <TerminalDemo title="Window Management" steps={windowSteps} />
      </SectionCard>

      <SectionCard id="pane" title="Pane" description="Pane membagi satu window menjadi beberapa area. Kamu bisa split secara vertikal (kiri-kanan) atau horizontal (atas-bawah), sehingga bisa menjalankan beberapa perintah sekaligus dalam satu layar.">
        <ShortcutTable shortcuts={paneShortcuts} />
        <TerminalDemo title="Pane Splitting" steps={paneSteps} />
      </SectionCard>

      <SectionCard id="navigasi" title="Navigasi" description="Berpindah antar pane, window, dan session dengan cepat menggunakan shortcut keyboard. Navigasi yang efisien adalah kunci produktivitas di tmux.">
        <ShortcutTable shortcuts={navShortcuts} />
        <TerminalDemo title="Navigasi Pane" steps={navSteps} />
      </SectionCard>

      <SectionCard id="resize" title="Resize" description="Ubah ukuran pane sesuai kebutuhan. Gunakan Ctrl+arrow untuk resize manual, atau zoom untuk fokus di satu pane secara fullscreen.">
        <ShortcutTable shortcuts={resizeShortcuts} />
        <TerminalDemo title="Resize Pane" steps={resizeSteps} />
      </SectionCard>

      <SectionCard id="copy-mode" title="Copy Mode" description="Copy mode memungkinkan kamu scroll ke atas, mencari teks, menyeleksi, dan meng-copy output terminal. Sangat berguna untuk menyalin log atau output perintah yang panjang.">
        <ShortcutTable shortcuts={copyModeShortcuts} />
        <TerminalDemo title="Copy Mode" steps={copyModeSteps} />
      </SectionCard>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders with at least the skeleton**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/frontend/pages/AboutTmuxPage.jsx
git commit -m "feat: rewrite about tmux page with clean styling"
```

---

### Task 9: Delete Old Files

**Files to delete:**
- `src/frontend/hooks/use-sidebar.jsx`
- `src/frontend/components/MatrixRain.jsx`
- `src/frontend/components/Section.jsx`
- `src/frontend/components/ShortcutTable.jsx`
- `src/frontend/components/TerminalSimulator.jsx`
- `src/frontend/components/terminal-styles.js`
- `src/frontend/components/ConfirmModal.jsx`
- `src/frontend/components/TerminalViewerModal.jsx`
- `src/frontend/sections/SessionSection.jsx`
- `src/frontend/sections/WindowSection.jsx`
- `src/frontend/sections/PaneSection.jsx`
- `src/frontend/sections/NavigationSection.jsx`
- `src/frontend/sections/ResizeSection.jsx`
- `src/frontend/sections/CopyModeSection.jsx`
- `src/frontend/pages/KnowledgeBasePage.jsx`

- [ ] **Step 1: Delete old files**

```bash
rm src/frontend/hooks/use-sidebar.jsx
rm src/frontend/components/MatrixRain.jsx
rm src/frontend/components/Section.jsx
rm src/frontend/components/ShortcutTable.jsx
rm src/frontend/components/TerminalSimulator.jsx
rm src/frontend/components/terminal-styles.js
rm src/frontend/components/ConfirmModal.jsx
rm src/frontend/components/TerminalViewerModal.jsx
rm -r src/frontend/sections/
rm src/frontend/pages/KnowledgeBasePage.jsx
```

- [ ] **Step 2: Verify no dangling imports**

Run: `npm run build`
Expected: Build succeeds with zero errors. If there are import errors, fix them (some file still imports a deleted module).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete old frontend files — hacker theme, sections, collapsed sidebar"
```

---

### Task 10: Build Verification + Final Cleanup

**Files:** Various (fix anything broken)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build, zero warnings about missing modules

- [ ] **Step 2: Run backend tests to ensure nothing broke**

Run: `npm test`
Expected: All tests pass (frontend changes should not affect backend tests)

- [ ] **Step 3: Check for any remaining hacker-theme references**

Search for old theme artifacts:
```bash
grep -r "#00ff41\|animate-blink\|MatrixRain\|terminal-styles\|use-sidebar\|phosphor\|text-primary/\|border-primary/" src/frontend/ --include="*.jsx" --include="*.js" --include="*.css"
```
Expected: No matches (all old references removed)

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup — remove remaining hacker theme references"
```

- [ ] **Step 5: Verify with dev server (manual)**

Run: `npm run dev:frontend`
Open browser, check each page visually:
- `/` — clean landing with feature cards
- `/sessions` — clean table (need to be logged in)
- `/agents` — placeholder
- `/about-tmux` — restyled tutorial
- Mobile view (resize browser to <768px) — top bar + hamburger works

# Tailwind + shadcn/ui Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Foreman frontend from CSS Modules to Tailwind CSS + shadcn/ui, keeping all functionality identical.

**Architecture:** Install Tailwind v4 with Vite plugin, configure shadcn/ui for JSX (not TSX), add shadcn primitives (Button, Table, Card, AlertDialog, Alert, Badge, Sidebar), then migrate every component and page file to use Tailwind classes and shadcn components. Delete all CSS Module files at the end.

**Tech Stack:** Tailwind CSS v4, shadcn/ui, lucide-react, class-variance-authority, clsx, tailwind-merge

**Spec:** `docs/superpowers/specs/2026-03-22-tailwind-shadcn-migration-design.md`

---

### Task 1: Install Tailwind v4 + shadcn dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/index.css` (replace existing)
- Create: `src/frontend/lib/utils.js`
- Create: `components.json`
- Create: `jsconfig.json`

- [ ] **Step 1: Install Tailwind v4 with Vite plugin**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Install shadcn dependencies**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 3: Update vite.config.js to add Tailwind plugin**

Replace `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': '/src/frontend',
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9993',
      '/auth/proxy': 'http://localhost:9993',
      '/docs': 'http://localhost:9993',
    },
  },
})
```

- [ ] **Step 4: Create jsconfig.json for path aliases**

Create `jsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/frontend/*"]
    }
  }
}
```

- [ ] **Step 5: Create components.json for shadcn**

Create `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  },
  "tsx": false
}
```

- [ ] **Step 6: Replace src/index.css with Tailwind + shadcn theme**

Replace `src/index.css`:

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
}

:root {
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.556 0 0);
  --sidebar-background: oklch(0.175 0 0);
  --sidebar-foreground: oklch(0.708 0 0);
  --sidebar-primary: oklch(0.985 0 0);
  --sidebar-primary-foreground: oklch(0.205 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 7: Create cn() utility**

Create `src/frontend/lib/utils.js`:

```javascript
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Add dark class to index.html**

In `index.html`, change `<html lang="en">` to `<html lang="en" class="dark">`.

- [ ] **Step 9: Verify build works**

```bash
npm run build
```

Expected: Build succeeds (existing CSS module imports will still work alongside Tailwind).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js jsconfig.json components.json src/index.css src/frontend/lib/utils.js index.html
git commit -m "chore: install Tailwind v4 + shadcn/ui dependencies and config"
```

---

### Task 2: Add shadcn UI primitives

**Files:**
- Create: `src/frontend/components/ui/button.jsx`
- Create: `src/frontend/components/ui/table.jsx`
- Create: `src/frontend/components/ui/card.jsx`
- Create: `src/frontend/components/ui/alert.jsx`
- Create: `src/frontend/components/ui/alert-dialog.jsx`
- Create: `src/frontend/components/ui/badge.jsx`
- Create: `src/frontend/components/ui/sidebar.jsx`
- Create: `src/frontend/components/ui/separator.jsx`
- Create: `src/frontend/components/ui/sheet.jsx`
- Create: `src/frontend/components/ui/skeleton.jsx`
- Create: `src/frontend/components/ui/tooltip.jsx`
- Create: `src/frontend/components/ui/input.jsx`

- [ ] **Step 1: Install additional shadcn dependencies**

```bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-separator @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-slot
```

- [ ] **Step 2: Add shadcn components via CLI**

```bash
npx shadcn@latest add button table card alert alert-dialog badge separator sheet skeleton tooltip input --yes --overwrite
```

If the CLI doesn't work cleanly with the JSX config, we'll create the files manually. The key components are standard shadcn — copy from shadcn source and convert TSX to JSX (remove type annotations).

- [ ] **Step 3: Verify all UI primitive files exist**

```bash
ls src/frontend/components/ui/
```

Expected: button.jsx, table.jsx, card.jsx, alert.jsx, alert-dialog.jsx, badge.jsx, separator.jsx, sheet.jsx, skeleton.jsx, tooltip.jsx, input.jsx

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/frontend/components/ui/
git commit -m "feat: add shadcn/ui primitive components"
```

---

### Task 3: Add shadcn Sidebar primitive

The shadcn Sidebar is a complex component. It may need to be added separately.

**Files:**
- Create: `src/frontend/components/ui/sidebar.jsx` (if not created in Task 2)

- [ ] **Step 1: Add sidebar component**

```bash
npx shadcn@latest add sidebar --yes --overwrite
```

If CLI fails, manually create based on shadcn sidebar source, converted to JSX.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/ui/
git commit -m "feat: add shadcn Sidebar component"
```

---

### Task 4: Migrate Section component

**Files:**
- Modify: `src/frontend/components/Section.jsx`
- Delete: `src/frontend/components/Section.module.css`

- [ ] **Step 1: Rewrite Section.jsx using shadcn Card + Tailwind**

Replace `src/frontend/components/Section.jsx`:

```jsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Section({ id, title, description, children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl">{title}</CardTitle>
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

- [ ] **Step 2: Delete Section.module.css**

```bash
rm src/frontend/components/Section.module.css
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/frontend/components/Section.jsx
git add -u src/frontend/components/Section.module.css
git commit -m "refactor: migrate Section to shadcn Card"
```

---

### Task 5: Migrate ShortcutTable component

**Files:**
- Modify: `src/frontend/components/ShortcutTable.jsx`
- Delete: `src/frontend/components/ShortcutTable.module.css`

- [ ] **Step 1: Rewrite ShortcutTable.jsx using shadcn Table**

Replace `src/frontend/components/ShortcutTable.jsx`:

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
        <TableRow>
          <TableHead>Shortcut</TableHead>
          <TableHead>Keterangan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map(({ key, description }, i) => (
          <TableRow key={i}>
            <TableCell>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm whitespace-nowrap">{key}</code>
            </TableCell>
            <TableCell className="text-muted-foreground">{description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Delete ShortcutTable.module.css**

```bash
rm src/frontend/components/ShortcutTable.module.css
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/ShortcutTable.jsx
git add -u src/frontend/components/ShortcutTable.module.css
git commit -m "refactor: migrate ShortcutTable to shadcn Table"
```

---

### Task 6: Migrate TerminalSimulator component

This is the most complex component. It has CSS classes that are imported directly by section files (`import ts from '../components/TerminalSimulator.module.css'`). We need to replace the CSS module with exported Tailwind class strings.

**Files:**
- Modify: `src/frontend/components/TerminalSimulator.jsx`
- Create: `src/frontend/components/terminal-styles.js` (exported class strings for sections)
- Delete: `src/frontend/components/TerminalSimulator.module.css`

- [ ] **Step 1: Create terminal-styles.js with exported class name constants**

Sections import `ts.paneContainer`, `ts.pane`, `ts.paneActive`, `ts.output`, `ts.prompt`, etc. We create a JS module that exports these as Tailwind class strings, so sections can do `import ts from './terminal-styles.js'` with minimal changes.

Create `src/frontend/components/terminal-styles.js`:

```javascript
const ts = {
  paneContainer: 'flex h-[180px] transition-all duration-300',
  paneContainerVertical: 'flex-col',
  pane: 'flex-1 p-2.5 text-muted-foreground flex items-center justify-center transition-all duration-300 border border-border text-sm',
  paneActive: 'border-primary bg-primary/5',
  output: 'text-muted-foreground whitespace-pre-wrap leading-relaxed',
  prompt: 'text-primary',
}

export default ts
```

- [ ] **Step 2: Rewrite TerminalSimulator.jsx using shadcn Card + Tailwind**

Replace `src/frontend/components/TerminalSimulator.jsx`:

```jsx
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TerminalSimulator({ title, steps }) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]

  return (
    <Card className="my-5 overflow-hidden bg-[#0d1117] font-mono text-sm">
      <div className="flex items-center gap-2 border-b border-border bg-[#161b22] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
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
        <div className="overflow-hidden rounded border border-border">
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

- [ ] **Step 3: Delete TerminalSimulator.module.css**

```bash
rm src/frontend/components/TerminalSimulator.module.css
```

- [ ] **Step 4: Commit**

```bash
git add src/frontend/components/TerminalSimulator.jsx src/frontend/components/terminal-styles.js
git add -u src/frontend/components/TerminalSimulator.module.css
git commit -m "refactor: migrate TerminalSimulator to shadcn Card + Tailwind"
```

---

### Task 7: Migrate all 6 section files

All sections import `ts from '../components/TerminalSimulator.module.css'`. Change this import to `ts from '../components/terminal-styles.js'`. The rest of the section code stays the same since `ts.paneContainer`, `ts.pane`, etc. are now string constants.

Also update the `Section` and component imports to not use file extensions (consistency with alias).

**Files:**
- Modify: `src/frontend/sections/SessionSection.jsx`
- Modify: `src/frontend/sections/WindowSection.jsx`
- Modify: `src/frontend/sections/PaneSection.jsx`
- Modify: `src/frontend/sections/NavigationSection.jsx`
- Modify: `src/frontend/sections/ResizeSection.jsx`
- Modify: `src/frontend/sections/CopyModeSection.jsx`

- [ ] **Step 1: Update imports in all 6 section files**

In each file, change:
```javascript
import ts from '../components/TerminalSimulator.module.css';
```
to:
```javascript
import ts from '../components/terminal-styles.js';
```

The `Section`, `ShortcutTable`, and `TerminalSimulator` imports stay the same. No other changes needed — the `ts.paneContainer`, `ts.output`, `ts.prompt` references now resolve to Tailwind class strings.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/sections/
git commit -m "refactor: update section imports to use terminal-styles.js"
```

---

### Task 8: Migrate ConfirmModal to shadcn AlertDialog

**Files:**
- Modify: `src/frontend/components/ConfirmModal.jsx`
- Delete: `src/frontend/components/ConfirmModal.module.css`

- [ ] **Step 1: Rewrite ConfirmModal.jsx using shadcn AlertDialog**

Replace `src/frontend/components/ConfirmModal.jsx`:

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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>No</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, kill it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Delete ConfirmModal.module.css**

```bash
rm src/frontend/components/ConfirmModal.module.css
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/ConfirmModal.jsx
git add -u src/frontend/components/ConfirmModal.module.css
git commit -m "refactor: migrate ConfirmModal to shadcn AlertDialog"
```

---

### Task 9: Migrate Sidebar to shadcn Sidebar

**Files:**
- Modify: `src/frontend/components/Sidebar.jsx`
- Delete: `src/frontend/components/Sidebar.module.css`

- [ ] **Step 1: Rewrite Sidebar.jsx using shadcn Sidebar**

Replace `src/frontend/components/Sidebar.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import { TerminalSquare, MonitorPlay, BookOpen, FileText, LogOut, LogIn } from 'lucide-react'
import { auth } from '../lib/auth.js'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function Sidebar() {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  return (
    <ShadcnSidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-mono text-lg text-primary">
          <TerminalSquare className="h-5 w-5" />
          foreman
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        {isLoggedIn && (
          <SidebarGroup>
            <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/sessions">
                      <MonitorPlay className="h-4 w-4" />
                      Sessions
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/knowledge-base">
                    <BookOpen className="h-4 w-4" />
                    Knowledge Base
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/docs" target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" />
                    API Docs
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <p className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
        )}
        {isLoggedIn ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.login()}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  )
}
```

- [ ] **Step 2: Delete Sidebar.module.css**

```bash
rm src/frontend/components/Sidebar.module.css
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/Sidebar.jsx
git add -u src/frontend/components/Sidebar.module.css
git commit -m "refactor: migrate Sidebar to shadcn Sidebar"
```

---

### Task 10: Migrate App.jsx and layout

**Files:**
- Modify: `src/frontend/App.jsx`
- Delete: `src/frontend/App.module.css`

- [ ] **Step 1: Rewrite App.jsx with shadcn SidebarProvider**

The shadcn Sidebar needs a `SidebarProvider` wrapper. Replace `src/frontend/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="*"
        element={
          <SidebarProvider>
            <Sidebar />
            <SidebarInset>
              <header className="flex h-12 items-center gap-2 border-b px-4 md:hidden">
                <SidebarTrigger />
              </header>
              <main className="flex-1 p-6 md:p-10">
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
            </SidebarInset>
          </SidebarProvider>
        }
      />
    </Routes>
  )
}

export default App
```

- [ ] **Step 2: Delete App.module.css**

```bash
rm src/frontend/App.module.css
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/App.jsx
git add -u src/frontend/App.module.css
git commit -m "refactor: migrate App layout to shadcn SidebarProvider"
```

---

### Task 11: Migrate pages

**Files:**
- Modify: `src/frontend/pages/HomePage.jsx`
- Modify: `src/frontend/pages/SessionsPage.jsx`
- Modify: `src/frontend/pages/KnowledgeBasePage.jsx`
- Modify: `src/frontend/pages/CallbackPage.jsx`
- Delete: `src/frontend/pages/HomePage.module.css`
- Delete: `src/frontend/pages/SessionsPage.module.css`

- [ ] **Step 1: Rewrite HomePage.jsx**

Replace `src/frontend/pages/HomePage.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { TerminalSquare } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <TerminalSquare className="mb-4 h-12 w-12 text-primary" />
      <h1 className="mb-3 font-mono text-4xl font-bold">Foreman</h1>
      <p className="mb-8 text-lg text-muted-foreground">Tmux REST API & workforce manager</p>
      <Button size="lg" onClick={() => auth.login()}>
        Login
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite SessionsPage.jsx**

Replace `src/frontend/pages/SessionsPage.jsx`:

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
import ConfirmModal from '../components/ConfirmModal.jsx'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [killTarget, setKillTarget] = useState(null)

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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-mono text-2xl font-bold">Sessions</h2>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions.length === 0 && !loading ? (
        <p className="py-10 text-center text-muted-foreground">No active sessions</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Windows</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-mono">{s.name}</TableCell>
                <TableCell>{s.windows}</TableCell>
                <TableCell>{formatDate(s.created)}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setKillTarget(s.name)}
                  >
                    Kill
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {killTarget && (
        <ConfirmModal
          title="Kill Session"
          message={`Are you sure you want to kill session "${killTarget}"?`}
          onConfirm={handleKill}
          onCancel={() => setKillTarget(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite KnowledgeBasePage.jsx**

Replace `src/frontend/pages/KnowledgeBasePage.jsx`:

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
        <h2 className="mb-2 font-mono text-2xl font-bold">Tmux Knowledge Base</h2>
        <p className="text-muted-foreground">Visual tutorial untuk orchestrasi terminal</p>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2">
        {sections.map(({ id, title }) => (
          <a key={id} href={`#${id}`}>
            <Badge variant="outline">{title}</Badge>
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

- [ ] **Step 4: Rewrite CallbackPage.jsx**

Replace `src/frontend/pages/CallbackPage.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/auth.js'

export default function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    auth.handleCallback()
      .then(() => navigate('/sessions', { replace: true }))
      .catch((err) => {
        console.error('Auth callback failed:', err)
        navigate('/', { replace: true })
      })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Logging in...
    </div>
  )
}
```

- [ ] **Step 5: Delete old CSS module files**

```bash
rm src/frontend/pages/HomePage.module.css src/frontend/pages/SessionsPage.module.css
```

- [ ] **Step 6: Commit**

```bash
git add src/frontend/pages/
git add -u src/frontend/pages/
git commit -m "refactor: migrate all pages to Tailwind + shadcn"
```

---

### Task 12: Build, test, and verify

- [ ] **Step 1: Run backend tests**

```bash
npm test
```

Expected: ALL 43 PASS (backend unchanged)

- [ ] **Step 2: Build frontend**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Verify no remaining CSS module imports**

```bash
grep -r "module.css" src/frontend/ || echo "No CSS module imports found - clean!"
```

Expected: No CSS module imports found

- [ ] **Step 4: Verify no remaining CSS module files**

```bash
find src/frontend -name "*.module.css" || echo "No CSS module files found - clean!"
```

Expected: No CSS module files found

- [ ] **Step 5: Commit if needed**

```bash
git add -A
git status
# Only commit if there are changes
git diff --cached --quiet || git commit -m "chore: final cleanup for Tailwind + shadcn migration"
```

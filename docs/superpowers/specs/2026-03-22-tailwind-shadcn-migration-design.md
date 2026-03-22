# Tailwind + shadcn/ui Full Migration — Design Spec

## Overview

Migrate Foreman frontend from CSS Modules + custom CSS to Tailwind CSS + shadcn/ui components. All functionality remains identical. shadcn default dark theme replaces the custom terminal theme.

## Goals

1. Replace all CSS Modules with Tailwind utility classes
2. Replace custom components with shadcn/ui equivalents
3. Use shadcn default dark theme
4. Keep all functionality, routing, auth, and content unchanged
5. Zero backend changes

## Stack Changes

**Add:**
- Tailwind CSS v4
- shadcn/ui
- `lucide-react` (icons for shadcn)
- `tailwind-merge` (shadcn dependency)
- `clsx` (shadcn dependency)
- `class-variance-authority` (shadcn dependency)

**Remove:**
- All `*.module.css` files
- Custom `src/index.css` (replaced with Tailwind globals)

## Component Mapping

| Current Component | shadcn Replacement |
|---|---|
| Custom Sidebar (`Sidebar.jsx` + `Sidebar.module.css`) | shadcn `Sidebar` (collapsible, responsive, icon support) |
| ConfirmModal (`ConfirmModal.jsx` + `ConfirmModal.module.css`) | shadcn `AlertDialog` |
| Sessions table (custom `<table>` in `SessionsPage.jsx`) | shadcn `Table` |
| All buttons (Refresh, Kill, Login, Logout) | shadcn `Button` with variants |
| ShortcutTable (`ShortcutTable.jsx` + `ShortcutTable.module.css`) | shadcn `Table` |
| TerminalSimulator (`TerminalSimulator.jsx` + `TerminalSimulator.module.css`) | shadcn `Card` + Tailwind classes for terminal styling |
| Section wrapper (`Section.jsx` + `Section.module.css`) | shadcn `Card` |
| Error display (custom `.error` div) | shadcn `Alert` (destructive variant) |
| KB section nav (inline styled `<a>` tags) | shadcn `Badge` as anchor links |

## Theme

shadcn default dark theme. Standard shadcn CSS variables defined in `src/index.css`. No custom terminal green accent — use shadcn's built-in color system.

## File Changes

### Delete
- `src/frontend/components/Sidebar.module.css`
- `src/frontend/components/ConfirmModal.module.css`
- `src/frontend/components/TerminalSimulator.module.css`
- `src/frontend/components/ShortcutTable.module.css`
- `src/frontend/components/Section.module.css`
- `src/frontend/pages/SessionsPage.module.css`
- `src/frontend/pages/HomePage.module.css`
- `src/frontend/App.module.css`

### Create
- `src/index.css` — Tailwind directives + shadcn dark theme CSS variables
- `components.json` — shadcn CLI config
- `tailwind.config.js` — Tailwind config with shadcn paths
- `src/frontend/lib/utils.js` — `cn()` helper (clsx + tailwind-merge)
- `src/frontend/components/ui/sidebar.jsx` — shadcn Sidebar primitive
- `src/frontend/components/ui/button.jsx` — shadcn Button
- `src/frontend/components/ui/table.jsx` — shadcn Table
- `src/frontend/components/ui/alert-dialog.jsx` — shadcn AlertDialog
- `src/frontend/components/ui/alert.jsx` — shadcn Alert
- `src/frontend/components/ui/card.jsx` — shadcn Card
- `src/frontend/components/ui/badge.jsx` — shadcn Badge

### Rewrite (same functionality, Tailwind classes)
- `src/frontend/App.jsx` — remove CSS Module import, use Tailwind layout classes
- `src/frontend/components/Sidebar.jsx` — rewrite using shadcn Sidebar
- `src/frontend/components/ConfirmModal.jsx` — rewrite using shadcn AlertDialog
- `src/frontend/components/ShortcutTable.jsx` — rewrite using shadcn Table
- `src/frontend/components/TerminalSimulator.jsx` — rewrite using shadcn Card + Tailwind
- `src/frontend/components/Section.jsx` — rewrite using shadcn Card
- `src/frontend/pages/HomePage.jsx` — rewrite with Tailwind classes + shadcn Button
- `src/frontend/pages/SessionsPage.jsx` — rewrite with shadcn Table, Button, Alert, AlertDialog
- `src/frontend/pages/KnowledgeBasePage.jsx` — rewrite with shadcn Badge for nav
- `src/frontend/pages/CallbackPage.jsx` — rewrite with Tailwind classes
- `src/frontend/sections/SessionSection.jsx` — update component usage
- `src/frontend/sections/WindowSection.jsx` — update component usage
- `src/frontend/sections/PaneSection.jsx` — update component usage
- `src/frontend/sections/NavigationSection.jsx` — update component usage
- `src/frontend/sections/ResizeSection.jsx` — update component usage
- `src/frontend/sections/CopyModeSection.jsx` — update component usage

### Unchanged
- `src/frontend/lib/auth.js`
- `src/frontend/lib/api.js`
- `src/frontend/components/ProtectedRoute.jsx`
- `src/frontend/main.jsx`
- All backend files
- All test files

## Vite Config

Update `vite.config.js` to include Tailwind CSS plugin if needed for v4.

## Out of Scope

- New features or pages
- Backend changes
- Content changes
- Auth flow changes
- Adding TypeScript

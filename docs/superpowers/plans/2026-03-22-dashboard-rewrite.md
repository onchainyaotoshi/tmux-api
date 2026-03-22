# Dashboard Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Foreman frontend from static tutorial into authenticated dashboard with session management, keeping tutorial content as Knowledge Base.

**Architecture:** React SPA with react-router-dom for routing, @yaotoshi/auth-sdk for OAuth 2.0 PKCE auth guard. Backend auth plugin extended to support Bearer token validation alongside existing API key auth. Sidebar navigation with three sections: Sessions (dashboard), Knowledge Base (existing tutorials), API Docs (external link).

**Tech Stack:** React 19, React Router DOM, @yaotoshi/auth-sdk, Fastify, Vitest, CSS Modules

**Spec:** `docs/superpowers/specs/2026-03-22-dashboard-rewrite-design.md`

---

### Task 1: Install dependencies and update .env.example

**Files:**
- Modify: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Install new dependencies**

Run:
```bash
npm install react-router-dom @yaotoshi/auth-sdk
```

- [ ] **Step 2: Create .env.example**

```env
# Backend
API_KEY=your-api-key-here
PORT=9993
SWAGGER_ENABLED=true
AUTH_ACCOUNTS_URL=http://localhost:9999

# Frontend (Vite)
VITE_AUTH_CLIENT_ID=your-client-id
VITE_AUTH_ACCOUNTS_URL=http://localhost:9999
VITE_AUTH_REDIRECT_URI=http://localhost:5173/callback
VITE_AUTH_POST_LOGOUT_URI=http://localhost:5173
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add react-router-dom and auth-sdk dependencies"
```

---

### Task 2: Backend — Dual auth (API key + Bearer token)

**Files:**
- Modify: `src/server/plugins/auth.js`
- Modify: `src/server/index.js` (pass new option)
- Test: `tests/plugins/auth.test.js`

- [ ] **Step 1: Write failing tests for Bearer token auth**

Add these tests to `tests/plugins/auth.test.js`:

```javascript
import { vi } from 'vitest'

// At the top of the file, add a mock for global fetch
// Update buildApp to accept authAccountsUrl option:
async function buildApp(apiKey, authAccountsUrl) {
  const app = Fastify()
  await app.register(authPlugin, { apiKey, authAccountsUrl })
  app.get('/api/test', async () => ({ ok: true }))
  app.get('/health', async () => ({ ok: true }))
  return app
}

// New describe block:
describe('authPlugin — Bearer token', () => {
  let app

  beforeEach(async () => {
    app = await buildApp('test-key-123', 'http://accounts.test')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.fetch
  })

  it('should allow /api/* with valid Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sub: 'user-1', email: 'test@example.com' }),
    })

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith('http://accounts.test/me', {
      headers: { authorization: 'Bearer valid-token' },
    })
  })

  it('should reject /api/* with invalid Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer invalid-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should reject /api/* when accounts service is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: { authorization: 'Bearer some-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should prefer API key when both are provided', async () => {
    global.fetch = vi.fn()

    const res = await app.inject({
      method: 'GET', url: '/api/test',
      headers: {
        'x-api-key': 'test-key-123',
        authorization: 'Bearer some-token',
      },
    })
    expect(res.statusCode).toBe(200)
    // fetch should NOT be called since API key was valid
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: FAIL — Bearer token tests fail because auth plugin only checks API key.

- [ ] **Step 3: Implement dual auth in auth plugin**

Update `src/server/plugins/auth.js`:

```javascript
import fp from 'fastify-plugin'

async function auth(fastify, opts) {
  const apiKey = opts.apiKey
  const authAccountsUrl = opts.authAccountsUrl

  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return

    // Try API key first
    const providedKey = request.headers['x-api-key']
    if (providedKey && providedKey === apiKey) return

    // Try Bearer token
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ') && authAccountsUrl) {
      try {
        const res = await fetch(`${authAccountsUrl}/me`, {
          headers: { authorization: authHeader },
        })
        if (res.ok) return
      } catch {
        // Fall through to 401
      }
    }

    reply.code(401).send({ success: false, error: 'Missing or invalid API key' })
  })
}

export const authPlugin = fp(auth, { name: 'auth' })
```

- [ ] **Step 4: Update index.js to pass AUTH_ACCOUNTS_URL**

In `src/server/index.js`, add after line 18:

```javascript
const AUTH_ACCOUNTS_URL = process.env.AUTH_ACCOUNTS_URL
```

Update the auth plugin registration (line 42) to:

```javascript
await app.register(authPlugin, { apiKey: API_KEY, authAccountsUrl: AUTH_ACCOUNTS_URL })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/plugins/auth.test.js`
Expected: ALL PASS

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/server/plugins/auth.js src/server/index.js tests/plugins/auth.test.js
git commit -m "feat: add Bearer token auth alongside API key"
```

---

### Task 3: Frontend — Auth library and API helper

**Files:**
- Create: `src/frontend/lib/auth.js`
- Create: `src/frontend/lib/api.js`

- [ ] **Step 1: Create auth singleton**

Create `src/frontend/lib/auth.js`:

```javascript
import { YaotoshiAuth } from '@yaotoshi/auth-sdk'

export const auth = new YaotoshiAuth({
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI,
  postLogoutRedirectUri: import.meta.env.VITE_AUTH_POST_LOGOUT_URI,
  accountsUrl: import.meta.env.VITE_AUTH_ACCOUNTS_URL,
  scopes: ['openid', 'email'],
})
```

- [ ] **Step 2: Create API helper**

Create `src/frontend/lib/api.js`:

```javascript
import { auth } from './auth.js'

const API_BASE = '/api'

export async function apiFetch(path, options = {}) {
  const token = auth.getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/lib/auth.js src/frontend/lib/api.js
git commit -m "feat: add auth singleton and API helper"
```

---

### Task 4: Frontend — ProtectedRoute and CallbackPage

**Files:**
- Create: `src/frontend/components/ProtectedRoute.jsx`
- Create: `src/frontend/pages/CallbackPage.jsx`

- [ ] **Step 1: Create ProtectedRoute**

Create `src/frontend/components/ProtectedRoute.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { auth } from '../lib/auth.js'

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated()) {
      setReady(true)
    } else {
      auth.login()
    }
  }, [])

  if (!ready) return null

  return children
}
```

- [ ] **Step 2: Create CallbackPage**

Create `src/frontend/pages/CallbackPage.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/auth.js'

export default function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    auth.handleCallback()
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        console.error('Auth callback failed:', err)
        navigate('/', { replace: true })
      })
  }, [navigate])

  return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Logging in...</div>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/ProtectedRoute.jsx src/frontend/pages/CallbackPage.jsx
git commit -m "feat: add ProtectedRoute and CallbackPage"
```

---

### Task 5: Frontend — ConfirmModal component

**Files:**
- Create: `src/frontend/components/ConfirmModal.jsx`
- Create: `src/frontend/components/ConfirmModal.module.css`

- [ ] **Step 1: Create modal CSS**

Create `src/frontend/components/ConfirmModal.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  min-width: 360px;
  max-width: 480px;
}

.title {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.message {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 20px;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: pointer;
  font-size: 0.9rem;
  font-family: var(--font-sans);
}

.btnCancel {
  background: transparent;
  color: var(--text-secondary);
}

.btnCancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.btnDanger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btnDanger:hover {
  background: #c82333;
}
```

- [ ] **Step 2: Create modal component**

Create `src/frontend/components/ConfirmModal.jsx`:

```jsx
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
            No
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onConfirm}>
            Yes, kill it
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/ConfirmModal.jsx src/frontend/components/ConfirmModal.module.css
git commit -m "feat: add ConfirmModal component"
```

---

### Task 6: Frontend — SessionsPage

**Files:**
- Create: `src/frontend/pages/SessionsPage.jsx`
- Create: `src/frontend/pages/SessionsPage.module.css`

- [ ] **Step 1: Create sessions page CSS**

Create `src/frontend/pages/SessionsPage.module.css`:

```css
.container {
  max-width: 800px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header h2 {
  font-size: 1.5rem;
  font-family: var(--font-mono);
  color: var(--accent);
}

.refreshBtn {
  padding: 8px 16px;
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.refreshBtn:hover {
  background: rgba(0, 255, 65, 0.1);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 2px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.sessionName {
  font-family: var(--font-mono);
  color: var(--accent);
}

.killBtn {
  padding: 6px 14px;
  background: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.killBtn:hover {
  background: rgba(220, 53, 69, 0.1);
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}

.error {
  color: #dc3545;
  padding: 16px;
  border: 1px solid #dc3545;
  border-radius: 4px;
  margin-bottom: 16px;
}
```

- [ ] **Step 2: Create sessions page component**

Create `src/frontend/pages/SessionsPage.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import styles from './SessionsPage.module.css'

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Sessions</h2>
        <button className={styles.refreshBtn} onClick={fetchSessions} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {sessions.length === 0 && !loading ? (
        <div className={styles.empty}>No active sessions</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Windows</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.name}>
                <td className={styles.sessionName}>{s.name}</td>
                <td>{s.windows}</td>
                <td>{formatDate(s.created)}</td>
                <td>
                  <button className={styles.killBtn} onClick={() => setKillTarget(s.name)}>
                    Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

- [ ] **Step 3: Commit**

```bash
git add src/frontend/pages/SessionsPage.jsx src/frontend/pages/SessionsPage.module.css
git commit -m "feat: add SessionsPage with kill confirmation"
```

---

### Task 7: Frontend — KnowledgeBasePage

**Files:**
- Create: `src/frontend/pages/KnowledgeBasePage.jsx`

- [ ] **Step 1: Create KnowledgeBasePage**

Create `src/frontend/pages/KnowledgeBasePage.jsx`:

```jsx
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
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '1.5rem', marginBottom: '8px' }}>
          Tmux Knowledge Base
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visual tutorial untuk orchestrasi terminal
        </p>
      </div>
      <nav style={{ marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {sections.map(({ id, title }) => (
          <a
            key={id}
            href={`#${id}`}
            style={{
              color: 'var(--accent-dim)',
              textDecoration: 'none',
              padding: '4px 12px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            {title}
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

- [ ] **Step 2: Commit**

```bash
git add src/frontend/pages/KnowledgeBasePage.jsx
git commit -m "feat: add KnowledgeBasePage wrapping tutorial sections"
```

---

### Task 8: Frontend — Rewrite Sidebar for dashboard navigation

**Files:**
- Modify: `src/frontend/components/Sidebar.jsx`
- Modify: `src/frontend/components/Sidebar.module.css`

- [ ] **Step 1: Rewrite Sidebar component**

Replace `src/frontend/components/Sidebar.jsx` with:

```jsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../lib/auth.js'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const user = auth.getUser()

  const handleClick = () => setIsOpen(false)

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}
      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>$ foreman</div>

        <div className={styles.groupLabel}>Dashboard</div>
        <ul className={styles.nav}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={handleClick}
            >
              Sessions
            </NavLink>
          </li>
        </ul>

        <div className={styles.groupLabel}>Resources</div>
        <ul className={styles.nav}>
          <li>
            <NavLink
              to="/knowledge-base"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={handleClick}
            >
              Knowledge Base
            </NavLink>
          </li>
          <li>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navItem}
            >
              API Docs ↗
            </a>
          </li>
        </ul>

        <div className={styles.bottom}>
          {user && (
            <div className={styles.userInfo}>{user.email}</div>
          )}
          <button className={styles.logoutBtn} onClick={() => auth.logout()}>
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Add bottom section styles to Sidebar.module.css**

Append to `src/frontend/components/Sidebar.module.css`:

```css
.bottom {
  margin-top: auto;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.userInfo {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logoutBtn {
  width: 100%;
  padding: 8px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: var(--font-sans);
}

.logoutBtn:hover {
  color: #dc3545;
  border-color: #dc3545;
}
```

Also update the `.sidebar` rule to use flexbox column so `.bottom` is pushed to the bottom:

Change in existing `.sidebar`:
```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 30px 0;
  overflow-y: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/components/Sidebar.jsx src/frontend/components/Sidebar.module.css
git commit -m "feat: rewrite Sidebar for dashboard navigation with auth"
```

---

### Task 9: Frontend — Rewrite App.jsx with React Router

**Files:**
- Modify: `src/frontend/App.jsx`
- Modify: `src/frontend/App.module.css`
- Modify: `src/frontend/main.jsx`

- [ ] **Step 1: Rewrite main.jsx to include BrowserRouter**

Replace `src/frontend/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '../index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Rewrite App.jsx with routes**

Replace `src/frontend/App.jsx` with:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import styles from './App.module.css'

function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <div className={styles.layout}>
              <Sidebar />
              <main className={styles.main}>
                <Routes>
                  <Route path="/" element={<SessionsPage />} />
                  <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
```

- [ ] **Step 3: Update App.module.css**

Replace `src/frontend/App.module.css` with:

```css
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 40px 60px;
}

@media (max-width: 768px) {
  .main {
    margin-left: 0;
    padding: 20px;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/frontend/main.jsx src/frontend/App.jsx src/frontend/App.module.css
git commit -m "feat: rewrite App with React Router and auth guard"
```

---

### Task 10: Vite proxy config for development

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Add API proxy to vite config**

Replace `vite.config.js` with:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9993',
      '/docs': 'http://localhost:9993',
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.js
git commit -m "chore: add API proxy to vite dev config"
```

---

### Task 11: Build, test, and verify

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 2: Build frontend**

Run: `npm run build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 3: Manual smoke test**

1. Start server: `npm run dev:server`
2. Start frontend: `npm run dev:frontend`
3. Open `http://localhost:5173` — should redirect to accounts login
4. After login — should see Sessions page with sidebar
5. Click Knowledge Base — should show tutorials
6. API Docs link — should open Swagger in new tab

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete dashboard rewrite with auth guard and session management"
```

# Foreman Dashboard Rewrite — Design Spec

## Overview

Rewrite the Foreman frontend from a static tmux tutorial site into a functional dashboard with session management, auth guard, and knowledge base. The existing tutorial content is preserved under a Knowledge Base route.

## Goals

1. Authenticated dashboard for managing tmux sessions (list + kill with confirmation)
2. Auth guard using `@yaotoshi/auth-sdk` (OAuth 2.0 PKCE)
3. Backend dual auth: Bearer token (frontend) + API key (external clients)
4. Keep tmux tutorial content as Knowledge Base
5. Keep Swagger API docs at `/docs` (external link from sidebar)

## Architecture

### Frontend

**Tech:** React 19, React Router DOM, `@yaotoshi/auth-sdk`, CSS Modules (existing dark theme)

**Routes:**

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | `SessionsPage` | Yes |
| `/knowledge-base` | `KnowledgeBasePage` | Yes |
| `/callback` | `CallbackPage` | No |

**Layout:**
- Persistent left sidebar with navigation: Sessions, Knowledge Base, API Docs (external link to `/docs`), Logout
- User email displayed at bottom of sidebar
- Main content area renders active route

**Auth flow:**
1. App initializes `YaotoshiAuth` with env vars
2. `ProtectedRoute` wrapper checks `auth.isAuthenticated()`
3. If not authenticated → `auth.login()` (redirects to accounts service)
4. `/callback` route calls `auth.handleCallback()`, stores token, redirects to `/`
5. Logout button calls `auth.logout()`

**Sessions page:**
- On mount, fetch `GET /api/sessions` with `Authorization: Bearer <access_token>`
- Display table: session name, number of windows, created date
- Each row has a red "Kill" button
- Clicking Kill opens a confirmation modal: "Are you sure you want to kill session {name}?"
- "Yes" sends `DELETE /api/sessions/:name` with Bearer token
- "No" closes modal
- Manual "Refresh" button to re-fetch sessions

**Knowledge Base page:**
- Renders all 6 existing tutorial sections as-is (SessionSection, WindowSection, PaneSection, NavigationSection, ResizeSection, CopyModeSection)
- Inline anchor-link navigation at the top for jumping between sections (IntersectionObserver no longer needed since sidebar now handles page-level routing, not section-level)

### Backend

**Auth plugin changes (`src/server/plugins/auth.js`):**

Current behavior: all `/api/*` routes require `X-API-Key` header.

New behavior: a request is authenticated if **either**:
1. `X-API-Key` header matches `API_KEY` env var, OR
2. `Authorization: Bearer <token>` header is present AND validated against accounts service `GET /me`

Token validation flow:
1. Extract token from `Authorization` header
2. Call accounts service `GET /me` with `Authorization: Bearer <token>`
3. If accounts returns 200 with user data → authenticated
4. If accounts returns 401/error → reject with 401

The accounts service URL comes from `AUTH_ACCOUNTS_URL` env var.

**No other backend changes required.** Existing session CRUD routes remain as-is.

### Environment Variables

**Backend (`.env`):**
```
API_KEY=<required, existing>
PORT=9993
SWAGGER_ENABLED=true
AUTH_ACCOUNTS_URL=<required, accounts service base URL>
```

**Frontend (Vite, also in `.env`):**
```
VITE_AUTH_CLIENT_ID=<oauth client id>
VITE_AUTH_ACCOUNTS_URL=<accounts service url>
VITE_AUTH_REDIRECT_URI=<callback url, e.g. https://foreman.yaotoshi.xyz/callback>
VITE_AUTH_POST_LOGOUT_URI=<post logout url, e.g. https://foreman.yaotoshi.xyz>
```

A `.env.example` file will document all variables.

### New Dependencies

- `react-router-dom` — client-side routing
- `@yaotoshi/auth-sdk` — OAuth 2.0 PKCE auth

### Files to Create/Modify

**New files:**
- `src/frontend/pages/SessionsPage.jsx` — sessions dashboard
- `src/frontend/pages/SessionsPage.module.css`
- `src/frontend/pages/KnowledgeBasePage.jsx` — wraps existing tutorial sections
- `src/frontend/pages/CallbackPage.jsx` — OAuth callback handler
- `src/frontend/components/ProtectedRoute.jsx` — auth guard wrapper
- `src/frontend/components/ConfirmModal.jsx` — yes/no confirmation modal
- `src/frontend/components/ConfirmModal.module.css`
- `src/frontend/lib/auth.js` — YaotoshiAuth singleton instance
- `src/frontend/lib/api.js` — API helper (fetch with Bearer token)
- `.env.example`

**Modified files:**
- `src/frontend/App.jsx` — replace with React Router setup
- `src/frontend/App.module.css` — update layout styles
- `src/frontend/components/Sidebar.jsx` — rewrite for new navigation (Sessions, KB, API Docs, Logout)
- `src/frontend/components/Sidebar.module.css` — update styles
- `src/server/plugins/auth.js` — add Bearer token validation

**Unchanged:**
- All 6 section files in `src/frontend/sections/`
- `src/frontend/components/Section.jsx`
- `src/frontend/components/ShortcutTable.jsx`
- `src/frontend/components/TerminalSimulator.jsx`
- All backend route files
- `src/server/services/tmux.js`

## Testing

- Update `tests/plugins/auth.test.js` to cover Bearer token validation
- Frontend: manual testing via browser (no frontend test framework currently)

## Out of Scope

- Worker abstraction layer (`/api/workers`) — future feature
- Per-user access control
- Create/edit sessions from GUI
- Send keys from GUI
- Frontend unit tests

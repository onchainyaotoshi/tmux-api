# Session Terminal Viewer — Design Spec

**Date:** 2026-03-22
**Status:** Draft

## Overview

Add a "View" button to the Sessions page that opens a modal showing live terminal output. The modal includes dropdown selectors for window and pane, allowing users to view output from any pane in the session.

## User Flow

1. User clicks **View** button on a session row
2. Modal opens, fetches windows for that session
3. Window dropdown populated, defaults to first window in the list (not necessarily index 0)
4. Pane dropdown populated from selected window, defaults to first pane in the list
5. Terminal output auto-fetched and displayed for default selection
6. User can switch window/pane via dropdowns → output updates
7. User can click **Refresh** to re-fetch current output
8. Close modal via X button or clicking outside

## UI Design

```
┌──────────────────────────────────────────┐
│ Session: my-session                 [X]  │
│                                          │
│ Window: [▼ 0: bash ]  Pane: [▼ 0]       │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ $ echo hello                         │ │
│ │ hello                                │ │
│ │ $                                    │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                             [Refresh]    │
└──────────────────────────────────────────┘
```

### Modal specs
- Uses shadcn **Dialog** component (needs to be added via `npx shadcn@latest add dialog`)
- Also needs shadcn **Select** component (`npx shadcn@latest add select`)
- Modal width: `max-w-4xl` for comfortable terminal viewing
- Terminal output area: `<pre>` with monospace font, dark background (`bg-zinc-950`), max-height with overflow scroll, rounded corners

### Dropdowns
- **Window dropdown:** Shows `{index}: {name}` (e.g., "0: bash", "1: vim"). Fetched from `GET /api/sessions/:session/windows`
- **Pane dropdown:** Shows pane index (e.g., "0", "1"). Fetched from `GET /api/sessions/:session/windows/:window/panes`
- Changing window resets pane to first in list and re-fetches panes list + output
- Changing pane re-fetches output
- Dropdowns disabled while their data is loading

### Terminal output
- Fetched from `GET /api/sessions/:session/windows/:window/panes/:index/capture`
- Displayed in `<pre className="font-mono text-sm bg-zinc-950 text-zinc-100 p-4 rounded-lg max-h-[60vh] overflow-auto">`
- Shows loading skeleton while fetching
- Shows error message if capture fails

## API Endpoints Used (existing, no backend changes)

| Endpoint | Purpose |
|---|---|
| `GET /api/sessions/:session/windows` | List windows for dropdown |
| `GET /api/sessions/:session/windows/:window/panes` | List panes for dropdown |
| `GET /api/sessions/:session/windows/:window/panes/:index/capture` | Capture terminal output |

## New Components

### `TerminalViewerModal` (`src/frontend/components/TerminalViewerModal.jsx`)
- Props: `sessionName`, `onClose`
- Render pattern: conditional render from parent (same as ConfirmModal). Parent mounts/unmounts:
  ```jsx
  const [viewTarget, setViewTarget] = useState(null)
  {viewTarget && <TerminalViewerModal sessionName={viewTarget} onClose={() => setViewTarget(null)} />}
  ```
- State: `windows`, `selectedWindow`, `panes`, `selectedPane`, `output`, `loading`, `error`
- On mount: fetch windows → set default (first in list) → fetch panes → fetch output
- On window change: fetch panes → reset pane to first → fetch output
- On pane change: fetch output
- On refresh click: fetch output
- Guard `apiFetch` returns: if `res` is undefined (401 redirect), bail out early

### Response data shapes

`apiFetch()` returns the full envelope `{ success, data }`. Extract `.data` from each call:

- **Windows list** (`res.data`): `[{ index, name, panes, active }, ...]`
- **Panes list** (`res.data`): `[{ index, width, height, active }, ...]`
- **Capture output** (`res.data.content`): string — note: content is nested inside `data`, so access via `res.data.content`

Example fetch for capture:
```js
const res = await apiFetch(`/sessions/${sessionName}/windows/${selectedWindow}/panes/${selectedPane}/capture`)
if (!res) return
setOutput(res.data.content)
```

## New shadcn Components Needed

- `dialog` — modal container
- `select` — window/pane dropdowns

## Files Changed

| File | Change |
|---|---|
| `src/frontend/components/TerminalViewerModal.jsx` | New component |
| `src/frontend/components/ui/dialog.jsx` | New (shadcn add) |
| `src/frontend/components/ui/select.jsx` | New (shadcn add) |
| `src/frontend/pages/SessionsPage.jsx` | Add View button + modal state |

## Edge Cases

- **Session with no windows:** Show message "No windows found" in modal
- **Window with no panes:** Show message "No panes found"
- **Capture fails (session died):** Show error in output area, don't crash modal
- **Empty output:** Show empty terminal area (no special message needed)
- **Long output:** Scroll via `overflow-auto` + `max-h-[60vh]`, auto-scroll to bottom on fetch

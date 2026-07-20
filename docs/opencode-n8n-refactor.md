# n8n Integration Refactoring Brief

## Goal

Remove n8n as a standalone sidebar navigation item. Move all n8n functionality
(settings editing, workflow list, embedded editor) into the "Externe Verbindungen"
(VerbindungenView) as a split-panel detail view.

## Current State

- `Sidebar.tsx`: has `'n8n'` in `CategoryKey` union and `CATEGORIES` array (line 16, 37)
- `App.tsx`: imports `N8nView` (line 13), renders it at `category === 'n8n'` (line 88),
  passes `onOpenN8n={() => setCategory('n8n')}` to VerbindungenView (line 87)
- `N8nView.tsx`: standalone component with 3 tabs (Editor/Workflows/Settings)
- `VerbindungenView.tsx`: has `onOpenN8n` prop, n8n connections show "Editor" button
- `api.ts`: has n8n API functions (fetchN8nConfig, updateN8nConfig, testN8nConnection, fetchN8nWorkflows)
- `i18n.ts`: has `nav.n8n`, `nav.n8n.hint`, and `n8n.*` keys
- Backend: `n8n_routes.py` at `/api/n8n` with config/test/workflows endpoints (NO CHANGES NEEDED)

## Required Changes

### 1. Sidebar.tsx
- Remove `'n8n'` from `CategoryKey` type union
- Remove the n8n entry from `CATEGORIES` array
- Remove `Workflow` from lucide-react import if no longer used

### 2. App.tsx
- Remove `import N8nView from './components/N8nView'`
- Remove `{category === 'n8n' && <N8nView />}` line
- Remove `onOpenN8n` prop from VerbindungenView usage

### 3. VerbindungenView.tsx — MAJOR REFACTOR
- Remove `onOpenN8n` prop (no longer needed)
- Add n8n management as an inline split-panel detail view
- When a connection with `template_key === 'n8n'` is clicked, show a detail panel
  on the right side (or inline expanded section) with tabs:
  - **Editor**: iframe pointing to n8n base_url (from config)
  - **Workflows**: list of n8n workflows (fetchN8nWorkflows)
  - **Settings**: n8n config form (base_url, api_key, webhook_url, aktiv, test button)
- The n8n connection card should have buttons:
  - "Editor" / "Workflows" / "Einstellungen" (opens inline panel)
  - "In neuem Tab öffnen" (external link to n8n base_url)
- Import n8n API functions from '../api'
- Manage n8n config state, workflows state, test result state
- The detail panel should use the existing `.view` + `.view-header` pattern
- Layout: left column = connections list, right column = n8n detail (when selected)

### 4. N8nView.tsx
- Can be DELETED entirely (its logic moves into VerbindungenView)
- Or kept as a sub-component imported by VerbindungenView if cleaner

### 5. i18n.ts
- Remove `nav.n8n` and `nav.n8n.hint` keys (no longer in sidebar)
- Keep all `n8n.*` keys (still used in VerbindungenView)
- Add new keys if needed for the split-panel labels

### 6. app.css
- Add styles for the split-panel layout in VerbindungenView
- Reuse existing n8n CSS classes where possible
- The detail panel should be scrollable and responsive

### 7. Version bump to 0.1.5
- `frontend/package.json`: "version": "0.1.5"
- `frontend/src/components/Sidebar.tsx`: v0.1.5 in brand area
- `frontend/tests/02-login.spec.ts`: update version assertion to v0.1.5

## Architecture Notes

- The n8n backend API stays unchanged: `/api/n8n/config`, `/api/n8n/test`, `/api/n8n/workflows`
- The n8n Docker service stays unchanged
- The iframe src uses the configured base_url (typically http://localhost:5678)
- n8n must have N8N_SECURE_COOKIE=false for iframe embedding (already set)
- All fetch calls must use the apiFetch wrapper from '../api' (already the case)

## Key Constraints

- Do NOT use raw `fetch('/api/...')` — always use the api.ts functions
- Do NOT use `localStorage.getItem('organaizer_token')` directly
- CSS: APPEND new styles to app.css, never replace existing styles
- TypeScript: fix all errors before build (catch (error: unknown), unused vars, etc.)
- The VerbindungenView must still work for all other connection types (Office, Outlook, etc.)
- The n8n detail panel should only appear when an n8n connection is selected

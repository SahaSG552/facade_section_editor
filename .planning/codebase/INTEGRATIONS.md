# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**None** - This is a standalone client-side application with no external API integrations.

## Data Storage

**Local File System:**

- JSON file import/export for bit configurations
- Save/load operations via browser file dialogs

**Browser Storage:**

- None (no localStorage, sessionStorage, or IndexedDB)

## Authentication & Identity

**None** - No authentication system implemented.

## Monitoring & Observability

**None** - No error tracking or logging services integrated.

## CI/CD & Deployment

**Hosting:**

- Self-hosted or static file hosting
- Capacitor for mobile app deployment (Android/iOS)

**CI Pipeline:**

- None detected

## Environment Configuration

**Required env vars:**

- None (client-side only application)

**Secrets location:**

- None (no secrets required)

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## CDN Resources

The following libraries are loaded from CDN at runtime:

| Resource  | CDN          | Purpose                     |
| --------- | ------------ | --------------------------- |
| Capacitor | jsdelivr.net | Mobile runtime              |
| math.js   | unpkg.com    | Mathematical computations   |
| bezier-js | jsdelivr.net | Bezier curve handling       |
| hammer.js | jsdelivr.net | Touch input handling        |
| stats.js  | jsdelivr.net | Performance metrics display |

---

_Integration audit: 2026-03-29_

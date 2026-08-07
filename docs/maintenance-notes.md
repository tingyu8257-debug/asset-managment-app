# Maintenance Notes

## Project Shape

This is a vanilla HTML, CSS, and JavaScript app. It does not use React, Vue, TypeScript, a backend, or a database.

- `index.html`: page structure, dialogs, forms, and navigation.
- `css/style.css`: shared visual design and responsive layout.
- `js/app.js`: top-level wiring, navigation, quick actions, and shared UI events.
- `js/storage.js`: localStorage loading, saving, normalization, migration fallback, and legacy compatibility.
- `js/*-domain.js`: business rules and validation.
- `js/*-view.js`: rendering UI sections.
- `js/*-form-controller.js`: form opening, submission, and dialog behavior.
- `js/portfolio/`: portfolio module registry and Stocks module.
- `service-worker.js`: offline app shell cache only.
- `manifest.webmanifest`: installable PWA metadata.

## Data Flow

1. `AppStorage.load()` reads localStorage and normalizes old or missing fields.
2. Repositories and domain modules update the in-memory `state`.
3. `AppStorage.save(state)` persists the updated state.
4. Views render from `state` and calculation services.

UI code should not invent new localStorage keys directly. Prefer expanding `storage.js` and the relevant repository/domain module.

## LocalStorage Strategy

Keep existing keys stable. If a field changes:

- Add a normalize fallback.
- Preserve old data.
- Make migration repeatable.
- Do not clear user data automatically.

Backup / Restore currently uses schema version `5` in `data-management-service.js`.

## Backup Format

Backups include:

- `schemaVersion`
- `appVersion`
- `exportedAt`
- `data`

Import should validate before changing the current state. Replace and restore operations should create a recovery backup first.

## Portfolio Modules

Stocks currently owns Watchlist, Positions, Research Journal, Decisions, Reviews, and Thesis workflows.

Future investment products should be added as separate modules under `js/portfolio/`, then registered through the portfolio registry. Do not put Futures, Options, Crypto, or other products inside the Stocks module.

## PWA / Offline

The service worker caches only static app shell files. It does not read, write, migrate, or backup localStorage.

User data remains in the browser profile on each device. GitHub Pages serves only HTML, CSS, JavaScript, icons, and the service worker. It does not receive localStorage contents or exported backup JSON files unless a user manually commits those files.

When changing app shell files, update:

- `CACHE_VERSION` in `service-worker.js`
- `APP_SHELL` list in `service-worker.js`
- `tests/milestoneJ-pwa.test.cjs` if a required shell file is added

Service workers require HTTP/HTTPS. Normal `file://` usage still works as a local page, but it cannot install or run the service worker.

The update strategy is:

- New app shell files install into a new cache version.
- The old version keeps running while the new service worker waits.
- `js/pwa-registration.js` shows an update notice.
- Pressing the notice action sends `SKIP_WAITING`; after `controllerchange`, the page reloads into the new version.

## Release Routine

- Run `npm test`.
- Open the app and check browser console.
- Export a backup before manual testing.
- Check mobile navigation.
- Check install prompt through HTTP/HTTPS.
- Test offline reload after the service worker is installed.

# Release Checklist

This app is an offline-first personal finance and investment research app.

## Before Release

- Run `npm test`.
- Open `index.html` and check the browser console has no red errors.
- Confirm Dashboard, Portfolio, Finance, Settings, Backup / Restore, and mobile navigation still open.
- Confirm `.env`, `work/`, browser profiles, and temporary files are not included in any release package.
- Confirm exported backup files match `.gitignore` patterns and are not staged for GitHub.
- Export a backup JSON before doing final manual testing.

## PWA Checks

- Open the app through `http://localhost:3000` or another HTTP/HTTPS host.
- Confirm the manifest loads in DevTools.
- Confirm `service-worker.js` is registered.
- Turn off the network in DevTools and reload.
- Confirm the app shell still opens offline.
- Confirm localStorage data is still available.
- Change `CACHE_VERSION`, reload once, and confirm the update notice appears.
- Press the update action and confirm the app reloads into the new service worker.

## GitHub Pages

- Commit only source files, icons, docs, tests, and deployment configuration.
- Keep the repository public only if there are no private values in source files.
- In GitHub, open Settings -> Pages.
- Set Source to "GitHub Actions".
- Confirm `.github/workflows/pages.yml` runs after pushing to `main`.
- Wait for the Pages URL to become available.
- Open the Pages URL once online before testing offline mode.

## iPhone Home Screen Test

- Open the GitHub Pages URL in Safari.
- Confirm Dashboard loads while online.
- Tap Share -> Add to Home Screen.
- Launch from the Home Screen icon.
- Confirm it opens without Safari browser chrome.
- Confirm the header does not collide with the top safe area and the update/offline notice does not collide with the bottom gesture area.
- Create or edit one harmless test record.
- Close and reopen the Home Screen app, then confirm the record remains.
- Export a JSON backup from Settings -> Backup & Restore.
- Turn on Airplane Mode and reopen the Home Screen app.
- Confirm the app shell loads offline and existing local data is still visible.
- Turn Airplane Mode off before importing or exporting more backups.

## Important Notes

- Service workers do not run from normal `file://` pages.
- The service worker only caches app files. It does not store, move, or rewrite localStorage data.
- Backup / Restore remains the main protection for user data.
- If the app shell changes, update `CACHE_VERSION` in `service-worker.js`.

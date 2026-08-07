# GitHub Pages PWA Deployment

This app is designed as an offline-first PWA for personal use.

## What Goes To GitHub

GitHub should contain only the app code and public assets:

- `index.html`
- `css/`
- `js/`
- `icons/`
- `manifest.webmanifest`
- `service-worker.js`
- `.nojekyll`
- docs and tests

Do not commit exported backup files, private notes, real account data, API keys, or `.env` files. The `.gitignore` file blocks common backup names such as `core-satellite-backup-*.json`, `*backup*.json`, `backups/`, and `private-data/`.

## Where User Data Lives

The deployed site serves the app shell. Personal records stay inside each browser profile through `localStorage`.

That means:

- iPhone data and computer data are separate.
- GitHub Pages does not automatically receive your asset data.
- Clearing Safari website data can delete the iPhone copy.
- Exported JSON backups are the recovery path.

## Deploy To GitHub Pages

1. Create a GitHub repository.
2. Commit the app files.
3. Push to the `main` branch.
4. In GitHub, open Settings -> Pages.
5. Set Source to "GitHub Actions".
6. Pushes to `main` will run `.github/workflows/pages.yml`.
7. Wait for the Pages URL in the workflow summary or Settings -> Pages.
8. Open the Pages URL in Safari or Chrome.

The manifest uses relative paths, so the app can run from a GitHub Pages project URL such as `https://USER.github.io/REPO/`.

The workflow publishes only the static app shell into `_site`: `index.html`, `manifest.webmanifest`, `service-worker.js`, `css/`, `js/`, `icons/`, and `.nojekyll`.

## Update Strategy

When static app files change, update `CACHE_VERSION` in `service-worker.js`. The new service worker installs into a new cache and waits. The app shows an update notice; pressing the notice action activates the new worker and reloads the page.

This updates the app shell only. It does not erase localStorage data.

## iPhone Install Checklist

1. Open the GitHub Pages URL in Safari.
2. Wait for the app to fully load once online.
3. Tap Share -> Add to Home Screen.
4. Launch the new Home Screen app icon.
5. Confirm it opens in standalone mode.
6. Confirm the header and bottom notice respect iPhone safe areas.
7. Add a harmless test record.
8. Close and reopen the app; confirm the record remains.
9. Export a JSON backup.
10. Turn on Airplane Mode and reopen the app.
11. Confirm the app shell and local data are visible offline.

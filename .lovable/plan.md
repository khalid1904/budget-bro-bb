# Plan: Share a receipt into Budget Bro

## What you get

After paying in a UPI app, tap **Share receipt** — Budget Bro appears in the Android share sheet. Choosing it opens the app straight on the Expenses page, runs the shared receipt image (or PDF) through the existing AI bill scan, and opens the Add Expense form pre-filled for the current month. You confirm and save as usual.

Notes on availability:
- Works on Android (Chrome/Edge) once the app is installed to the home screen. iOS/Safari does not support share targets, so the existing "Scan Bill" button stays as the fallback everywhere.
- Only active when you're on Pro with the **Bill Scan (AI)** toggle on; otherwise the app opens Expenses with a short message explaining the toggle.

## How it works

1. The web app manifest gains a `share_target` entry declaring a POST share of files (images + PDF) to `/share-target`.
2. The service worker intercepts that POST, reads the shared file, stashes it in a temporary cache, and redirects the app to `/expenses?shared=1`.
3. The Expenses page, on seeing `shared=1`, pulls the file back out, clears it from the cache, and runs the same `scanBill()` path the Scan Bill button uses — same pre-fill, same review notice, same error handling.

## Technical details

- **`public/manifest.json`**: add
  ```json
  "share_target": {
    "action": "/share-target",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": { "files": [{ "name": "receipt", "accept": ["image/*", "application/pdf"] }] }
  }
  ```
- **`public/sw.js`**: add a `fetch` handler branch for `POST` to `/share-target` (current handler ignores non-GET). It reads `request.formData()`, puts the file into a dedicated `budget-bro-share` cache under a fixed key with its content type, and responds with `Response.redirect('/expenses?shared=1', 303)`. Bump `CACHE_NAME` so returning installs pick up the new worker.
- **`src/pages/Expenses.tsx`**: a `useEffect` that, when `?shared=1` is present, fetches the cached file, converts it to a `File`, deletes the cache entry, strips the query param, and calls the existing `handleScanFile`. Guarded by `billScanEnabled`; when off, show a toast pointing at Settings.
- **New `src/lib/share-target.ts`**: small helper to read and clear the shared file from the cache (keeps Expenses tidy and testable).
- No backend, database, or edge-function changes — reuses `scan-bill` as-is.

## Out of scope

- iOS share sheet support (platform limitation).
- Sharing text/URLs (UPI receipts are shared as images/PDFs).
- Storing the shared receipt image on the expense record.

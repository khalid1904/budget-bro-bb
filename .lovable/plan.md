# Fix the Android receipt-sharing regression

## What the screenshots show
Android opens Budget Bro from the share sheet, but the app falls back to “Choose the receipt screenshot” instead of receiving the shared receipt. The share sheet shows two Budget Bro entries; the left entry was tapped. The specific failure point is not confirmed yet.

## Plan
1. Trace how the two Android share-sheet entries are installed/registered and compare their manifest, share action, and service-worker handling, including the legacy `/share-target` path.
2. Reproduce the handoff paths in the current app: image/PDF file, shared payment text, cold start, cache miss, and legacy share action. Identify where the payload or its one-time identifier is lost.
3. Make a focused fix so both current and older installed entries reach the same reliable receiver, and show a useful recovery option when Android supplies no usable payload. Avoid logging receipt contents.
4. Verify the receipt reaches the expense scanner from both share paths, then check the preview/build and relevant tests. Explain whether an app refresh or reinstall is actually needed based on the fix.

## Technical details
Inspect the manifest, service worker, legacy route, service-worker registration, and the Expenses handoff. Keep receipt contents in the browser’s local cache only for the handoff; do not add server-side receipt storage.

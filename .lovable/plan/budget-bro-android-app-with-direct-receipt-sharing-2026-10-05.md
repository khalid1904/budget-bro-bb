# Budget Bro Android app with direct receipt sharing

## Outcome
Package the existing Budget Bro experience as an Android app, preserving its current modules and account-backed data, while adding a native Android share receiver so payment apps can send receipt images directly into Expenses.

## What will be built
- A Capacitor Android app using the existing React app for Budget Bro’s screens and features.
- Native Android share handling for single or multiple images, with support for image MIME types and Android content URIs; safely copy shared files into app-controlled temporary storage before handing them to the app.
- A reliable receipt handoff for both an already-open app and a cold launch, opening the existing receipt review/scanning flow and retaining its Pro/setting checks.
- Continue using the existing online receipt scanner; image analysis requires an internet connection. No new offline-data or Google Drive backup system is included in this request.

## Implementation details
- Add Capacitor’s core, CLI, and Android packages; configure app ID `app.lovable.p83abe351206248f9a1cefeca04124c9c` and app name `budget-bro-bb`.
- Generate the Android project and add Android intent filters plus a native bridge for `ACTION_SEND` and `ACTION_SEND_MULTIPLE`. Read URI contents through Android’s content resolver while the share permission is valid, then pass a temporary local file reference to the existing web receipt flow.
- Keep the web share target available; Android’s native receiver becomes the direct-payment-app path. Do not store receipt images remotely as part of handoff.
- Configure the provided sandbox URL for development hot reload, while ensuring production builds use packaged app assets rather than the preview URL.
- Validate Android build configuration and the shared-file handoff for warm and cold starts, including a scan-review result, where emulator tooling permits. Clearly identify any device-only checks that still need to be run on a physical Android phone.

## Not included
This adds Android packaging and reliable receipt sharing; it does not rewrite the screens in Kotlin or add offline-first data storage, Google Drive backup, or new product features.

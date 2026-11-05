# Password-free OTP sign-in + full data export/import

## 1. OTP-based sign-in / sign-up (no password, no links)

Replace the current password + email-confirmation-link flow with a two-step email OTP flow:

- **Step 1:** User enters email on the sign-in page. The app calls Supabase `signInWithOtp` with `shouldCreateUser: true`, so the same flow works for both existing and brand-new users (new users are signed up automatically).
- **Step 2:** User receives a 6-digit code by email and enters it. The app calls `verifyOtp` and the session is set. No password, no confirmation link.
- **Optional username after signup:** After verification, if the account's profile has no username yet, show a one-time "Add your display name" screen that can be skipped; it can also be set later in Profile/Settings.

Changes:

- Rewrite `src/pages/Login.tsx` as the unified OTP page (email step + code step, resend option). Remove the password form and the Google button.
- `src/pages/Register.tsx` becomes a redirect to `/login` (one flow for both).
- Remove Google sign-in code everywhere; disable the Google provider in the backend auth settings so it no longer appears as a sign-in option.
- Remove any leftover password-change/reset UI from Profile if present.
- Existing users (with passwords) keep their accounts — they simply sign in with the OTP code sent to their email.

## 2. Full data export & import (cross-account)

New module `src/lib/data-transfer.ts` plus a "Data" card in Settings with **Export** and **Import** buttons.

**Export (everything):**
- Gathers all of the user's rows: transactions, expenses, other budgets + their transactions, loans + recoveries, savings goals, recurring rules, custom categories, user settings, and profile display data (username, avatar, bio, currency).
- Downloads as a single JSON file, e.g. `budget-bro-export-2026-11-05.json`, containing a format version and export date.
- Pro/tier status is deliberately NOT exported — Pro status belongs to the account, not the data.

**Import (replace all, per your choice):**
- The user picks an export file; the app validates its format and shows a clear warning that importing **erases everything currently in this account** and replaces it with the file's data.
- After confirmation, the import deletes all existing rows (in an order that respects linked entries) and re-inserts the exported data with the new account as owner. Original IDs and cross-references (goal links, budget links, loan links, transfer pairs) are preserved so everything stays connected.
- Account settings (currency, dark mode, theme, feature toggles) and profile display data are applied; the account's own tier is untouched.
- Progress/toast feedback on success or failure.

Both export and import run client-side against the backend with the user's own session — no data passes through any server, and the file only ever exists on the user's device.

## Verification

- Type-check, existing tests, and build pass.
- Playwright check of the new OTP screens (code step appears) and the Settings export producing a valid file.
- Note: actually receiving an OTP email and an on-device import round-trip need a real signup — I'll verify what the sandbox allows and report the rest as unverified.

# Plan: Expense from Bill Scan (Pro)

## What you get

- A **Scan Bill** button in the Expenses page next to "Add Expense" (only when the feature toggle is on and you're on Pro).
- Tapping it lets you **take a photo or upload a bill image/PDF**.
- The bill is read by AI, and the **Add Expense form opens pre-filled** with merchant name (title), total amount, date, a suggested category, and notes (e.g. detected line items).
- Nothing is saved until you review and press **Add Expense** — you can edit every field first.
- A new toggle in Settings: **Bill Scan (AI)**, sitting alongside the existing Pro toggles.

## Why AI, not classic OCR

A plain OCR library returns raw text; we'd still need brittle regex to find the total, date and merchant across wildly different receipt layouts. A vision-capable AI model reads the image and returns structured fields directly, handles crumpled/rotated photos and multiple currencies, and needs no extra dependency. We'll use the built-in Lovable AI (no API key for you to manage).

## How it works

1. Image is selected in the browser, downscaled client-side (max ~1600px, JPEG) to keep uploads small.
2. It's sent as base64 to a new backend function `scan-bill`.
3. The function calls Lovable AI (`openai/gpt-5.6-sol`) with the image and a strict JSON schema: `{ title, amount, date, category, notes, currency, confidence }`, constraining `category` to the user's available expense categories (passed from the client).
4. The response is validated (Zod) and returned; the client opens the existing expense dialog pre-filled, with a small "Review the scanned details" hint and a low-confidence warning when applicable.
5. Errors are surfaced clearly: 429 → "Too many scans, try again in a moment", 402 → credits exhausted message, unreadable bill → "Couldn't read this bill, enter it manually".

## Technical details

- **DB migration**: add `bill_scan_enabled boolean not null default false` to `user_settings`.
- **New edge function**: `supabase/functions/scan-bill/index.ts` — JWT validated in code, CORS headers, Zod input validation (base64 data URL + mime allowlist: jpeg/png/webp/pdf, size cap ~5MB), structured output via the AI gateway.
- **`src/lib/budget-context.tsx`**: add `bill_scan_enabled` to the `Settings` type, defaults, and fetch mapping.
- **`src/pages/Settings.tsx`**: add the "Bill Scan (AI)" toggle in the Pro features card (shown only when expense tracking is on, since it feeds the Expenses module).
- **`src/pages/Expenses.tsx`**: add the Scan Bill button, hidden file input with `capture="environment"` for mobile camera, client-side image resize helper, loading state, and pre-fill of the existing dialog state.
- **New `src/lib/bill-scan.ts`**: image downscale + `scanBill()` invoke helper.
- No storage bucket — the image is used transiently and not persisted (can add receipt storage later if you want it).

## Out of scope

- Storing/attaching the bill image to the expense record.
- Multi-expense splitting from one bill (single total per scan).
- Bill scan for Budget or Other Budgets entries — Expenses only, as asked.

## Issue

The savings goal pill (e.g. "Emergency Fund 2026") uses `bg-accent/20 text-accent-foreground`. In dark mode `--accent-foreground` is `160 80% 10%` (near-black), painted on a faint dark-green `accent/20` tile — dark-on-dark, unreadable (visible in the screenshot).

## Fix

### 1. Goal pill — switch to a tone that has matching foreground in both themes

In `src/pages/Budget.tsx` (line 379) and `src/pages/OtherBudgetDetail.tsx` (line 205):

- Replace `bg-accent/20 text-accent-foreground` with `bg-success/15 text-success border border-success/30`.
- `--success` resolves to a green tone with a light foreground designed for `text-success` usage; matches the goal/savings semantic and stays readable on both light and dim backgrounds.

(Alternative considered: `bg-primary/10 text-primary` — already used by Transfer/From-Budget pills, so using success keeps the goal pill visually distinct.)

### 2. Quick theme-compat audit of pills/tags

Check and normalize the small pill family so all are readable in both themes:

- `Recurring.tsx:313` — `bg-secondary text-secondary-foreground` ✓ (token pair, OK)
- `Budget.tsx:371,376` & `Expenses.tsx:228` & `OtherBudgetDetail.tsx:202` — `bg-primary/10 text-primary` ✓ (OK both modes)
- `SavingsGoals.tsx:122-124` — status badges already use proper token pairs ✓
- The only broken one is the goal pill above.

### 3. Broader light/dark sweep

Grep for hard-coded color classes that bypass tokens (`text-white`, `bg-black`, `text-gray-*`, `bg-gray-*`, `text-slate-*`, etc.) across `src/pages` and `src/components`. Any hits get swapped to semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-muted`, `bg-card`, etc.).

Also verify the Dashboard empty-donut ring (`border-muted`), the OtherBudgetDetail summary tiles, and the `Edit/Delete` icon buttons render with `text-muted-foreground` / `text-destructive` rather than literal grays.

No business-logic or layout changes — purely token corrections.

## Files Touched

- `src/pages/Budget.tsx` — goal pill className
- `src/pages/OtherBudgetDetail.tsx` — goal pill className
- Any additional file flagged by the hard-coded-color sweep (expected: 0–2 small swaps)

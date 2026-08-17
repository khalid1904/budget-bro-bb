# Plan: Split Expenses Module into Two Views

## Goal
Inside the Expenses module, separate the current combined page into two distinct views:
- **Expense List** (default)
- **Budget vs Actual**

Users toggle between them without leaving the module.

## What will change

### 1. Add a view toggle in `src/pages/Expenses.tsx`
- Introduce local state `view: 'list' | 'budget'` defaulting to `'list'`.
- Render a segmented control / tab switcher near the page header (beside the month selector) with labels:
  - "Expense List"
  - "Budget vs Actual"
- The toggle is styled with existing theme tokens and remains usable on mobile.

### 2. Extract the Budget vs Actual section into its own conditional view
- Move the current "Budget vs Actual" card and its supporting `useMemo` logic into a view that only renders when `view === 'budget'`.
- Keep all existing calculations: total budgeted, total spent, remaining, per-category progress bars, over-budget warnings.

### 3. Keep the Expense List as the default view
- Render the existing expense entries card, filters, sort, and add/edit dialog only when `view === 'list'`.
- Preserve the "Scan Bill" button and shared-receipt handling.

### 4. Preserve shared state and actions
- Month selector stays visible across both views.
- The "Add Expense" / "Scan Bill" buttons remain available in the List view; the Budget view focuses on comparison.

### 5. Mobile responsiveness
- Ensure the toggle wraps gracefully with the month selector on narrow screens.
- No hardcoded colors; use existing semantic tokens.

## Files to modify
- `src/pages/Expenses.tsx`

## Out of scope
- No backend or context changes.
- No routing changes (remains a single `/expenses` page).

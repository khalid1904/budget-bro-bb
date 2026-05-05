## Plan: Budget Import from Previous Month (Pro feature)

Add the ability to copy budget entries from any previous month into the currently selected month on the Budget page. Pro-only.

### Feature name (UI)
**"Import from Month"** — button in the Budget page header next to "Add Entry", with a `Copy` icon. Inside the dialog the heading reads **"Import Budget from Another Month"**.

### Scope
- Applies to **Budget transactions only** (income + allocations). Expenses are NOT copied.
- Available only when `profile.tier === 'pro'`. Free users do not see the button.
- User can choose:
  1. **Copy entire month** — all incoming + outgoing entries from the source month.
  2. **Select entries** — checkbox list to pick specific transactions to copy.
- Copied entries are inserted as new transactions for the current month, with:
  - `month` set to current month
  - `date` shifted to the same day-of-month in the current month (clamped to last day if needed)
  - `recurring_rule_id` set to `null` (copies are standalone, not tied to recurrence)
  - `goal_id` preserved if the linked goal still exists and is active, else `null`

### Changes

**`src/pages/Budget.tsx`** (only file modified)

1. Import `Copy` icon from lucide-react and `Checkbox`, `RadioGroup`, `RadioGroupItem`, `ScrollArea` from ui.
2. Pull `profile` from `useBudget()` and compute `const isPro = profile.tier === 'pro'`.
3. Add state:
   - `importDialogOpen`, `importSourceMonth` (default = previous month), `importMode` ('all' | 'select'), `selectedImportIds: Set<string>`.
4. Compute `availableSourceMonths` = unique months from `transactions` excluding `currentMonth`, sorted descending.
5. Compute `sourceTxns` = transactions filtered by `importSourceMonth`, grouped by type for display.
6. Add **Import from Month** button in the header action row (next to Add Entry), rendered only when `isPro`.
7. Build dialog:
   - Source month `Select` populated from `availableSourceMonths` (empty state: "No previous months with budget entries").
   - `RadioGroup` for mode: "Copy entire month" / "Select specific entries".
   - When mode is `select`: show a scrollable list grouped by Income / Allocations with checkboxes; include a "Select all" toggle per group.
   - Footer summary: "X entries will be copied to {currentMonth label}".
   - Confirm button: disabled if nothing to copy.
8. On confirm, iterate the chosen transactions and call `addTransaction` for each with the remapped fields described in Scope. Show a toast: `"Imported N entries from {sourceMonth label}"`. Close dialog and reset state.
9. Skip entries whose identical (title + amount + category + type) already exist in the current month to avoid accidental duplicates; show a sub-toast count of skipped duplicates if any.

### Out of scope
- No DB schema changes — uses existing `addTransaction` flow.
- No changes to Expenses, Recurring, or other pages.
- No backfill/undo (user can delete copied entries individually).

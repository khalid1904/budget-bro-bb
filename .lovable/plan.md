## UI Fixes

Three issues across Budget, Expenses, Other Budget Detail, and Dashboard.

### 1. Transaction names truncated to "Um…", "Flipk…" on mobile

**Cause:** Each entry is a single horizontal flex row (icon + title block + amount + edit/delete). On narrow screens the title column gets squeezed because the amount and two action buttons sit on the same line.

**Fix:** Restructure each row into a two-line layout on mobile.
- Top line: icon + title (full width) + amount on the right.
- Bottom line: meta tags (category, date, From Budget / Recurring / Transfer / Goal) + edit/delete buttons on the right.
- On `sm:` and up, keep the current single-row look.

Files: `src/pages/Budget.tsx` (entries list ~line 376), `src/pages/Expenses.tsx` (~line 214), `src/pages/OtherBudgetDetail.tsx` (~line 186).

### 2. Savings-goal tag overlapping the amount on Other Budget Detail

**Cause:** Goal name + category + date all sit in one inline row next to a non-shrinking amount; long goal text overflows and overlaps the amount.

**Fix:** Same two-line restructure as #1. The goal pill becomes a wrapped chip on the meta row instead of inline plain text. Use `bg-accent/20 text-accent-foreground rounded-full px-2 py-0.5` matching the Budget page's goal pill style for consistency.

### 3. Dashboard empty donut shows "No data" overlapping "Total Budget ₹0.00"

**Cause:** When data is empty, the placeholder ring renders "No data" centered inside it, while an absolutely-positioned overlay also renders "Total Budget" + amount on top — both sit at the same center.

**Fix:** When `donutData.length === 0` (and same for `expenseDonutData`), drop the inner "No data" text and just keep the empty ring + the overlay (which already shows ₹0.00). The label stays meaningful and there's no overlap.

Files: `src/pages/Dashboard.tsx` lines ~150-153 and ~328-331.

### Out of scope

No data-model, business-logic, or color-token changes. Pure presentational cleanup.

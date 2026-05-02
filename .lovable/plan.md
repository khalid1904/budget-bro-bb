## Plan: Income vs Expense Dashboard View

Today, the Dashboard shows Income vs Budget (planned outgoing). When the Expense Tracking module is enabled, add a parallel Income vs Expense view that mirrors the same layout but uses recorded expenses instead of budget allocations.

### UX

On the Dashboard, when `settings.expense_tracking_enabled` is true AND there is at least one recorded expense, show a tab switcher at the top of the page:

- **Budget View** (default) — current dashboard, unchanged
- **Expense View** — same layout, swapped to actual expenses

When expense tracking is disabled or there are no expenses, the dashboard renders exactly as today (no tabs shown).

### Expense View contents (mirrors Budget View)

Reuses the same hero card, donut, summary tiles, recent list, category donut, and trend chart styling.

1. **Hero donut + summary tiles** (uses `expenses` for selected month)
   - Donut center: "Total Spent" = sum of month's expenses
   - Donut slices: Spending / Savings / Investments / Remaining (Income − Expenses), classified by `getCategoryType(expense.category)`
   - Summary tiles: Income, Spent (Spending), Saved (actual), Invested (actual), Remaining (Income − Total Expenses) with deficit warning if negative

2. **Recent Expenses** (latest 5 from `expenses` for the month) — same row format, always shown as outgoing (red), with category icon

3. **Expenses by Category** donut + legend — grouped from month's expenses

4. **Monthly Trend** bar chart — last 6 months: Income vs Total Expenses (replaces "spending" series with actual expense totals per month)

### Technical Changes — `src/pages/Dashboard.tsx` only

- Pull `expenses`, `settings` from `useBudget()`
- Compute month-scoped expenses + the same aggregations (spending/savings/investments/total/remaining/category groups/6-month trend) but from `expenses` instead of outgoing transactions
- Add `useState<'budget' | 'expense'>('budget')` for the active view
- Compute `showTabs = settings.expense_tracking_enabled && expenses.length > 0`
- When `showTabs`, render `<Tabs>` (shadcn `tabs.tsx`) with two triggers: "Budget" and "Expense"; when false, just render the Budget view as today
- Extract Budget view JSX as-is into the Budget tab; build Expense tab JSX by cloning the same structure with expense-derived data and relabeled titles ("Total Spent", "Recent Expenses", "Expenses by Category", "Income vs Expenses")
- No changes to context, routing, types, database, or any other file

### Empty states

- Expense tab visible but selected month has no expenses → show a "No expenses recorded for this month" empty card with a link to `/expenses`
- Budget tab behavior unchanged

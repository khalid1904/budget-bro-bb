

## Plan: Add Expense-Based Reports to Analytics

When expense tracking is enabled and expenses exist for the selected month, add three new report sections to the Analytics page.

### Changes — `src/pages/Analytics.tsx` only

**1. Pull expense data and settings from context**
- Destructure `expenses`, `settings` from `useBudget()`
- Compute `expenseEnabled = settings.expense_tracking_enabled`
- Filter `monthExpenses` for `currentMonth`

**2. New computed data (all gated on `expenseEnabled && monthExpenses.length > 0`)**

- **Expense by Category pie chart** — group expenses by category, same donut style as existing breakdowns
- **Budget vs Actual bar chart** — for each outgoing category, show budgeted amount (from transactions) vs actual spent (from expenses) side by side
- **Expense Trend line chart** — across last 12 months, plot total expenses per month (similar to existing savings trend)
- **Summary card row** — Total Expenses, Budget Utilization % (total expenses / total allocations × 100), Over-budget categories count

**3. Render conditionally**
- After the existing charts, add a section header "Expense Reports" with these new cards
- Only rendered when expense tracking is enabled AND there are expenses recorded
- Uses same card styling, color palette, and chart components as existing sections

### No database or routing changes needed — this is purely a UI addition to the existing Analytics page.


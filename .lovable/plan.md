

## Plan: Yearly Insights Dashboard with Financial Health Score

### Overview
Create a new "Yearly Insights" page with a Financial Health Score (0-100), year/financial-year selectors, yearly summaries, score component breakdowns, and auto-generated insights. The existing monthly Dashboard remains untouched.

### New Files

**1. `src/lib/financial-year-utils.ts`** — Pure utility functions
- `getMonthRange(year, type)`: Returns array of `YYYY-MM` strings for a given year. Calendar = Jan-Dec, April-March = Apr(year)-Mar(year+1).
- `getAvailableYears(transactions)`: Extracts distinct years from transaction data.
- `computeYearlyMetrics(transactions, months)`: Aggregates income, expenses, savings-category, investments-category totals across the month range.
- `computeHealthScore(metrics)`: Returns total score (0-100) + 5 component scores.
- `generateInsights(currentMetrics, prevMetrics)`: Returns 2-3 rule-based text insights.

Score component calculations:
- **Wealth Retention (30 pts)**: Linear scale from WRR%. >=60% = 30, scaled down proportionally.
- **Savings Discipline (25 pts)**: Linear scale from SAR%. >=25% = 25.
- **Investment Growth (20 pts)**: Linear scale from IAR%. >=20% = 20.
- **Expense Stability (15 pts)**: Based on coefficient of variation of monthly expenses. CV=0 → 15, CV>=1 → 0.
- **Liquidity Balance (10 pts)**: LRR in 15-40% sweet spot → 10. Outside range → scaled penalty.

Edge cases: <3 months data → "Insufficient Data". Income=0 → "Score Unavailable".

**2. `src/pages/YearlyInsights.tsx`** — New page component
- Header with title "Yearly Insights"
- Financial Year Type toggle: "Calendar Year" | "April - March" (default: Calendar)
- Year dropdown selector (derived from transaction data)
- Large circular score gauge (SVG circle with stroke-dashoffset animation)
- Score label: Weak / Moderate / Strong / Excellent
- 5 summary cards: Total Income, Total Expenses, Total Savings, Total Investments, Net Surplus
- 5 score component breakdown cards showing individual scores with progress bars
- Insight panel with 2-3 auto-generated text insights

### Modified Files

**3. `src/components/layout/AppLayout.tsx`**
- Add nav item: `{ to: '/yearly', label: 'Yearly Insights', icon: Trophy }` (inserted as second item, after Dashboard)

**4. `src/App.tsx`**
- Import `YearlyInsights` page
- Add route: `<Route path="/yearly" element={<YearlyInsights />} />`  inside protected layout

### Architecture
- All scoring logic lives in `financial-year-utils.ts` (pure functions, testable)
- Page component only handles state (year selection, FY type toggle) and renders
- Uses existing `useBudget()` transactions array — no new DB queries needed; filters client-side by month range
- No changes to existing Dashboard, Budget, or Analytics pages
- No database schema changes needed

### UI Design
- Matches existing app styling (shadcn cards, font-display headings, dark mode compatible)
- Circular score uses SVG with animated `stroke-dashoffset`
- Color coding: Weak=red, Moderate=amber, Strong=blue, Excellent=green
- Responsive grid layout consistent with other pages


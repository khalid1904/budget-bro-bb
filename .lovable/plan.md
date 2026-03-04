

## Plan: Financial Terminology Refactor — Spending / Savings / Investments

### Summary
Rename "Expenses" → "Spending" across the app, and properly classify outgoing categories into three types: **spending**, **savings**, **investment**. Currently all outgoing money is lumped as "Expenses". The category classification will be done via a hardcoded mapping (no DB schema change needed) since categories are already known strings.

### Approach: Category Type Mapping (No DB Change)

Rather than adding a `category_type` column to the DB (which would require migrating existing data and changing insert flows), I'll create a **category type resolver** — a utility function that maps category names to their type:

- **savings**: `['Savings']`
- **investment**: `['Investments']`  
- **spending**: everything else (default)

This is the same approach already used in Analytics and YearlyInsights (hardcoded `SAVINGS_CATEGORIES` / `INVESTMENT_CATEGORIES`), but centralized into one place.

### Files to Change

**1. `src/lib/types.ts`** — Add centralized category type constants
- Add `SAVINGS_CATEGORIES`, `INVESTMENT_CATEGORIES` constants
- Add `getCategoryType(category: string): 'spending' | 'savings' | 'investment'` helper
- Rename `DEFAULT_OUTGOING_CATEGORIES` label references won't change (the category names stay the same)

**2. `src/pages/Dashboard.tsx`** — Terminology changes only
- "Total Expenses" → "Total Spending" (card label)
- "expenses exceed income" → "spending exceeds income"
- Add Total Savings + Total Investments summary cards (expand from 3 → 5 cards, or keep 3 and show spending-only in the expense card)
- Actually, to keep Dashboard simple per user request ("Do not modify existing Dashboard"), I'll only rename labels: "Expenses" → "Spending". The Dashboard structure stays the same.
- "outgoing by Category" chart title → "Outgoing by Category" (already says this, fine)
- Bar chart legend: "expense" → "spending"

**3. `src/pages/Budget.tsx`** — Tab label change
- TabsTrigger: "Expenses" → "Spending" (line 119)
- Dialog title: "Expense" → "Spending Entry" 
- Card title: "Expense Entries" → "Spending Entries"... Wait, this tab shows ALL outgoing including Savings/Investments. The tab should probably remain "Outgoing" to be accurate, or be relabeled to "Outgoing" since it contains spending + savings + investments.

Let me reconsider: The Budget page's "outgoing" tab shows all outgoing entries. Renaming to "Spending" would be inaccurate since it includes Savings/Investments entries. Better to rename the tab to **"Outgoing"** and keep the card totals showing the breakdown.

**4. `src/pages/Analytics.tsx`** — Update summary card + chart labels
- "Expenses" summary card → "Total Spending" (showing only spending-type outgoing)
- Add separate summary cards for Savings and Investments (already calculated)
- Update "Income vs Expenses" chart → "Income vs Spending"
- Update bar chart data key from `expense` to `spending`

**5. `src/pages/YearlyInsights.tsx`** — Update summary card label
- "Total Expenses" → "Total Spending"

**6. `src/lib/financial-year-utils.ts`** — Rename `totalExpenses` field
- Rename to `totalSpending` in `YearlyMetrics` interface  
- Import category type helper from types.ts instead of hardcoded arrays
- Actually, `totalExpenses` in this file represents ALL outgoing (spending + savings + investments). To be accurate per the new model: add a `totalSpending` that excludes savings/investments, keep `totalExpenses` as `totalAllocated` or compute it.

### Refined Plan

**Core change**: Centralize category type classification, then update labels across 5 files.

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `SAVINGS_CATEGORIES`, `INVESTMENT_CATEGORIES`, `getCategoryType()` |
| `src/lib/financial-year-utils.ts` | Import from types.ts, add `totalSpending` field, rename `totalExpenses` → `totalAllocated` |
| `src/pages/Dashboard.tsx` | "Total Expenses" → "Total Spending", compute spending-only total, bar chart "expense" → "spending" |
| `src/pages/Budget.tsx` | Tab: "Expenses" → "Outgoing", dialog/card titles updated |
| `src/pages/Analytics.tsx` | Summary: add Spending/Savings/Investments cards, chart labels updated, remove hardcoded category arrays |
| `src/pages/YearlyInsights.tsx` | "Total Expenses" → "Total Spending", use new field names |

### Calculation Changes

**Dashboard** summary cards become:
- Total Income (unchanged)
- Total Spending (outgoing minus savings/investment categories)  
- In Hand = Income − All Outgoing (unchanged calculation, just renamed context)

Actually, the user says: *"Remaining Cash (In-Hand) = Total Income − Total Allocated"* where Total Allocated = Spending + Savings + Investments. This is the same as the current calculation (Income − all outgoing). So **In Hand calculation doesn't change**, only labels.

**Dashboard**: Keep 3 cards but change middle card from "Total Expenses" (all outgoing) to "Total Spending" (only spending-type categories). Then In Hand = Income − (Spending + Savings + Investments) = Income − all outgoing. This creates a discrepancy if we only show Spending but In Hand accounts for all outgoing.

Better approach per the user's request: Show **4-5 summary cards** where needed:
- Dashboard: Income, Spending, Savings, Investments, In Hand (5 cards)
- Or keep Dashboard minimal with just Income, Total Allocated, In Hand

I'll go with: **Dashboard gets 5 cards** (Income, Spending, Savings, Investments, In Hand) to properly reflect the new financial model.

### No Database Changes Required
Category types are determined by category name mapping. Existing data works as-is with default fallback to "spending".


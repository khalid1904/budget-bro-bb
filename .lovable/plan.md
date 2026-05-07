## Other Budgets — Pro module

A new standalone module for one-off budget pots (e.g. "Bonus", "Wedding Gift", "Tax Refund"). Completely separate from the monthly Budget module — no months, no expense tracking, no dashboard rollup. Pro-only.

### Concept

- Each **Other Budget** is a named pot with its own incomings and allocations.
- Inside a pot the user sees a mini dashboard: Total Income, Total Allocated (split Spending / Savings / Investment), In-Hand.
- Allocations under the **Savings** category can optionally link to a Savings Goal — those amounts contribute to goal progress alongside the main Budget module.

### Database (new tables)

**`other_budgets`**
- `id`, `user_id`, `name` (e.g. "Bonus 2026"), `description`, `created_at`, `updated_at`
- RLS: owner-only (select / insert / update / delete by `auth.uid() = user_id`).

**`other_budget_transactions`**
- `id`, `user_id`, `other_budget_id` (FK → other_budgets, ON DELETE CASCADE), `title`, `amount`, `category`, `type` ('incoming' | 'outgoing'), `date`, `goal_id` (nullable, no FK — soft link, mirrors the existing transactions table pattern), `created_at`, `updated_at`
- Index on `(user_id, other_budget_id)`.
- RLS: owner-only.

No changes to existing tables. Goal progress logic will also sum matching `other_budget_transactions` rows.

### Routing & navigation

- New route `/other-budgets` (list) and `/other-budgets/:id` (detail), both wrapped in `TierRoute` (Pro only).
- New sidebar item **"Other Budgets"** with a `Wallet` icon, placed right after **Budget**, hidden for Free users (matches existing Pro gating in `AppLayout.tsx`).

### Pages

**`src/pages/OtherBudgets.tsx`** — list view
- Header: "Other Budgets" + "New Budget" button (opens dialog: name + optional description).
- Grid of cards, one per pot. Each card shows: name, total income, total allocated, in-hand, transaction count. Click → detail page.
- Empty state with brief explainer.
- Edit / delete actions per card (delete cascades transactions).

**`src/pages/OtherBudgetDetail.tsx`** — detail view
- Back link → list.
- Summary strip (matches existing dashboard styling): Total Income, Spending, Savings, Investment, Total Allocated, In-Hand.
- "Add Entry" dialog identical in shape to the main Budget add-entry dialog: type, title, amount, category, date, optional goal link (only when category is Savings, only Pro — already true here).
- Transactions table grouped by Income / Allocations with edit + delete.
- Reuses `DEFAULT_INCOMING_CATEGORIES`, `DEFAULT_OUTGOING_CATEGORIES`, `customCategories`, and `getCategoryType` from existing code.

### Context

Extend `BudgetContext` (`src/lib/budget-context.tsx`) with:
- `otherBudgets: OtherBudget[]`, `otherBudgetTxns: OtherBudgetTxn[]`
- `refreshOtherBudgets`, `addOtherBudget`, `editOtherBudget`, `deleteOtherBudget`
- `addOtherBudgetTxn`, `editOtherBudgetTxn`, `deleteOtherBudgetTxn`
- Loaded alongside other data when `user` is present.

### Savings goal integration

`SavingsGoals` page already computes progress from `transactions` filtered by `goal_id`. Update its progress calculation to also include `otherBudgetTxns` where `goal_id` matches and `category === 'Savings'`. The goal cards continue to render the same way; only the contributing data set grows.

### Out of scope

- No expense / actuals tracking inside Other Budgets.
- No recurring rules, no monthly cycles, no inclusion in Dashboard / Analytics / Yearly Insights / Financial Health Score.
- Free users: route redirects to `/dashboard`, sidebar item hidden.

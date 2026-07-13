## Plan: Sort options + entry timestamps on Budget & Expense views

### What you get

- A small **time hint** on each transaction row (e.g. `Jan 12 · 3:42 PM`) — no manual entry, uses the automatic `created_at` we already store when the entry was added/last edited.
- A **Sort** dropdown on the Budget page (Income + Allocations tabs), Expenses page, and Other Budget detail page, with these options:
  - Transaction date — newest first *(default, current behaviour)*
  - Transaction date — oldest first
  - Time added — newest first
  - Time added — oldest first
  - Amount — high to low
  - Amount — low to high
  - Title — A to Z
  - Title — Z to A

### Data model

No schema change needed — `created_at` and `updated_at` already exist on `transactions`, `expenses`, and `other_budget_transactions`. We'll surface `created_at` as the timestamp.

### Files touched (frontend only)

- `src/lib/budget-context.tsx` — expose `created_at` on the `Transaction`, `Expense`, and `OtherBudgetTxn` types (already fetched, just need to include it).
- `src/pages/Budget.tsx` — add Sort `Select`, apply sort to income + allocation lists, show small time hint under each entry.
- `src/pages/Expenses.tsx` — same Sort dropdown + time hint on each expense row.
- `src/pages/OtherBudgetDetail.tsx` — same Sort dropdown + time hint on each entry.
- Time formatting: local `toLocaleString` with `{ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }`, rendered in muted-foreground text-[11px] next to the transaction date.

### Persistence

Sort choice is kept in component state per page (resets on reload). No settings row needed — happy to persist to `user_settings` later if you want.

### Out of scope

- Dashboard "Recent transactions" list stays as-is (always newest-first preview).
- No sorting on Recurring, Lending, or Savings pages — you only asked for Budget + Expense views (Other Budgets included since it mirrors Budget).
- No manual time entry field — timestamp is captured automatically at create/edit time.
## Cross-Budget Transfers

Pro-only feature letting users move funds between Other Budgets and the monthly Budget in either direction via a one-click "Transfer" action. Each transfer creates two independent linked entries: an outgoing on the source side and an incoming on the destination side. Gated behind a new settings toggle (default OFF).

### Settings

- New column `cross_budget_transfers_enabled BOOLEAN NOT NULL DEFAULT false` on `user_settings`.
- Profile/Settings page: new toggle **"Cross-budget transfers"** under the existing Pro feature toggles (next to expense tracking). Pro-only; hidden/disabled for Free.
- When OFF, the Transfer UI is hidden everywhere.

### Database

Add a soft link column to track the paired entry on both sides (no FK; mirrors existing `goal_id` pattern):

- `transactions.transfer_ref_id UUID NULL` — id of the matched `other_budget_transactions` row.
- `other_budget_transactions.transfer_ref_id UUID NULL` — id of the matched `transactions` row.

Used only for display ("Transfer from Bonus 2026" badge) and to prevent the deletion cascade from leaving orphans confusing the user. Entries remain independently editable/deletable per the chosen "one-click transfer" mechanic.

### Transfer flow

A single **Transfer** button placed in two spots:

1. **Monthly Budget page** (`Budget.tsx`) — header action, next to "Add Entry".
2. **Other Budget detail page** (`OtherBudgetDetail.tsx`) — header action, next to "Add Entry".

Opens a dialog with:

- **Direction**: `Other Budget → Monthly` or `Monthly → Other Budget` (radio).
- **From**: select source pot/month (prefilled from current page).
- **To**: select destination pot/month.
- **Amount**, **Title** (default: "Transfer to/from {name}"), **Date**, **Category** (defaults: source side = `Savings` outgoing or user-picked outgoing category; destination side = `Other` incoming).

On submit, in one transaction (sequential inserts since no DB transaction across tables — wrap in client-side try/catch with rollback delete on failure):

1. Insert outgoing on source side.
2. Insert incoming on destination side.
3. Update both rows' `transfer_ref_id` to point at each other.

After creation the two entries are independent — editing or deleting one does not affect the other (matches "One-click transfer action" choice). A small "↔ Transfer" badge renders next to either entry in lists when `transfer_ref_id` is set.

### Context changes

`budget-context.tsx`:
- Load `transfer_ref_id` on existing fetches (already selecting `*`, so just propagate through types).
- Add `createTransfer({ direction, fromId, toId, amount, title, date, sourceCategory, destCategory })` helper that does the two inserts + linking.

### Tier & toggle gating

- Transfer button hidden when: tier !== 'pro' OR `cross_budget_transfers_enabled === false`.
- Backend: no extra RLS needed; existing per-table policies still apply.

### UI placement summary

```text
Monthly Budget page header:        [+ Add Entry] [↔ Transfer]
Other Budget detail page header:   [+ Add Entry] [↔ Transfer]
Settings page (Pro section):       [ ] Cross-budget transfers
Transaction rows (both sides):     ...title  ↔ Transfer badge
```

### Out of scope

- No auto-sync on edit/delete (entries are independent post-creation).
- No history view of transfers.
- No effect on Savings Goals progress (transfers do not link to goals).
- No analytics/dashboard changes.

### Files touched

- Migration: add columns + settings flag.
- `src/lib/budget-context.tsx` — types + `createTransfer`.
- `src/pages/Budget.tsx` — Transfer button + dialog, badge in rows.
- `src/pages/OtherBudgetDetail.tsx` — Transfer button + dialog, badge in rows.
- `src/pages/Profile.tsx` (or wherever Pro toggles live) — new toggle.
- `src/integrations/supabase/types.ts` — auto-regenerated.

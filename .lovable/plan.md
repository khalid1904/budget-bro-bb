## Goal

Link the two sides of a cross-budget Transfer so deleting either side automatically deletes its counterpart, keeping monthly Budget and Other Budget in sync.

## Background

`createTransfer` already writes both sides and stores `transfer_ref_id` on each row pointing to the other:

- Monthly side lives in `transactions` (`transfer_ref_id` → `other_budget_transactions.id`)
- Other-budget side lives in `other_budget_transactions` (`transfer_ref_id` → `transactions.id`)

But `deleteTransaction` and `deleteOtherBudgetTxn` in `src/lib/budget-context.tsx` delete only the row the user clicked. The counterpart is left orphaned, which is what the user is reporting.

## Changes (frontend only — schema already has `transfer_ref_id`)

`src/lib/budget-context.tsx`

1. `**deleteTransaction(id)**`
  - Look up the transaction in local `transactions` state.
  - If it has `transfer_ref_id`, also delete the matching row from `other_budget_transactions` (where `id = transfer_ref_id` AND `user_id = user.id`) and remove it from `otherBudgetTxns` state.
  - Then delete the monthly transaction as today.
2. `**deleteOtherBudgetTxn(id)**`
  - Look up the txn in local `otherBudgetTxns` state.
  - If it has `transfer_ref_id`, also delete the matching row from `transactions` (where `id = transfer_ref_id` AND `user_id = user.id`) and remove it from `transactions` state.
  - Then delete the other-budget txn as today.
3. **Defensive fallback** — if local state doesn't have the row (edge case after a refresh race), fall back to deleting any row whose `transfer_ref_id` equals the deleted id, so we never leave an orphan.

No UI changes are needed; `Budget.tsx`, `OtherBudgetDetail.tsx`, and any other delete   
buttons already call these two functions.  
  
**Finally**  
update the hero handling page with missing features

## Out of scope

- Editing a transfer side (amount/date/title) is not auto-mirrored to the other side. The user only asked for delete linkage, so leaving edits untouched.
- No DB migration. We rely on the existing `transfer_ref_id` columns; adding an FK with `ON DELETE CASCADE` would be cleaner long-term but is unnecessary for this fix and would need cross-table FKs which the project currently avoids.  
  

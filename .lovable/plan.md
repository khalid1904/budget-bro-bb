# Plan — Link Lending Entries to Budgets (Optional)

Add an optional "Add to budget" toggle on both **New Loan** and **Add Recovery** forms in the Lending module. When enabled, a real outgoing/incoming entry is created in either a monthly budget or an Other Budget and stays fully linked to the lending record (edits and deletes cascade in both directions, mirroring how transfers behave today).

## Behaviour

- **New Loan** dialog gets an optional section:
  - Toggle: "Also record as an outgoing in my budget"
  - Destination: Monthly Budget (pick month, defaults to current) **or** an Other Budget (pick which)
  - Category is auto-set to a default **"Lending"** Spending category (auto-created in `custom_categories` with a handshake/coins icon on first use)
  - Title auto-set to "Lent to {borrower}"; date = loan's `lent_date`
- **Add Recovery** form gets the same optional section:
  - Toggle: "Also record as an incoming in my budget"
  - Same destination choices
  - Category auto-set to **"Loan Recovery"** (also auto-created with an icon)
  - Title auto-set to "Recovery from {borrower}"; date = recovery date
- Defaults to **off**, so existing flow is unchanged.

## Link behavior (fully linked, transfers-style)

- Creating a linked loan/recovery inserts the budget entry first, then stores its id on the lending row.
- **Editing** loan amount/date/borrower also patches the linked transaction (amount, date, title). Same for recoveries.
- **Deleting** a loan deletes its linked transaction *and* every recovery's linked transaction (via the existing cascade on recoveries).
- **Deleting** a recovery deletes its linked transaction.
- **Deleting the budget entry directly** (from Budget / Other Budget page) also removes the corresponding loan or recovery row, so the two sides never drift.
- Switching destination during edit = old linked entry deleted, new one created.

## Data model

Add nullable link columns (no FKs to avoid cross-cascade surprises — handled in code like transfers):

```sql
ALTER TABLE public.loans
  ADD COLUMN linked_transaction_id uuid,
  ADD COLUMN linked_other_budget_txn_id uuid;

ALTER TABLE public.loan_recoveries
  ADD COLUMN linked_transaction_id uuid,
  ADD COLUMN linked_other_budget_txn_id uuid;

CREATE INDEX ON public.loans (linked_transaction_id);
CREATE INDEX ON public.loans (linked_other_budget_txn_id);
CREATE INDEX ON public.loan_recoveries (linked_transaction_id);
CREATE INDEX ON public.loan_recoveries (linked_other_budget_txn_id);
```

No new RLS needed — existing owner-only policies cover the new columns. Existing `loan_recoveries.loan_id ON DELETE CASCADE` still applies, but we'll handle linked-entry cleanup in code before deleting the loan so linked transactions also disappear.

## Code changes

- `src/lib/budget-context.tsx`
  - Extend `Loan` / `LoanRecovery` interfaces with `linked_transaction_id` and `linked_other_budget_txn_id`.
  - `addLoan` / `addRecovery` accept optional `link: { kind: 'monthly', month } | { kind: 'other', other_budget_id }`; perform the insert into `transactions` or `other_budget_transactions` first, then save the loan/recovery with the resulting id.
  - `editLoan` / (new) `editRecovery` mirror amount/date/borrower changes to the linked entry; if destination changes, delete the old linked entry and create a new one.
  - `deleteLoan`: pre-fetch all recoveries for the loan, delete every linked transaction (loan + recoveries), then delete the loan (cascade clears recovery rows).
  - `deleteRecovery`: delete the linked transaction first, then the recovery.
  - `deleteTransaction` / `deleteOtherBudgetTransaction`: also clear the matching loan/recovery row when their linked id points to it (mirrors current transfer cleanup).
  - Helper `ensureLendingCategory(kind: 'lending' | 'recovery')` — looks up or creates the default `custom_categories` row (Spending, icon `HandCoins` / `TrendingUp`).
- `src/pages/Lending.tsx`
  - Add the optional "Add to budget" block in the New/Edit Loan dialog and the Add Recovery form (Switch + destination Select).
  - Show a small "Linked to {month} budget" or "Linked to {Other Budget name}" hint on the loan card / recovery row when a link exists.
  - When editing a loan that already has a link, preselect the existing destination.

## Out of scope

- Custom category picker for lending entries (default "Lending" / "Loan Recovery" only — per user choice).
- Backfilling links for existing loans/recoveries (they stay standalone unless edited and re-linked).
- Reflecting recoveries from a closed loan into past months automatically.

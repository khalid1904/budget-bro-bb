ALTER TABLE public.loans
  ADD COLUMN linked_transaction_id uuid,
  ADD COLUMN linked_other_budget_txn_id uuid;

ALTER TABLE public.loan_recoveries
  ADD COLUMN linked_transaction_id uuid,
  ADD COLUMN linked_other_budget_txn_id uuid;

CREATE INDEX IF NOT EXISTS loans_linked_tx_idx ON public.loans (linked_transaction_id);
CREATE INDEX IF NOT EXISTS loans_linked_obt_idx ON public.loans (linked_other_budget_txn_id);
CREATE INDEX IF NOT EXISTS loan_recoveries_linked_tx_idx ON public.loan_recoveries (linked_transaction_id);
CREATE INDEX IF NOT EXISTS loan_recoveries_linked_obt_idx ON public.loan_recoveries (linked_other_budget_txn_id);
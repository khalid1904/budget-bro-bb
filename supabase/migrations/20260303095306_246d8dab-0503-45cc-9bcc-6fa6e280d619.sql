
-- Update FK on transactions.recurring_rule_id to CASCADE on delete
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_recurring_rule_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_recurring_rule_id_fkey
  FOREIGN KEY (recurring_rule_id)
  REFERENCES public.recurring_rules(id)
  ON DELETE CASCADE;

-- Ensure start_date <= end_date on recurring_rules
ALTER TABLE public.recurring_rules
  ADD CONSTRAINT chk_start_before_end CHECK (start_date <= end_date);

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS cross_budget_transfers_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transfer_ref_id UUID NULL;
ALTER TABLE public.other_budget_transactions ADD COLUMN IF NOT EXISTS transfer_ref_id UUID NULL;
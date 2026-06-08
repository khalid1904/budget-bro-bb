
CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  borrower_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  lent_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own loans" ON public.loans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own loans" ON public.loans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own loans" ON public.loans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own loans" ON public.loans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_loans_user_date ON public.loans(user_id, lent_date DESC);
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.loan_recoveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  recovered_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_recoveries TO authenticated;
GRANT ALL ON public.loan_recoveries TO service_role;
ALTER TABLE public.loan_recoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own recoveries" ON public.loan_recoveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recoveries" ON public.loan_recoveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recoveries" ON public.loan_recoveries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own recoveries" ON public.loan_recoveries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_loan_recoveries_loan ON public.loan_recoveries(loan_id);
CREATE INDEX idx_loan_recoveries_user ON public.loan_recoveries(user_id, recovered_date DESC);
CREATE TRIGGER update_loan_recoveries_updated_at BEFORE UPDATE ON public.loan_recoveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS lending_enabled boolean NOT NULL DEFAULT false;

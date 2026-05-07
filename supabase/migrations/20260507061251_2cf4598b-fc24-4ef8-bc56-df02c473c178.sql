CREATE TABLE public.other_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.other_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own other_budgets" ON public.other_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other_budgets" ON public.other_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own other_budgets" ON public.other_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own other_budgets" ON public.other_budgets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_other_budgets_updated_at BEFORE UPDATE ON public.other_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.other_budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  other_budget_id UUID NOT NULL REFERENCES public.other_budgets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_other_budget_txns_user_budget ON public.other_budget_transactions(user_id, other_budget_id);

ALTER TABLE public.other_budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own other_budget_txns" ON public.other_budget_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other_budget_txns" ON public.other_budget_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own other_budget_txns" ON public.other_budget_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own other_budget_txns" ON public.other_budget_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_other_budget_txns_updated_at BEFORE UPDATE ON public.other_budget_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring rules table
CREATE TABLE public.recurring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  custom_interval_days INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own recurring rules" ON public.recurring_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring rules" ON public.recurring_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring rules" ON public.recurring_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring rules" ON public.recurring_rules FOR DELETE USING (auth.uid() = user_id);

-- Add recurring_rule_id to transactions for linking
ALTER TABLE public.transactions ADD COLUMN recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER update_recurring_rules_updated_at BEFORE UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries
CREATE INDEX idx_recurring_rules_user_id ON public.recurring_rules(user_id);
CREATE INDEX idx_recurring_rules_active ON public.recurring_rules(user_id, is_active);
CREATE INDEX idx_transactions_recurring ON public.transactions(recurring_rule_id);

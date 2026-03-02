
-- Backfill NULL end_dates to start_date + 12 months
UPDATE public.recurring_rules 
SET end_date = (start_date + INTERVAL '12 months')::date 
WHERE end_date IS NULL;

-- Make end_date NOT NULL
ALTER TABLE public.recurring_rules ALTER COLUMN end_date SET NOT NULL;

-- Set all frequencies to monthly
UPDATE public.recurring_rules SET frequency = 'monthly', custom_interval_days = NULL;

-- Set default for frequency
ALTER TABLE public.recurring_rules ALTER COLUMN frequency SET DEFAULT 'monthly';

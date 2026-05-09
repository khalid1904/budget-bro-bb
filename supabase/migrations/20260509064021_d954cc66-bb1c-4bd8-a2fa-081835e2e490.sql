ALTER TABLE public.custom_categories
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'MoreHorizontal',
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'hsl(220, 10%, 46%)';

CREATE POLICY "Users can update own categories"
ON public.custom_categories
FOR UPDATE
USING (auth.uid() = user_id);
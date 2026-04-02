ALTER TABLE public.profiles ADD COLUMN tier text NOT NULL DEFAULT 'free';
UPDATE public.profiles SET tier = 'pro';
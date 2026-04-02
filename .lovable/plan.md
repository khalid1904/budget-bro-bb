

## Plan: Add Free/Pro Tier System

### Overview
Add a user tier system where Free users access Dashboard, Budget, and Profile only. Pro users get everything. Existing users default to Pro; new users default to Free. No upgrade UI — tier changes happen directly in the database.

### Database Changes

**1. Add `tier` column to `profiles` table**
```sql
ALTER TABLE public.profiles ADD COLUMN tier text NOT NULL DEFAULT 'free';
-- Set all existing users to Pro
UPDATE public.profiles SET tier = 'pro';
```

New users will get `'free'` via the default. Existing users become `'pro'` via the UPDATE.

### Code Changes

**1. `src/lib/budget-context.tsx`**
- Add `tier: string` to the `Profile` interface and `BudgetContextType`
- Fetch `tier` from the profiles table alongside other profile fields
- Expose `tier` in the context (default `'free'`)

**2. `src/components/layout/AppLayout.tsx`**
- Read `profile.tier` from `useBudget()`
- Split `navItems` into free and pro:
  - **Free**: Dashboard, Budget, Profile
  - **Pro-only**: Yearly Insights, Recurring, Savings Goals, Analytics
- Only render nav items the user's tier allows
- Pro-only items shown as locked/disabled with a small "Pro" badge (no click action)

**3. `src/App.tsx`**
- Add a `TierRoute` wrapper component that checks `profile.tier`
- Pro-only routes (`/yearly`, `/recurring`, `/savings-goals`, `/analytics`) redirect to `/dashboard` if user is on Free tier

**4. `src/pages/Landing.tsx`**
- Add a new "Pricing" section before the CTA with two tier cards:
  - **Free**: Dashboard, Budget Management, Profile — "Start Free"
  - **Pro**: Everything in Free + Yearly Insights, Recurring Transactions, Savings Goals, Advanced Analytics — "Contact Us"
- Clean card design with checkmark lists, consistent with existing emerald theme

### Files Changed

| File | Action |
|------|--------|
| Migration SQL | New — add `tier` column |
| `src/lib/budget-context.tsx` | Edit — add tier to Profile |
| `src/components/layout/AppLayout.tsx` | Edit — filter nav by tier, show Pro badges |
| `src/App.tsx` | Edit — add TierRoute guard |
| `src/pages/Landing.tsx` | Edit — add pricing section |

### Security
- Tier is stored server-side in `profiles` table with existing RLS
- Route guards are enforced both in navigation (hidden/locked) and routing (redirect)
- No client-side upgrade path — only DB updates change tier


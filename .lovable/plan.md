

## Plan: Savings Goals Feature

### Overview
Add a Savings Goals system: new DB table, a dedicated page to manage goals, and integration into the Budget page so savings transactions can optionally link to a goal. Progress is always calculated dynamically from linked transactions.

### Database Changes

**1. New table: `savings_goals`**
```sql
CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_name text NOT NULL,
  target_amount numeric NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
-- RLS: users CRUD own goals
```

**2. Add `goal_id` column to `transactions`**
```sql
ALTER TABLE public.transactions ADD COLUMN goal_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL;
```
This is nullable — only savings-category transactions will use it.

### New Files

**1. `src/pages/SavingsGoals.tsx`** — Goals management page
- List all goals as cards with: name, target, saved amount (dynamic sum), remaining, progress bar, deadline info, status badge
- Create Goal dialog: name, target amount, optional deadline, optional description
- Edit/Pause/Resume/Delete actions per goal
- Progress bar using existing `Progress` component
- If goal reaches target, prompt to mark complete

**2. No separate service file needed** — goal progress is a simple query/filter on transactions with matching `goal_id`

### Modified Files

**3. `src/pages/Budget.tsx`**
- When adding/editing an outgoing entry with a savings category, show an optional "Goal" dropdown listing active savings goals
- Pass `goal_id` in the transaction insert/update

**4. `src/lib/budget-context.tsx`**
- Add `savingsGoals` state + `refreshGoals()`, `addGoal()`, `editGoal()`, `deleteGoal()` methods
- Update `addTransaction`/`editTransaction` to accept optional `goal_id`

**5. `src/components/layout/AppLayout.tsx`**
- Add nav item: `{ to: '/savings-goals', label: 'Savings Goals', icon: Target }`

**6. `src/App.tsx`**
- Add route: `<Route path="/savings-goals" element={<SavingsGoals />} />`

### Key Design Decisions
- **Dynamic calculation only**: `saved_amount` is never stored — always `SUM(amount) FROM transactions WHERE goal_id = X`
- **Category enforcement**: Goal dropdown only appears when selected category is in `SAVINGS_CATEGORIES`
- **Status logic**: Active (default), Completed (manual or auto when target reached), Paused (manual toggle)
- **Edge cases**: Deleting/editing linked transactions automatically recalculates progress. Deleting a goal sets `goal_id = NULL` on linked transactions (ON DELETE SET NULL).


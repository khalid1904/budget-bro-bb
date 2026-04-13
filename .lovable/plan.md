

## Plan: Expense Tracking Module

### Concept
Add an optional "Expenses" module that lets users record actual spending and compare it against their budget allocations. This module is **Pro-only** and controlled by a toggle in Settings.

### Database Changes

**1. Add `expense_tracking_enabled` column to `user_settings`**
```sql
ALTER TABLE user_settings ADD COLUMN expense_tracking_enabled boolean NOT NULL DEFAULT false;
```

**2. Create `expenses` table**
```sql
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  month text NOT NULL,
  budget_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);
```

The `budget_transaction_id` column links an expense back to its originating budget allocation (for the "mark as spent" flow).

### Code Changes

**3. Update `budget-context.tsx`**
- Add `expense_tracking_enabled` to the `Settings` interface and state
- Add `expenses` state array with CRUD functions: `addExpense`, `editExpense`, `deleteExpense`, `refreshExpenses`
- Expose these through the context

**4. Update `src/pages/Profile.tsx` (Settings)**
- Add an "Expense Tracking" card visible only to Pro users
- Contains a Switch toggle to enable/disable the module
- Saves to `user_settings.expense_tracking_enabled`

**5. Create `src/pages/Expenses.tsx`**
- New page with month selector, category filter, and expense list (similar layout to Budget page)
- Add/edit/delete expense entries with title, amount, category, date
- Show a **Budget vs Actual** summary at the top: for each allocation category, show budgeted amount vs actual expenses, with variance
- Categories pulled from the same outgoing categories list

**6. Update `src/pages/Budget.tsx`**
- When expense tracking is enabled, add a "Mark as Spent" button on each allocation entry
- Clicking it creates an expense record linked to that budget transaction (pre-fills title, amount, category)

**7. Update `src/components/layout/AppLayout.tsx`**
- Add "Expenses" nav item (Pro-only, conditionally shown only when `expense_tracking_enabled` is true)

**8. Update `src/App.tsx`**
- Add `/expenses` route wrapped in `TierRoute`

### User Flow
1. Pro user goes to Profile/Settings → enables "Expense Tracking" toggle
2. "Expenses" appears in sidebar navigation
3. User can record expenses directly in the Expenses page
4. Or from Budget page, click "Mark as Spent" on any allocation to auto-create an expense
5. Expenses page shows budget-vs-actual comparison per category


## Goal

Add a **Lending** module so users can record money lent to people and log recoveries (full or partial) over time. Pro-only, toggleable from Settings. Standalone records — no automatic monthly/Other Budget entries are created; the user keeps full control of their budget separately. ( If possible give a catchy name for this module in case of loading based upon this feature's use cases )

## Behaviour

- **Lend entry**: borrower name, amount, date lent, optional note.
- **Recoveries**: a loan can have many recovery entries (date + amount + optional note). Status auto-derives from totals:
  - `Outstanding` — recovered < lent
  - `Partially Recovered` — 0 < recovered < lent
  - `Fully Recovered` — recovered ≥ lent
- **Linkage** (within the module): deleting a loan cascades and removes all its recoveries. Deleting a recovery just reduces the recovered total.
- **No auto budget entries**: lending and recoveries do **not** create transactions in monthly budgets or Other Budgets. (User picked "standalone" for both source and destination.) If they want it reflected in their budget, they add a normal outgoing/incoming themselves.

## Settings toggle

New Pro switch on Settings → Pro Features: **Enable Lending Tracker**. When off, the sidebar item and `/lending` route are hidden (mirrors Expense Tracking pattern). Stored on `user_settings.lending_enabled`.

## Pages

### `/lending` (new)

- Summary cards: Total Lent, Total Recovered, Outstanding, # Active Loans.
- "New Loan" button → dialog (borrower, amount, date, note).
- List of loans, each card shows: borrower, lent amount, recovered amount, outstanding, status pill, progress bar, date.
- Click loan → detail drawer/dialog with recovery history, "Add Recovery" form, edit/delete loan, delete individual recovery.
- Filters: All / Outstanding / Fully Recovered. Sort by date or outstanding amount.

### Sidebar

Add "Lending" entry between Savings Goals and Analytics, gated by `isPro && settings.lending_enabled`.

## Data model (Supabase)

```sql
create table public.loans (
  id uuid pk,
  user_id uuid → auth.users,
  borrower_name text not null,
  amount numeric not null,
  lent_date date not null,
  note text,
  created_at, updated_at
);

create table public.loan_recoveries (
  id uuid pk,
  user_id uuid → auth.users,
  loan_id uuid → public.loans on delete cascade,
  amount numeric not null,
  recovered_date date not null,
  note text,
  created_at, updated_at
);
```

- RLS: owner-only (`auth.uid() = user_id`) on both, with standard `GRANT SELECT/INSERT/UPDATE/DELETE TO authenticated` + `GRANT ALL TO service_role`.
- `ON DELETE CASCADE` on `loan_recoveries.loan_id` enforces "delete loan → recoveries gone".
- Indexes on `(user_id, lent_date)` and `(loan_id)`.
- Add `lending_enabled boolean default false` to `user_settings`.

## Code changes

- `src/lib/budget-context.tsx` — add `loans`, `loanRecoveries` state + CRUD (`addLoan`, `editLoan`, `deleteLoan`, `addRecovery`, `deleteRecovery`), include `lending_enabled` in settings type/loader/updater.
- `src/pages/Lending.tsx` — new page (summary + list + detail dialog).
- `src/components/layout/AppLayout.tsx` — add nav item (Pro + lending toggle).
- `src/App.tsx` — add `/lending` route wrapped in `TierRoute`.
- `src/pages/Settings.tsx` — add Lending toggle in Pro Features card.
- `src/pages/Landing.tsx` — add "Lending Tracker" to features list.

## Out of scope

- Auto budget linkage (explicitly skipped per user choice).
- Reminders/notifications for due loans (future).
- Interest calculations.
- Multi-currency per loan — uses default currency from settings.
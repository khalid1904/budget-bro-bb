

## Plan: Refactor Dark Mode, Recurring Rules Simplification

### 1. Fix Dark Mode Persistence

**Current issue**: Dark mode reads from `localStorage` on init but the DB value overwrites it in `refreshSettings()`, causing flicker and reset.

**Approach**:
- Add a blocking script in `index.html` `<head>` that reads `localStorage('darkMode')` and applies `.dark` class before React renders (prevents flicker)
- On first visit (no localStorage value), respect `prefers-color-scheme: dark`
- Keep localStorage as primary persistence, synced to DB for logged-in users
- In `refreshSettings`, only apply DB dark_mode if no localStorage override exists on first load; after that, localStorage is source of truth
- `toggleDark` already persists to both localStorage and DB — keep that

**Files**: `index.html`, `src/lib/budget-context.tsx`

### 2. Simplify Recurring Frequency to Monthly Only

**Changes**:
- `RecurringRule` interface: change `frequency` to just `'monthly'`, remove `custom_interval_days`
- Remove `getNextDate` switch cases for daily/weekly/yearly/custom — keep only monthly
- Remove frequency selector from Recurring page dialog
- Remove custom days input
- Remove `FREQUENCY_LABELS` map, hardcode "Monthly" in badge
- Remove `custom_interval_days` from payload/form state
- DB migration: set all existing rules to `frequency = 'monthly'`, set `custom_interval_days = NULL`

### 3. Month/Year Only Date Selection

**Changes**:
- Replace date inputs with two selects: Month (Jan-Dec) and Year (e.g., 2024-2030)
- Store start_date as `YYYY-MM-01`
- Store end_date as last day of selected month (calculated via `new Date(year, month, 0).getDate()`)
- Update form state from `startDate`/`endDate` strings to `startMonth`/`startYear`/`endMonth`/`endYear`
- Update `handleEdit` to parse existing dates into month/year
- Display dates as "MMM YYYY" format in rule rows

### 4. End Date Mandatory

**Changes**:
- Remove "optional" label from end date
- Add validation in `handleSubmit`: if no end month/year selected, show error toast
- Update `RecurringRule` interface: `end_date` becomes required `string` (not nullable)
- DB migration: make `end_date` NOT NULL with default for existing rows (set to start_date + 12 months for any NULL end_dates)
- Add DB constraint or validation trigger

### Database Migration (single migration)

```sql
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
```

### Files to Modify
1. **`index.html`** — Add dark mode blocking script in `<head>`
2. **`src/lib/budget-context.tsx`** — Fix dark mode init to respect system preference, avoid DB overwrite flicker
3. **`src/lib/recurring-context.tsx`** — Simplify interface, remove non-monthly logic, make end_date required
4. **`src/pages/Recurring.tsx`** — Replace frequency selector with hardcoded monthly, replace date inputs with month/year selects, make end date required with validation
5. **Database migration** — Backfill data, enforce constraints


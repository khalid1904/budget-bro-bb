
### What I found (confirmed root cause)
- In `src/lib/recurring-context.tsx`, `generateForRule` currently sets:
  - `upperBound = min(end_month, today)`
- Because of that, if the rule ends in a future month (e.g. Apr 2026) and today is Mar 2026, iteration stops at Mar.
- So the end month is excluded by design, not by timezone.

### Refactor plan

## 1) Fix inclusive monthly generation (start/end month both included)
**File:** `src/lib/recurring-context.tsx`

- Replace generation boundary logic to iterate **up to end month**, not up to today.
- Use year/month integer comparison only:
  - `while (curYear < endYear || (curYear === endYear && curMonth <= endMonth))`
- Keep day fixed at `01` for generated entries (`YYYY-MM-01`).
- Keep safe month increment:
  - `curMonth++`, rollover to next year when `> 12`.
- Continue using month key (`YYYY-MM`) for dedupe checks.

Planned helper extraction (for safety + tests):
- `parseYearMonth(dateStr)`
- `compareYearMonth(a,b)`
- `nextYearMonth(y,m)`
- `buildMonthsInclusive(start,end,after?)`

## 2) Make edit flow idempotent and correct
**File:** `src/lib/recurring-context.tsx`

- Update `updateRule` flow:
  1. Validate `start_date <= end_date`.
  2. Persist rule update with `last_generated_date = null`.
  3. Delete previously generated transactions for that rule (`recurring_rule_id = rule.id`).
  4. Regenerate full month range from updated start/end.
- This guarantees no stale months and no duplicate month rows after edits.

## 3) Ensure delete flow removes generated recurring months
**File:** `src/lib/recurring-context.tsx` (+ DB hardening below)

- In `deleteRule`, delete linked generated transactions first, then delete the rule.
- Keep UI refresh after delete.

## 4) Validation upgrades (frontend + backend)
**Frontend**
- Keep required end month/year check.
- Keep `start <= end` check.
- Add user-facing error when backend rejects overlapping duplicate schedule.

**Backend (migration)**
- Enforce monthly-only schedule at DB constraint level (replace old multi-frequency check).
- Enforce date shape:
  - start must be first day of month
  - end must be last day of month
  - start <= end
- Add overlap guard trigger on `recurring_rules` to block duplicate overlapping schedules for same logical rule identity (user + title + type + category + amount + overlapping month range).

## 5) Database safety changes
**Migration file:** new SQL migration

- Keep existing unique index on transactions (`recurring_rule_id`, `month`) as primary duplicate guard.
- Add `IF NOT EXISTS` safety for index creation (if needed).
- Update FK behavior so deleting a recurring rule cannot orphan generated rows:
  - move `transactions.recurring_rule_id` FK to `ON DELETE CASCADE` (or keep explicit app-delete + constraint check if you prefer conservative behavior; I’ll implement cascade for hard guarantee).

## 6) Unit tests for recurrence logic
**Files:**
- `src/lib/recurrence-utils.ts` (new pure helpers)
- `src/test/recurrence-utils.test.ts` (new tests)

Test cases:
1. Feb 2026 → Feb 2026 = 1 month  
2. Feb 2026 → Mar 2026 = 2 months  
3. Feb 2026 → Apr 2026 = 3 months (inclusive end month)  
4. Dec 2026 → Feb 2027 = 3 months (year boundary)  
5. Leap-year February range handling  
6. `after last_generated_date` starts from next month only  
7. Invalid range (`start > end`) rejects

---

### Technical details (implementation-level)
- Current bug is specifically from `min(end, today)` upper bound.
- I will remove `today` from generation range; generation becomes deterministic based on schedule window only.
- Regeneration on edit will be delete-then-rebuild per rule for idempotency.
- DB constraints + unique index + overlap trigger provide defense in depth.

---

### Expected corrected output example
For:
- Start: Feb 2026
- End: Apr 2026
- Amount: 5000
- Monthly

Generated:
- `2026-02` → 5000  
- `2026-03` → 5000  
- `2026-04` → 5000

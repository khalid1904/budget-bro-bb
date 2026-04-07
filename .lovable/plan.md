

## Plan: Rename Labels Across Three Modules

### Changes

**1. `src/pages/Dashboard.tsx`** — Change "Spending by Category" heading to "Budget by Category"

**2. `src/pages/Budget.tsx`** — Change the "Outgoing" tab label to "Allocations"

**3. `src/pages/Analytics.tsx`** — Change "Outgoing Breakdown" heading to "Budget Breakdown" (the capitalize logic uses the type name, so we need to handle the label override for "outgoing")

Three small text replacements, no logic changes.


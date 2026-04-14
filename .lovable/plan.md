

## Plan: Reorder Nav Items and Hide Pro-Only Items for Free Users

### Changes

**`src/components/layout/AppLayout.tsx`**

1. Reorder `allNavItems` to match the requested order and include Expenses in the static list:
   - Dashboard, Budget, Expenses, Recurring, Savings Goals, Analytics, Yearly Insights, Profile

2. Change the `navItems` filtering logic: instead of showing Pro items as greyed-out/locked for free users, **filter them out entirely**. Only Pro users see Pro-only items. Expenses additionally requires `expense_tracking_enabled`.

3. Remove the locked/greyed-out rendering block (the `if (locked)` branch that shows the PRO badge on disabled items).

### Summary of code changes

- Reorder and merge `allNavItems` to the new order (Expenses included statically with `free: false`)
- Replace `navItems` computation: filter out `!item.free` items when `!isPro`, and additionally filter out Expenses when `!settings.expense_tracking_enabled`
- Remove the `locked` check and its disabled-looking render branch from the nav loop


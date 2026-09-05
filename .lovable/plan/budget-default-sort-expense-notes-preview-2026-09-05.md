# Budget default sort + Expense notes preview

## What to build

1. **Budget list default sort**: Change the default sort on the Budget page from "Date — newest first" to "Time added — newest", matching the Expense list behaviour.

2. **Expense list notes preview**: Surface the existing `notes` field in the Expense list without forcing the user to open the edit dialog. Add a small **info** (`i`) button on each row that only appears when notes exist.
   - **Desktop**: show notes in a `Tooltip` on hover.
   - **Touch / click**: show notes in a `Popover` when the icon is tapped.
   - Keep the current row layout and action spacing intact on mobile.

## Technical details

- In `src/pages/Budget.tsx`, update `useState<SortOption>('date_desc')` to `useState<SortOption>('added_desc')`.
- In `src/pages/Expenses.tsx`:
  - Import `Info` from `lucide-react` and the shadcn `Tooltip`/`Popover` components.
  - Inside each expense row, conditionally render the info button when `exp.notes` is present.
  - Wrap the button in both a `Tooltip` (hover) and a `Popover` (click/tap) so notes are accessible on all devices.
  - Ensure the new icon fits alongside the existing edit/delete icons without breaking the mobile two-line layout.
- Verify that the `Expense` / transaction type exposes `notes` (it is already used in `handleEdit`, so no type change is expected).

## Out of scope

- No backend or schema changes.
- No changes to the Add/Edit expense form or bill-scan flow.
- No changes to Budget vs Actual view.

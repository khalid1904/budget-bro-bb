## Goals

1. Custom categories get icons (chosen from a wide picker), like predefined ones
2. Custom categories can be edited and deleted
3. Category creation is removed from all transaction modules and centralized in a new **Settings** page
4. Profile page focuses on identity only (avatar, details, change password)
5. Currency, dark mode, expense-tracking toggle, cross-budget toggle move to **Settings**

---

## 1. Database

Add an `icon` column to `custom_categories` so each custom category stores its Lucide icon name and color.

```sql
ALTER TABLE custom_categories
  ADD COLUMN icon TEXT NOT NULL DEFAULT 'MoreHorizontal',
  ADD COLUMN color TEXT NOT NULL DEFAULT 'hsl(220, 10%, 46%)';
```

Also enable UPDATE on `custom_categories` (currently only INSERT/SELECT/DELETE), with policy `auth.uid() = user_id`, so renames and icon changes work.

---

## 2. Category icon system (`src/lib/category-icons.ts`)

- Extend the file to expose a curated **icon palette** (~30–40 Lucide icons grouped: Money, Home, Food, Transport, Shopping, Health, Entertainment, Work, Travel, Education, Misc) plus ~12 preset color swatches.
- Update `getCategoryIcon(category)` to also accept a custom-category record `{ icon, color }` and resolve to the right Lucide component, falling back to the existing predefined map, then to the default.
- Add an `<IconPicker>` component (grid of icons + swatch row) used by the new category dialog.

---

## 3. Budget context (`src/lib/budget-context.tsx`)

- Change `customCategories` shape from `{ incoming: string[]; outgoing: string[] }` to `{ incoming: CustomCat[]; outgoing: CustomCat[] }` where `CustomCat = { id, name, icon, color }`.
- Update `addCategory` signature: `(type, { name, icon, color })`.
- Add `editCategory(id, patch)` and `deleteCategory(id)`.
- Update everywhere that builds category dropdown lists (`Budget.tsx`, `Expenses.tsx`, `Recurring.tsx`, `OtherBudgetDetail.tsx`, `TransferDialog.tsx`) to map `.name` from the new objects.

---

## 4. Remove inline "Add Category" UI

Strip the "Add Custom Category" dialog/button from:
- `src/pages/Budget.tsx` (lines around 187, 245)
- Any other module currently exposing it

Dropdowns now show only existing categories. A small helper text "Manage categories in Settings" can sit beneath the select.

---

## 5. Expenses module (`src/pages/Expenses.tsx`)

- Already uses `customCategories.outgoing`; after the shape change it will pick up custom categories automatically. No "create" button (per requirement #5).

---

## 6. New Settings page (`src/pages/Settings.tsx`) + route

Route: `/settings`. Add to sidebar (with `SettingsIcon`) right above Profile.

Sections:

**a. Preferences**
- Default currency (moved from Profile)
- Dark mode toggle (moved from Profile/header if applicable)

**b. Pro Features** (only shown if `profile.tier === 'pro'`)
- Expense tracking toggle
- Cross-budget transfers toggle

**c. Category Management**
- Two tabs: Incoming / Outgoing
- Lists predefined categories (read-only, with their icon) + custom categories (with edit/delete buttons)
- "+ Add Category" opens a dialog: name input + IconPicker + color swatch row
- Edit dialog reuses the same form, prefilled
- Delete: confirm dialog; warns that existing transactions keep the category name as text but lose the custom icon

---

## 7. Profile page (`src/pages/Profile.tsx`)

Trim down to:
- Avatar picker
- Username, email, bio
- Change password
- Tier badge / upgrade CTA

Remove: currency selector, dark mode, expense-tracking toggle, cross-budget toggle (all now in Settings).

---

## 8. Navigation (`src/components/layout/AppLayout.tsx`)

Insert `{ to: '/settings', label: 'Settings', icon: Settings, free: true }` before Profile.

---

## Technical Notes

- The icon name is stored as a string (e.g. `"ShoppingCart"`) and resolved via a map of `{ [name]: LucideIcon }` to keep tree-shaking predictable (no dynamic imports).
- Color stored as full HSL string for consistency with `category-icons.ts`.
- Existing custom categories migrate cleanly — defaults give them the generic `MoreHorizontal` icon and neutral gray, identical to today's fallback.
- All RLS policies remain user-scoped; UPDATE policy added.
- No business-logic changes to transactions, budgets, or transfers — purely categorization + settings reorganization.

---

## Files Touched

- `supabase/migrations/<new>.sql` (icon/color columns + UPDATE policy)
- `src/lib/category-icons.ts` (icon palette, picker data, resolver upgrade)
- `src/components/IconPicker.tsx` (new)
- `src/lib/budget-context.tsx` (shape change, edit/delete category)
- `src/pages/Settings.tsx` (new)
- `src/pages/Profile.tsx` (trim)
- `src/pages/Budget.tsx` (remove add-category dialog, use new shape)
- `src/pages/Expenses.tsx`, `src/pages/Recurring.tsx`, `src/pages/OtherBudgetDetail.tsx`, `src/components/TransferDialog.tsx` (consume new shape)
- `src/App.tsx` (add `/settings` route)
- `src/components/layout/AppLayout.tsx` (add Settings nav item)

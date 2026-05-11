## Goal

1. Add a set of named color themes that apply only in **light mode**, gated to Pro users, selectable from the Settings page.
2. Update the Landing page features list to reflect what now exists (Settings module, custom categories with icons, transfer linkage, themes).

## Themes to ship (light-mode only)

Each theme overrides the `:root` HSL tokens (`--primary`, `--background`, `--accent`, `--ring`, `--gradient-hero`, `--sidebar-primary`, etc.) without touching the `.dark` block.

- **Default** — current emerald/mint Budget Bro look
- **Iron Man** — crimson red + gold accent, warm cream background
- **Captain America** — navy blue + red, white background
- **Doctor Strange** — deep maroon + mystic gold, warm beige
- **Harry Potter** — Gryffindor scarlet + gold, parchment background
- **The Flash** — bright scarlet + lightning yellow, off-white
- **Ben 10** — Omnitrix green + black accent, light grey

All values authored as HSL tokens, semantic — no hardcoded colors in components.

## Changes

### 1. CSS (`src/index.css`)
Add theme classes scoped to non-dark mode:

```css
:root[data-theme="ironman"]:not(.dark) {
  --primary: 0 75% 45%;
  --primary-foreground: 45 95% 55%;
  --background: 35 30% 97%;
  --accent: 45 95% 50%;
  --ring: 0 75% 45%;
  --sidebar-primary: 0 75% 45%;
  --gradient-hero: linear-gradient(135deg, hsl(0,75%,45%) 0%, hsl(45,95%,55%) 100%);
  /* ...sidebar/secondary/shadow tweaks */
}
/* repeat block for captain, strange, potter, flash, ben10 */
```

`.dark` block stays untouched, so dark mode always renders the default palette regardless of selected theme. Theme is purely cosmetic — no business logic shifts.

### 2. Persistence (`src/lib/budget-context.tsx`)
- Add `theme: string` (default `'default'`) to local state, persisted in `localStorage` under `bb-theme` (matches existing dark-mode pattern — no DB migration).
- Expose `theme` and `setTheme(name)` from the context.
- On mount and on change: if `isDark` → remove `data-theme` attribute from `<html>`; else set `document.documentElement.dataset.theme = theme`.
- Also patch the anti-flicker script in `index.html` to read `bb-theme` and set the attribute before paint (only when not dark).

### 3. Settings page (`src/pages/Settings.tsx`)
Add a new **Appearance** card right after Preferences with:
- Existing Dark Mode switch moves into this card.
- New "Color Theme" grid of 7 swatches (Default + 6 superheroes). Each swatch shows the theme name and a 2-color preview pill.
- The whole theme picker is gated like other Pro features:
  - Free users: swatches disabled with `Lock` icon, helper text "Upgrade to Pro to unlock themes".
  - Selecting a theme calls `setTheme(name)` and toasts "Theme: <name>".
- Disabled visual when `isDark` is on, with caption "Themes apply in light mode only."

### 4. Landing page features (`src/pages/Landing.tsx`)
Refresh the `features` array to reflect current product:
- Add: **Custom Categories** (icons + colors), **Linked Transfers** (delete one, both go), **Settings Hub** (currency, themes, features), **Pro Themes** (superhero palettes).
- Keep: Smart Analytics, Expense Tracking, Income vs Expense, Import from Month, Recurring, Savings Goals, Yearly Insights, Excel Export, PWA, Secure, Fast.
- Reorder so newest/most-used surface in the first row.

Also update the Pro section copy on Landing (if a tier comparison block exists) to list "Custom themes" alongside expense tracking and cross-budget transfers.

## Out of scope

- No DB schema change (theme stored locally, like dark mode).
- No new theme assets/illustrations — purely token-based recoloring.
- Dark-mode variants of each theme — explicitly skipped per request.

## Technical notes

- Tokens stay HSL strings so Tailwind's `hsl(var(--token))` keeps working untouched.
- Switching theme is instant (CSS attribute toggle), no reload.
- Grandfathered Pro logic in `budget-context` already gates `isPro`; reuse the same flag for theme picker.

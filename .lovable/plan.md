

## Plan: UI/UX Revamp — Inspired by Reference Design

### Design Direction (from reference image)
The reference shows a clean, modern budget app with: warm orange/coral accent color, personalized casual greeting ("Yo, [Name]!"), prominent circular donut chart for budget summary, transaction list with colored category icons, spacious white cards with soft shadows, and a polished mobile-first feel.

### Color Theme Change
**File: `src/index.css`** — Update CSS variables
- Primary: emerald/teal → warm orange/coral (`24 95% 53%` / `#F97316`-ish)
- Keep success green, destructive red
- Accent: adjust to complement orange
- Sidebar: dark charcoal/slate instead of dark teal
- Card shadows: softer, more elevated feel
- Border radius: increase to `1rem` for rounder cards
- Update gradient vars to orange-based

### Tailwind Config
**File: `tailwind.config.ts`** — No structural changes needed (colors come from CSS vars)

### Sidebar & Layout Revamp
**File: `src/components/layout/AppLayout.tsx`**
- Lighter sidebar on desktop (white/light gray instead of dark), matching reference
- Cleaner nav items with icon-only collapsed state consideration
- User profile avatar more prominent at bottom
- Mobile header: cleaner with brand mark

### Dashboard Redesign
**File: `src/pages/Dashboard.tsx`**
- Add personalized greeting: "Yo, {username}! Your financial overview. 📈" (matching reference tone)
- Replace summary grid cards with a hero section: large donut chart showing total budget allocation (like "Total Budget Spent" in reference) + summary sidebar
- Recent transactions list below with colored category icon circles (each category gets a color-coded round icon)
- Monthly trend chart stays but with updated colors (orange bars)
- 5 summary cards → redesigned as a compact "Overview" panel

### Budget Page Polish
**File: `src/pages/Budget.tsx`**
- Transaction rows: add colored category icon circles (round colored backgrounds with category icons)
- "Add Entry" button: orange/coral CTA style, full-width on mobile
- Cleaner tab styling

### Landing Page Update
**File: `src/pages/Landing.tsx`**
- Update hero gradient to orange
- Update preview mock data colors
- CTA buttons in orange

### Login/Register Pages
**Files: `src/pages/Login.tsx`, `src/pages/Register.tsx`**
- Brand icon color update (follows new primary)
- No structural changes

### Analytics, YearlyInsights, SavingsGoals, Recurring, Profile
- Update chart colors to use new orange palette
- Score gauge color in YearlyInsights updates via CSS vars
- No structural changes — just inherits new theme

### Category Icons Map (New)
**File: `src/lib/category-icons.ts`** — New utility
- Map category names to Lucide icons + background colors for the colored circle treatment
- e.g., `Groceries → { icon: ShoppingCart, bg: '#10B981' }`, `Dining Out → { icon: Utensils, bg: '#F59E0B' }`
- Used across Dashboard and Budget transaction lists

### Summary of Changes

| File | Type | What Changes |
|------|------|-------------|
| `src/index.css` | Edit | Color scheme: orange primary, lighter feel, rounder radius |
| `src/lib/category-icons.ts` | New | Category → icon + color mapping |
| `src/components/layout/AppLayout.tsx` | Edit | Lighter sidebar, cleaner styling |
| `src/pages/Dashboard.tsx` | Edit | Greeting header, donut hero, colored transaction list |
| `src/pages/Budget.tsx` | Edit | Colored category icons on entries, CTA styling |
| `src/pages/Landing.tsx` | Edit | Orange theme, updated preview |
| `src/pages/Login.tsx` | Edit | Theme color inheritance |
| `src/pages/Register.tsx` | Edit | Theme color inheritance |
| `src/pages/Analytics.tsx` | Edit | Chart colors to orange palette |
| `src/pages/Recurring.tsx` | Edit | Minor label + color updates |
| `src/pages/YearlyInsights.tsx` | Edit | Inherits new colors |
| `src/pages/SavingsGoals.tsx` | Edit | Inherits new colors |
| `src/pages/Profile.tsx` | Edit | Inherits new colors |

### All existing features preserved
No logic, calculations, database, or routing changes. Pure visual/UX layer update.


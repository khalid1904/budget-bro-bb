

## Plan: Revert Color Scheme to Emerald/Teal

Keep all the new UI/UX design (layout, donut chart, greeting, category icons, typography, shadows) but switch colors back to emerald/teal.

### Changes

**1. `src/index.css`** — Swap all orange/coral HSL values back to emerald/teal:
- Light mode primary: `24 95% 53%` → `160 84% 39%` (emerald ~`#10B981`)
- Secondary: orange tints → teal tints
- Ring: match primary
- Sidebar primary/ring/accent: same emerald swap
- Gradient-hero: orange gradient → emerald-to-teal gradient
- Gradient-card: orange tint → teal tint
- Dark mode: same pattern, slightly lighter emerald for dark

**2. `src/pages/Dashboard.tsx`** — Update hardcoded chart colors:
- `CHART_COLORS[0]`: `hsl(24, 95%, 53%)` → `hsl(160, 84%, 39%)`
- `donutColors`: swap orange entry to emerald
- Bar chart spending fill: orange → emerald/teal

**3. `src/pages/Analytics.tsx`** — Update hardcoded chart colors:
- `COLORS[0]`: orange → emerald
- Surplus line stroke: orange → emerald

**4. `src/lib/category-icons.ts`** — Change the Savings category icon bg from orange to a different color (e.g. gold/amber) so it doesn't clash with primary.

No structural, layout, or logic changes. Pure color swap.


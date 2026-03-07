import {
  Briefcase, Building, TrendingUp, Coins, Laptop, HelpCircle,
  Home, Zap, ShoppingCart, PiggyBank, Car, Film, HeartPulse, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

interface CategoryIconConfig {
  icon: LucideIcon;
  bg: string; // HSL background color
  fg: string; // foreground (icon) color
}

const CATEGORY_MAP: Record<string, CategoryIconConfig> = {
  // Incoming
  'Salary':          { icon: Briefcase,     bg: 'hsl(142, 71%, 45%)', fg: '#fff' },
  'Rental Income':   { icon: Building,      bg: 'hsl(200, 60%, 50%)', fg: '#fff' },
  'Business Profit': { icon: TrendingUp,    bg: 'hsl(280, 60%, 50%)', fg: '#fff' },
  'Investments':     { icon: Coins,         bg: 'hsl(38, 92%, 50%)',  fg: '#fff' },
  'Freelance':       { icon: Laptop,        bg: 'hsl(160, 60%, 40%)', fg: '#fff' },

  // Outgoing
  'Rent':            { icon: Home,          bg: 'hsl(220, 60%, 55%)', fg: '#fff' },
  'Bills':           { icon: Zap,           bg: 'hsl(340, 65%, 50%)', fg: '#fff' },
  'Groceries':       { icon: ShoppingCart,  bg: 'hsl(142, 71%, 45%)', fg: '#fff' },
  'Savings':         { icon: PiggyBank,     bg: 'hsl(38, 92%, 50%)',  fg: '#fff' },
  'Transport':       { icon: Car,           bg: 'hsl(200, 60%, 50%)', fg: '#fff' },
  'Entertainment':   { icon: Film,          bg: 'hsl(280, 60%, 50%)', fg: '#fff' },
  'Healthcare':      { icon: HeartPulse,    bg: 'hsl(0, 72%, 51%)',   fg: '#fff' },
};

const DEFAULT_CONFIG: CategoryIconConfig = {
  icon: MoreHorizontal,
  bg: 'hsl(220, 10%, 46%)',
  fg: '#fff',
};

export function getCategoryIcon(category: string): CategoryIconConfig {
  return CATEGORY_MAP[category] || DEFAULT_CONFIG;
}

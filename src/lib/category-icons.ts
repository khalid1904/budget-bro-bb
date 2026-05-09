import {
  Briefcase, Building, TrendingUp, Coins, Laptop,
  Home, Zap, ShoppingCart, PiggyBank, Car, Film, HeartPulse, MoreHorizontal,
  Wallet, CreditCard, DollarSign, Banknote, Receipt, Gift,
  Coffee, Utensils, Pizza, Wine, Beer, IceCream,
  Plane, Train, Bus, Bike, Fuel, ParkingCircle,
  ShoppingBag, Shirt, Smartphone, Monitor, Headphones, Gamepad2,
  Stethoscope, Pill, Dumbbell, Activity, BookOpen, GraduationCap,
  Music, Tv, Camera, Palette, Brush, Trophy,
  PawPrint, Baby, Users, Heart, Star, Sparkles,
  Sun, Cloud, Droplet, Trees, Mountain, Tent,
  Hammer, Wrench, Package, Truck, Building2,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryIconConfig {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

// Library of icons available in the picker
export const ICON_LIBRARY: Record<string, LucideIcon> = {
  // Money
  Briefcase, Building, TrendingUp, Coins, Laptop, Wallet, CreditCard, DollarSign, Banknote, Receipt, Gift,
  // Food
  Coffee, Utensils, Pizza, Wine, Beer, IceCream, ShoppingCart,
  // Transport
  Car, Plane, Train, Bus, Bike, Fuel, ParkingCircle, Truck,
  // Shopping & Tech
  ShoppingBag, Shirt, Smartphone, Monitor, Headphones, Gamepad2, Package,
  // Health
  HeartPulse, Stethoscope, Pill, Dumbbell, Activity,
  // Education
  BookOpen, GraduationCap,
  // Entertainment
  Film, Music, Tv, Camera, Palette, Brush, Trophy,
  // Home
  Home, Zap, Hammer, Wrench, Building2,
  // People
  PawPrint, Baby, Users, Heart, Star, Sparkles,
  // Nature/Travel
  Sun, Cloud, Droplet, Trees, Mountain, Tent,
  // Savings
  PiggyBank,
  // Misc
  MoreHorizontal,
};

export const ICON_NAMES = Object.keys(ICON_LIBRARY);

export const COLOR_PRESETS: string[] = [
  'hsl(160, 84%, 39%)', // emerald (brand)
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)',  // amber
  'hsl(0, 72%, 51%)',   // red
  'hsl(340, 65%, 50%)', // pink
  'hsl(280, 60%, 50%)', // purple
  'hsl(220, 60%, 55%)', // blue
  'hsl(200, 60%, 50%)', // sky
  'hsl(180, 60%, 40%)', // teal
  'hsl(20, 75%, 50%)',  // orange
  'hsl(50, 90%, 50%)',  // yellow
  'hsl(220, 10%, 46%)', // gray
];

const PREDEFINED_MAP: Record<string, CategoryIconConfig> = {
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

// Module-level registry for custom categories (kept in sync by BudgetProvider)
let CUSTOM_REGISTRY: Record<string, { icon: string; color: string }> = {};

export function setCustomCategoryRegistry(map: Record<string, { icon: string; color: string }>) {
  CUSTOM_REGISTRY = map;
}

export function resolveIcon(iconName: string): LucideIcon {
  return ICON_LIBRARY[iconName] || MoreHorizontal;
}

export function getCategoryIcon(category: string): CategoryIconConfig {
  if (PREDEFINED_MAP[category]) return PREDEFINED_MAP[category];
  const custom = CUSTOM_REGISTRY[category];
  if (custom) {
    return { icon: resolveIcon(custom.icon), bg: custom.color, fg: '#fff' };
  }
  return DEFAULT_CONFIG;
}

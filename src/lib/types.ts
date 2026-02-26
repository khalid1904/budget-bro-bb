export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: 'incoming' | 'outgoing';
}

export interface MonthBudget {
  id: string;
  month: string; // YYYY-MM format
  transactions: Transaction[];
}

export interface UserProfile {
  username: string;
  email: string;
  bio: string;
  avatar: string;
}

export const DEFAULT_INCOMING_CATEGORIES = [
  'Salary', 'Rental Income', 'Business Profit', 'Investments', 'Freelance', 'Other'
];

export const DEFAULT_OUTGOING_CATEGORIES = [
  'Rent', 'Bills', 'Groceries', 'Savings', 'Investments', 'Transport', 'Entertainment', 'Healthcare', 'Other'
];

export const AVATAR_PRESETS = [
  '💼', '🧑‍💻', '👩‍🎨', '🧑‍🚀', '👩‍🔬', '🧑‍🍳', '🦊', '🐱', '🌿', '⚡', '🎯', '💎'
];

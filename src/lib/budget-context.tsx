import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, MonthBudget, UserProfile } from './types';

interface BudgetContextType {
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  budgets: MonthBudget[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  editTransaction: (id: string, tx: Partial<Transaction>) => void;
  getCurrentBudget: () => MonthBudget | undefined;
  getTotalIncoming: () => number;
  getTotalOutgoing: () => number;
  getInHand: () => number;
  isLoggedIn: boolean;
  login: (username: string, password: string) => boolean;
  register: (username: string, email: string, password: string) => boolean;
  logout: () => void;
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
  customCategories: { incoming: string[]; outgoing: string[] };
  addCategory: (type: 'incoming' | 'outgoing', cat: string) => void;
  isDark: boolean;
  toggleDark: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [budgets, setBudgets] = useState<MonthBudget[]>(() => loadFromStorage('budgets', []));
  const [isLoggedIn, setIsLoggedIn] = useState(() => loadFromStorage('isLoggedIn', false));
  const [profile, setProfile] = useState<UserProfile>(() => loadFromStorage('profile', {
    username: '', email: '', bio: '', avatar: '💼'
  }));
  const [customCategories, setCustomCategories] = useState(() => loadFromStorage('customCategories', {
    incoming: [] as string[], outgoing: [] as string[]
  }));
  const [isDark, setIsDark] = useState(() => loadFromStorage('darkMode', false));

  useEffect(() => { localStorage.setItem('budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn)); }, [isLoggedIn]);
  useEffect(() => { localStorage.setItem('profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('customCategories', JSON.stringify(customCategories)); }, [customCategories]);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(isDark)); }, [isDark]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const getCurrentBudget = useCallback(() => budgets.find(b => b.month === currentMonth), [budgets, currentMonth]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const id = crypto.randomUUID();
    setBudgets(prev => {
      const existing = prev.find(b => b.month === currentMonth);
      if (existing) {
        return prev.map(b => b.month === currentMonth
          ? { ...b, transactions: [...b.transactions, { ...tx, id }] }
          : b
        );
      }
      return [...prev, { id: crypto.randomUUID(), month: currentMonth, transactions: [{ ...tx, id }] }];
    });
  }, [currentMonth]);

  const deleteTransaction = useCallback((id: string) => {
    setBudgets(prev => prev.map(b => ({
      ...b,
      transactions: b.transactions.filter(t => t.id !== id)
    })));
  }, []);

  const editTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setBudgets(prev => prev.map(b => ({
      ...b,
      transactions: b.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
    })));
  }, []);

  const getTotalIncoming = useCallback(() => {
    const budget = budgets.find(b => b.month === currentMonth);
    return budget?.transactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0) ?? 0;
  }, [budgets, currentMonth]);

  const getTotalOutgoing = useCallback(() => {
    const budget = budgets.find(b => b.month === currentMonth);
    return budget?.transactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0) ?? 0;
  }, [budgets, currentMonth]);

  const getInHand = useCallback(() => getTotalIncoming() - getTotalOutgoing(), [getTotalIncoming, getTotalOutgoing]);

  const login = useCallback((username: string, _password: string) => {
    setIsLoggedIn(true);
    setProfile(p => ({ ...p, username: username || p.username }));
    return true;
  }, []);

  const register = useCallback((username: string, email: string, _password: string) => {
    setIsLoggedIn(true);
    setProfile({ username, email, bio: '', avatar: '💼' });
    return true;
  }, []);

  const logout = useCallback(() => { setIsLoggedIn(false); }, []);
  const updateProfile = useCallback((p: Partial<UserProfile>) => setProfile(prev => ({ ...prev, ...p })), []);
  const addCategory = useCallback((type: 'incoming' | 'outgoing', cat: string) => {
    setCustomCategories((prev: { incoming: string[]; outgoing: string[] }) => ({
      ...prev,
      [type]: [...prev[type], cat]
    }));
  }, []);
  const toggleDark = useCallback(() => setIsDark((d: boolean) => !d), []);

  return (
    <BudgetContext.Provider value={{
      currentMonth, setCurrentMonth, budgets, addTransaction, deleteTransaction, editTransaction,
      getCurrentBudget, getTotalIncoming, getTotalOutgoing, getInHand,
      isLoggedIn, login, register, logout, profile, updateProfile,
      customCategories, addCategory, isDark, toggleDark
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  username: string;
  email: string;
  bio: string;
  avatar: string;
  tier: string;
}

interface Settings {
  default_currency: string;
  dark_mode: boolean;
  expense_tracking_enabled: boolean;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: string;
  month: string;
  goal_id?: string | null;
}

interface SavingsGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  start_date: string;
  target_date: string | null;
  description: string;
  status: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  month: string;
  budget_transaction_id?: string | null;
  notes?: string;
}

interface OtherBudget {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface OtherBudgetTxn {
  id: string;
  other_budget_id: string;
  title: string;
  amount: number;
  category: string;
  type: 'incoming' | 'outgoing';
  date: string;
  goal_id?: string | null;
}

interface BudgetContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile;
  settings: Settings;
  transactions: Transaction[];
  customCategories: { incoming: string[]; outgoing: string[] };
  currentMonth: string;
  setCurrentMonth: (m: string) => void;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (type: 'incoming' | 'outgoing', name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isDark: boolean;
  toggleDark: () => void;
  formatCurrency: (n: number) => string;
  savingsGoals: SavingsGoal[];
  refreshGoals: () => Promise<void>;
  addGoal: (g: { goal_name: string; target_amount: number; target_date: string | null; description: string }) => Promise<void>;
  editGoal: (id: string, g: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  expenses: Expense[];
  refreshExpenses: () => Promise<void>;
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>;
  editExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  otherBudgets: OtherBudget[];
  otherBudgetTxns: OtherBudgetTxn[];
  refreshOtherBudgets: () => Promise<void>;
  refreshOtherBudgetTxns: () => Promise<void>;
  addOtherBudget: (b: { name: string; description: string }) => Promise<OtherBudget | null>;
  editOtherBudget: (id: string, b: Partial<OtherBudget>) => Promise<void>;
  deleteOtherBudget: (id: string) => Promise<void>;
  addOtherBudgetTxn: (t: Omit<OtherBudgetTxn, 'id'>) => Promise<void>;
  editOtherBudgetTxn: (id: string, t: Partial<OtherBudgetTxn>) => Promise<void>;
  deleteOtherBudgetTxn: (id: string) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const CURRENCIES: Record<string, { locale: string; currency: string }> = {
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  GBP: { locale: 'en-GB', currency: 'GBP' },
  INR: { locale: 'en-IN', currency: 'INR' },
  JPY: { locale: 'ja-JP', currency: 'JPY' },
  CAD: { locale: 'en-CA', currency: 'CAD' },
  AUD: { locale: 'en-AU', currency: 'AUD' },
  CHF: { locale: 'de-CH', currency: 'CHF' },
  CNY: { locale: 'zh-CN', currency: 'CNY' },
  BRL: { locale: 'pt-BR', currency: 'BRL' },
};

export { CURRENCIES };

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ username: '', email: '', bio: '', avatar: '🦸', tier: 'free' });
  const [settings, setSettings] = useState<Settings>({ default_currency: 'INR', dark_mode: false, expense_tracking_enabled: false });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<{ incoming: string[]; outgoing: string[] }>({ incoming: [], outgoing: [] });
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [otherBudgets, setOtherBudgets] = useState<OtherBudget[]>([]);
  const [otherBudgetTxns, setOtherBudgetTxns] = useState<OtherBudgetTxn[]>([]);
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) return JSON.parse(stored);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) setProfile({ username: data.username, email: data.email, bio: data.bio, avatar: data.avatar, tier: (data as any).tier || 'free' });
  }, [user]);

  const [initialSettingsLoaded, setInitialSettingsLoaded] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (data) {
      setSettings({ default_currency: data.default_currency, dark_mode: data.dark_mode, expense_tracking_enabled: (data as any).expense_tracking_enabled ?? false });
      if (!initialSettingsLoaded) {
        const stored = localStorage.getItem('darkMode');
        if (stored === null) {
          setIsDark(data.dark_mode);
        }
        setInitialSettingsLoaded(true);
      }
    }
  }, [user, initialSettingsLoaded]);

  const refreshTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (data) setTransactions(data.map(t => ({ ...t, amount: Number(t.amount), goal_id: (t as any).goal_id ?? null })));
  }, [user]);

  const refreshCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('custom_categories').select('*').eq('user_id', user.id);
    if (data) {
      const incoming = data.filter(c => c.type === 'incoming').map(c => c.name);
      const outgoing = data.filter(c => c.type === 'outgoing').map(c => c.name);
      setCustomCategories({ incoming, outgoing });
    }
  }, [user]);

  const refreshGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('savings_goals' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setSavingsGoals((data as any[]).map(g => ({
      id: g.id,
      goal_name: g.goal_name,
      target_amount: Number(g.target_amount),
      start_date: g.start_date,
      target_date: g.target_date,
      description: g.description || '',
      status: g.status,
    })));
  }, [user]);

  const refreshExpenses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('expenses' as any).select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (data) setExpenses((data as any[]).map(e => ({ id: e.id, title: e.title, amount: Number(e.amount), category: e.category, date: e.date, month: e.month, budget_transaction_id: e.budget_transaction_id, notes: e.notes || '' })));
  }, [user]);

  const refreshOtherBudgets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('other_budgets' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setOtherBudgets((data as any[]).map(b => ({ id: b.id, name: b.name, description: b.description || '', created_at: b.created_at })));
  }, [user]);

  const refreshOtherBudgetTxns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('other_budget_transactions' as any).select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (data) setOtherBudgetTxns((data as any[]).map(t => ({
      id: t.id, other_budget_id: t.other_budget_id, title: t.title, amount: Number(t.amount),
      category: t.category, type: t.type, date: t.date, goal_id: t.goal_id ?? null,
    })));
  }, [user]);

  const addOtherBudget = useCallback(async (b: { name: string; description: string }) => {
    if (!user) return null;
    const { data } = await supabase.from('other_budgets' as any).insert({ user_id: user.id, name: b.name, description: b.description } as any).select().single();
    if (data) {
      const d = data as any;
      const nb: OtherBudget = { id: d.id, name: d.name, description: d.description || '', created_at: d.created_at };
      setOtherBudgets(prev => [nb, ...prev]);
      return nb;
    }
    return null;
  }, [user]);

  const editOtherBudget = useCallback(async (id: string, updates: Partial<OtherBudget>) => {
    if (!user) return;
    await supabase.from('other_budgets' as any).update(updates as any).eq('id', id).eq('user_id', user.id);
    setOtherBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [user]);

  const deleteOtherBudget = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('other_budgets' as any).delete().eq('id', id).eq('user_id', user.id);
    setOtherBudgets(prev => prev.filter(b => b.id !== id));
    setOtherBudgetTxns(prev => prev.filter(t => t.other_budget_id !== id));
  }, [user]);

  const addOtherBudgetTxn = useCallback(async (t: Omit<OtherBudgetTxn, 'id'>) => {
    if (!user) return;
    const payload: any = { ...t, user_id: user.id, goal_id: t.goal_id || null };
    const { data } = await supabase.from('other_budget_transactions' as any).insert(payload).select().single();
    if (data) {
      const d = data as any;
      setOtherBudgetTxns(prev => [{
        id: d.id, other_budget_id: d.other_budget_id, title: d.title, amount: Number(d.amount),
        category: d.category, type: d.type, date: d.date, goal_id: d.goal_id ?? null,
      }, ...prev]);
    }
  }, [user]);

  const editOtherBudgetTxn = useCallback(async (id: string, updates: Partial<OtherBudgetTxn>) => {
    if (!user) return;
    const payload: any = { ...updates };
    if ('goal_id' in updates) payload.goal_id = updates.goal_id || null;
    await supabase.from('other_budget_transactions' as any).update(payload).eq('id', id).eq('user_id', user.id);
    setOtherBudgetTxns(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [user]);

  const deleteOtherBudgetTxn = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('other_budget_transactions' as any).delete().eq('id', id).eq('user_id', user.id);
    setOtherBudgetTxns(prev => prev.filter(t => t.id !== id));
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
      refreshSettings();
      refreshTransactions();
      refreshCategories();
      refreshGoals();
      refreshExpenses();
      refreshOtherBudgets();
      refreshOtherBudgetTxns();
    }
  }, [user, refreshProfile, refreshSettings, refreshTransactions, refreshCategories, refreshGoals, refreshExpenses, refreshOtherBudgets, refreshOtherBudgetTxns]);

  const updateProfile = useCallback(async (p: Partial<Profile>) => {
    if (!user) return;
    await supabase.from('profiles').update(p).eq('user_id', user.id);
    setProfile(prev => ({ ...prev, ...p }));
  }, [user]);

  const updateSettings = useCallback(async (s: Partial<Settings>) => {
    if (!user) return;
    await supabase.from('user_settings').update(s).eq('user_id', user.id);
    setSettings(prev => ({ ...prev, ...s }));
    if (s.dark_mode !== undefined) setIsDark(s.dark_mode);
  }, [user]);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const payload: any = { ...tx, user_id: user.id };
    if (tx.goal_id) payload.goal_id = tx.goal_id;
    const { data } = await supabase.from('transactions').insert(payload).select().single();
    if (data) setTransactions(prev => [{ ...data, amount: Number(data.amount), goal_id: (data as any).goal_id ?? null }, ...prev]);
  }, [user]);

  const editTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    const payload: any = { ...updates };
    // Handle goal_id explicitly - allow setting to null
    if ('goal_id' in updates) payload.goal_id = updates.goal_id || null;
    await supabase.from('transactions').update(payload).eq('id', id).eq('user_id', user.id);
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [user]);

  const addCategory = useCallback(async (type: 'incoming' | 'outgoing', name: string) => {
    if (!user) return;
    await supabase.from('custom_categories').insert({ user_id: user.id, name, type });
    setCustomCategories(prev => ({ ...prev, [type]: [...prev[type], name] }));
  }, [user]);

  const addGoal = useCallback(async (g: { goal_name: string; target_amount: number; target_date: string | null; description: string }) => {
    if (!user) return;
    const { data } = await supabase.from('savings_goals' as any).insert({
      user_id: user.id,
      goal_name: g.goal_name,
      target_amount: g.target_amount,
      target_date: g.target_date,
      description: g.description,
    } as any).select().single();
    if (data) {
      const d = data as any;
      setSavingsGoals(prev => [{
        id: d.id,
        goal_name: d.goal_name,
        target_amount: Number(d.target_amount),
        start_date: d.start_date,
        target_date: d.target_date,
        description: d.description || '',
        status: d.status,
      }, ...prev]);
    }
  }, [user]);

  const editGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    if (!user) return;
    await supabase.from('savings_goals' as any).update(updates as any).eq('id', id).eq('user_id', user.id);
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [user]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('savings_goals' as any).delete().eq('id', id).eq('user_id', user.id);
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  }, [user]);

  const addExpense = useCallback(async (e: Omit<Expense, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('expenses' as any).insert({ ...e, user_id: user.id } as any).select().single();
    if (data) {
      const d = data as any;
      setExpenses(prev => [{ id: d.id, title: d.title, amount: Number(d.amount), category: d.category, date: d.date, month: d.month, budget_transaction_id: d.budget_transaction_id, notes: d.notes || '' }, ...prev]);
    }
  }, [user]);

  const editExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!user) return;
    await supabase.from('expenses' as any).update(updates as any).eq('id', id).eq('user_id', user.id);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('expenses' as any).delete().eq('id', id).eq('user_id', user.id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const toggleDark = useCallback(() => {
    const newVal = !isDark;
    setIsDark(newVal);
    if (user) {
      supabase.from('user_settings').update({ dark_mode: newVal }).eq('user_id', user.id);
    }
  }, [isDark, user]);

  const formatCurrency = useCallback((n: number) => {
    const c = CURRENCIES[settings.default_currency] || CURRENCIES.USD;
    return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency, maximumFractionDigits: 2 }).format(n);
  }, [settings.default_currency]);

  return (
    <BudgetContext.Provider value={{
      user, session, loading, profile, settings, transactions, customCategories,
      currentMonth, setCurrentMonth, refreshProfile, refreshSettings, refreshTransactions, refreshCategories,
      updateProfile, updateSettings, addTransaction, editTransaction, deleteTransaction,
      addCategory, signOut, isDark, toggleDark, formatCurrency,
      savingsGoals, refreshGoals, addGoal, editGoal, deleteGoal,
      expenses, refreshExpenses, addExpense, editExpense, deleteExpense,
      otherBudgets, otherBudgetTxns, refreshOtherBudgets, refreshOtherBudgetTxns,
      addOtherBudget, editOtherBudget, deleteOtherBudget,
      addOtherBudgetTxn, editOtherBudgetTxn, deleteOtherBudgetTxn,
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

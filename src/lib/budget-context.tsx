import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  username: string;
  email: string;
  bio: string;
  avatar: string;
}

interface Settings {
  default_currency: string;
  dark_mode: boolean;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: string;
  month: string;
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
  const [profile, setProfile] = useState<Profile>({ username: '', email: '', bio: '', avatar: '🦸' });
  const [settings, setSettings] = useState<Settings>({ default_currency: 'INR', dark_mode: false });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<{ incoming: string[]; outgoing: string[] }>({ incoming: [], outgoing: [] });
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
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
    if (data) setProfile({ username: data.username, email: data.email, bio: data.bio, avatar: data.avatar });
  }, [user]);

  const [initialSettingsLoaded, setInitialSettingsLoaded] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
    if (data) {
      setSettings({ default_currency: data.default_currency, dark_mode: data.dark_mode });
      // Only apply DB dark_mode on first load if no localStorage override exists
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
    if (data) setTransactions(data.map(t => ({ ...t, amount: Number(t.amount) })));
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

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
      refreshSettings();
      refreshTransactions();
      refreshCategories();
    }
  }, [user, refreshProfile, refreshSettings, refreshTransactions, refreshCategories]);

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
    const { data } = await supabase.from('transactions').insert({ ...tx, user_id: user.id }).select().single();
    if (data) setTransactions(prev => [{ ...data, amount: Number(data.amount) }, ...prev]);
  }, [user]);

  const editTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    await supabase.from('transactions').update(updates).eq('id', id).eq('user_id', user.id);
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
      addCategory, signOut, isDark, toggleDark, formatCurrency
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

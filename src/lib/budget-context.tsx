import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { setCustomCategoryRegistry } from '@/lib/category-icons';

export interface CustomCategoryRecord {
  id: string;
  name: string;
  type: 'incoming' | 'outgoing';
  icon: string;
  color: string;
}

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
  cross_budget_transfers_enabled: boolean;
  lending_enabled: boolean;
}

export interface Loan {
  id: string;
  borrower_name: string;
  amount: number;
  lent_date: string;
  note: string;
  created_at: string;
  linked_transaction_id?: string | null;
  linked_other_budget_txn_id?: string | null;
}

export interface LoanRecovery {
  id: string;
  loan_id: string;
  amount: number;
  recovered_date: string;
  note: string;
  linked_transaction_id?: string | null;
  linked_other_budget_txn_id?: string | null;
}

export type LendingLink =
  | { kind: 'monthly'; month: string }
  | { kind: 'other'; other_budget_id: string }
  | null;

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: string;
  month: string;
  goal_id?: string | null;
  transfer_ref_id?: string | null;
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
  transfer_ref_id?: string | null;
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
  addCategory: (type: 'incoming' | 'outgoing', name: string, icon?: string, color?: string) => Promise<void>;
  editCategory: (id: string, updates: { name?: string; icon?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  customCategoryRecords: { incoming: CustomCategoryRecord[]; outgoing: CustomCategoryRecord[] };
  signOut: () => Promise<void>;
  isDark: boolean;
  toggleDark: () => void;
  theme: string;
  setTheme: (name: string) => void;
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
  createTransfer: (params: {
    direction: 'other_to_monthly' | 'monthly_to_other';
    otherBudgetId: string;
    month: string;
    amount: number;
    title: string;
    date: string;
    sourceCategory: string;
    destCategory: string;
  }) => Promise<void>;
  loans: Loan[];
  loanRecoveries: LoanRecovery[];
  refreshLoans: () => Promise<void>;
  refreshLoanRecoveries: () => Promise<void>;
  addLoan: (l: { borrower_name: string; amount: number; lent_date: string; note: string }, link?: LendingLink) => Promise<void>;
  editLoan: (id: string, updates: Partial<Loan>, link?: LendingLink | undefined) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addRecovery: (r: { loan_id: string; amount: number; recovered_date: string; note: string }, link?: LendingLink) => Promise<void>;
  deleteRecovery: (id: string) => Promise<void>;
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
  const [settings, setSettings] = useState<Settings>({ default_currency: 'INR', dark_mode: false, expense_tracking_enabled: false, cross_budget_transfers_enabled: false, lending_enabled: false });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRecoveries, setLoanRecoveries] = useState<LoanRecovery[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<{ incoming: string[]; outgoing: string[] }>({ incoming: [], outgoing: [] });
  const [customCategoryRecords, setCustomCategoryRecords] = useState<{ incoming: CustomCategoryRecord[]; outgoing: CustomCategoryRecord[] }>({ incoming: [], outgoing: [] });
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
  const [theme, setThemeState] = useState<string>(() => {
    try { return localStorage.getItem('bb-theme') || 'default'; } catch { return 'default'; }
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

  // Dark mode + theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (!isDark && theme && theme !== 'default') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    try { localStorage.setItem('bb-theme', theme); } catch {}
  }, [theme, isDark]);

  const setTheme = useCallback((name: string) => setThemeState(name), []);

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
      setSettings({ default_currency: data.default_currency, dark_mode: data.dark_mode, expense_tracking_enabled: (data as any).expense_tracking_enabled ?? false, cross_budget_transfers_enabled: (data as any).cross_budget_transfers_enabled ?? false, lending_enabled: (data as any).lending_enabled ?? false });
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
    if (data) setTransactions(data.map(t => ({ ...t, amount: Number(t.amount), goal_id: (t as any).goal_id ?? null, transfer_ref_id: (t as any).transfer_ref_id ?? null })));
  }, [user]);

  const refreshCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('custom_categories').select('*').eq('user_id', user.id);
    if (data) {
      const records: CustomCategoryRecord[] = (data as any[]).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon || 'MoreHorizontal',
        color: c.color || 'hsl(220, 10%, 46%)',
      }));
      const incomingRecs = records.filter(c => c.type === 'incoming');
      const outgoingRecs = records.filter(c => c.type === 'outgoing');
      setCustomCategories({ incoming: incomingRecs.map(c => c.name), outgoing: outgoingRecs.map(c => c.name) });
      setCustomCategoryRecords({ incoming: incomingRecs, outgoing: outgoingRecs });
      const reg: Record<string, { icon: string; color: string }> = {};
      records.forEach(r => { reg[r.name] = { icon: r.icon, color: r.color }; });
      setCustomCategoryRegistry(reg);
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
      category: t.category, type: t.type, date: t.date, goal_id: t.goal_id ?? null, transfer_ref_id: t.transfer_ref_id ?? null,
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
    const row = otherBudgetTxns.find(t => t.id === id);
    const linkedId = row?.transfer_ref_id || null;
    await supabase.from('other_budget_transactions' as any).delete().eq('id', id).eq('user_id', user.id);
    setOtherBudgetTxns(prev => prev.filter(t => t.id !== id));
    if (linkedId) {
      await supabase.from('transactions').delete().eq('id', linkedId).eq('user_id', user.id);
      setTransactions(prev => prev.filter(t => t.id !== linkedId));
    } else {
      // Defensive: clean up any monthly txn pointing back to this row
      await supabase.from('transactions').delete().eq('transfer_ref_id', id).eq('user_id', user.id);
      setTransactions(prev => prev.filter(t => (t as any).transfer_ref_id !== id));
    }
    // Lending linkage: remove loan/recovery that references this budget entry
    await supabase.from('loans').delete().eq('linked_other_budget_txn_id', id).eq('user_id', user.id);
    await supabase.from('loan_recoveries').delete().eq('linked_other_budget_txn_id', id).eq('user_id', user.id);
    setLoans(prev => prev.filter(l => l.linked_other_budget_txn_id !== id));
    setLoanRecoveries(prev => prev.filter(r => r.linked_other_budget_txn_id !== id));
  }, [user, otherBudgetTxns]);

  const createTransfer = useCallback(async (params: {
    direction: 'other_to_monthly' | 'monthly_to_other';
    otherBudgetId: string;
    month: string;
    amount: number;
    title: string;
    date: string;
    sourceCategory: string;
    destCategory: string;
  }) => {
    if (!user) return;
    const { direction, otherBudgetId, month, amount, title, date, sourceCategory, destCategory } = params;
    if (direction === 'other_to_monthly') {
      // Source: outgoing on other_budget; Dest: incoming on monthly
      const { data: src } = await supabase.from('other_budget_transactions' as any).insert({
        user_id: user.id, other_budget_id: otherBudgetId, title, amount, category: sourceCategory, type: 'outgoing', date,
      } as any).select().single();
      if (!src) throw new Error('Failed to create source transfer');
      const { data: dst, error: dErr } = await supabase.from('transactions').insert({
        user_id: user.id, title, amount, category: destCategory, type: 'incoming', date, month, transfer_ref_id: (src as any).id,
      } as any).select().single();
      if (dErr || !dst) {
        await supabase.from('other_budget_transactions' as any).delete().eq('id', (src as any).id);
        throw dErr || new Error('Failed to create destination transfer');
      }
      await supabase.from('other_budget_transactions' as any).update({ transfer_ref_id: dst.id } as any).eq('id', (src as any).id);
      const s: any = src;
      setOtherBudgetTxns(prev => [{ id: s.id, other_budget_id: s.other_budget_id, title: s.title, amount: Number(s.amount), category: s.category, type: s.type, date: s.date, goal_id: null, transfer_ref_id: dst.id }, ...prev]);
      setTransactions(prev => [{ ...dst, amount: Number(dst.amount), goal_id: null, transfer_ref_id: (src as any).id } as any, ...prev]);
    } else {
      // Source: outgoing on monthly; Dest: incoming on other_budget
      const { data: src } = await supabase.from('transactions').insert({
        user_id: user.id, title, amount, category: sourceCategory, type: 'outgoing', date, month,
      } as any).select().single();
      if (!src) throw new Error('Failed to create source transfer');
      const { data: dst, error: dErr } = await supabase.from('other_budget_transactions' as any).insert({
        user_id: user.id, other_budget_id: otherBudgetId, title, amount, category: destCategory, type: 'incoming', date, transfer_ref_id: (src as any).id,
      } as any).select().single();
      if (dErr || !dst) {
        await supabase.from('transactions').delete().eq('id', (src as any).id);
        throw dErr || new Error('Failed to create destination transfer');
      }
      await supabase.from('transactions').update({ transfer_ref_id: (dst as any).id } as any).eq('id', (src as any).id);
      const d: any = dst;
      setTransactions(prev => [{ ...src, amount: Number(src.amount), goal_id: null, transfer_ref_id: d.id } as any, ...prev]);
      setOtherBudgetTxns(prev => [{ id: d.id, other_budget_id: d.other_budget_id, title: d.title, amount: Number(d.amount), category: d.category, type: d.type, date: d.date, goal_id: null, transfer_ref_id: (src as any).id }, ...prev]);
    }
  }, [user]);

  const refreshLoans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('loans').select('*').eq('user_id', user.id).order('lent_date', { ascending: false });
    if (data) setLoans((data as any[]).map(l => ({
      id: l.id, borrower_name: l.borrower_name, amount: Number(l.amount), lent_date: l.lent_date, note: l.note || '', created_at: l.created_at,
      linked_transaction_id: l.linked_transaction_id ?? null, linked_other_budget_txn_id: l.linked_other_budget_txn_id ?? null,
    })));
  }, [user]);

  const refreshLoanRecoveries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('loan_recoveries').select('*').eq('user_id', user.id).order('recovered_date', { ascending: false });
    if (data) setLoanRecoveries((data as any[]).map(r => ({
      id: r.id, loan_id: r.loan_id, amount: Number(r.amount), recovered_date: r.recovered_date, note: r.note || '',
      linked_transaction_id: r.linked_transaction_id ?? null, linked_other_budget_txn_id: r.linked_other_budget_txn_id ?? null,
    })));
  }, [user]);

  // Helpers to create / delete budget entries linked to lending records
  const ensureLendingCategory = useCallback(async (kind: 'lending' | 'recovery'): Promise<string> => {
    const name = kind === 'lending' ? 'Lending' : 'Loan Recovery';
    const type: 'incoming' | 'outgoing' = kind === 'lending' ? 'outgoing' : 'incoming';
    if (!user) return name;
    const existing = (kind === 'lending' ? customCategoryRecords.outgoing : customCategoryRecords.incoming).find(c => c.name === name);
    if (existing) return name;
    const icon = kind === 'lending' ? 'HandCoins' : 'TrendingUp';
    const color = 'hsl(160, 84%, 39%)';
    await supabase.from('custom_categories').insert({ user_id: user.id, name, type, icon, color } as any);
    await refreshCategories();
    return name;
  }, [user, customCategoryRecords, refreshCategories]);

  const createLinkedEntry = useCallback(async (params: {
    kind: 'lending' | 'recovery';
    link: LendingLink;
    title: string;
    amount: number;
    date: string;
  }): Promise<{ linked_transaction_id: string | null; linked_other_budget_txn_id: string | null }> => {
    if (!user || !params.link) return { linked_transaction_id: null, linked_other_budget_txn_id: null };
    const category = await ensureLendingCategory(params.kind);
    const type = params.kind === 'lending' ? 'outgoing' : 'incoming';
    if (params.link.kind === 'monthly') {
      const { data } = await supabase.from('transactions').insert({
        user_id: user.id, title: params.title, amount: params.amount, category, type, date: params.date, month: params.link.month,
      } as any).select().single();
      if (data) {
        const d = data as any;
        setTransactions(prev => [{ ...d, amount: Number(d.amount), goal_id: null, transfer_ref_id: null }, ...prev]);
        return { linked_transaction_id: d.id, linked_other_budget_txn_id: null };
      }
    } else {
      const { data } = await supabase.from('other_budget_transactions' as any).insert({
        user_id: user.id, other_budget_id: params.link.other_budget_id, title: params.title, amount: params.amount, category, type, date: params.date,
      } as any).select().single();
      if (data) {
        const d = data as any;
        setOtherBudgetTxns(prev => [{
          id: d.id, other_budget_id: d.other_budget_id, title: d.title, amount: Number(d.amount),
          category: d.category, type: d.type, date: d.date, goal_id: null, transfer_ref_id: null,
        }, ...prev]);
        return { linked_transaction_id: null, linked_other_budget_txn_id: d.id };
      }
    }
    return { linked_transaction_id: null, linked_other_budget_txn_id: null };
  }, [user, ensureLendingCategory]);

  const deleteLinkedEntry = useCallback(async (txnId: string | null | undefined, otherId: string | null | undefined) => {
    if (!user) return;
    if (txnId) {
      await supabase.from('transactions').delete().eq('id', txnId).eq('user_id', user.id);
      setTransactions(prev => prev.filter(t => t.id !== txnId));
    }
    if (otherId) {
      await supabase.from('other_budget_transactions' as any).delete().eq('id', otherId).eq('user_id', user.id);
      setOtherBudgetTxns(prev => prev.filter(t => t.id !== otherId));
    }
  }, [user]);

  const addLoan = useCallback(async (l: { borrower_name: string; amount: number; lent_date: string; note: string }, link?: LendingLink) => {
    if (!user) return;
    const linked = link ? await createLinkedEntry({ kind: 'lending', link, title: `Lent to ${l.borrower_name}`, amount: l.amount, date: l.lent_date }) : { linked_transaction_id: null, linked_other_budget_txn_id: null };
    const { data } = await supabase.from('loans').insert({ user_id: user.id, ...l, ...linked } as any).select().single();
    if (data) {
      const d = data as any;
      setLoans(prev => [{ id: d.id, borrower_name: d.borrower_name, amount: Number(d.amount), lent_date: d.lent_date, note: d.note || '', created_at: d.created_at, linked_transaction_id: d.linked_transaction_id ?? null, linked_other_budget_txn_id: d.linked_other_budget_txn_id ?? null }, ...prev]);
    }
  }, [user, createLinkedEntry]);

  const editLoan = useCallback(async (id: string, updates: Partial<Loan>, link?: LendingLink | undefined) => {
    if (!user) return;
    const current = loans.find(l => l.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };
    const patch: any = { ...updates };

    if (link !== undefined) {
      // Destination changed — wipe old and create new (if any)
      await deleteLinkedEntry(current.linked_transaction_id, current.linked_other_budget_txn_id);
      const linked = link ? await createLinkedEntry({ kind: 'lending', link, title: `Lent to ${merged.borrower_name}`, amount: merged.amount, date: merged.lent_date }) : { linked_transaction_id: null, linked_other_budget_txn_id: null };
      patch.linked_transaction_id = linked.linked_transaction_id;
      patch.linked_other_budget_txn_id = linked.linked_other_budget_txn_id;
    } else {
      // Mirror amount/date/borrower changes to existing linked entry
      const mirrorPatch: any = {};
      if (updates.amount !== undefined) mirrorPatch.amount = updates.amount;
      if (updates.lent_date !== undefined) mirrorPatch.date = updates.lent_date;
      if (updates.borrower_name !== undefined) mirrorPatch.title = `Lent to ${updates.borrower_name}`;
      if (Object.keys(mirrorPatch).length > 0) {
        if (current.linked_transaction_id) {
          await supabase.from('transactions').update(mirrorPatch).eq('id', current.linked_transaction_id).eq('user_id', user.id);
          setTransactions(prev => prev.map(t => t.id === current.linked_transaction_id ? { ...t, ...mirrorPatch } : t));
        }
        if (current.linked_other_budget_txn_id) {
          await supabase.from('other_budget_transactions' as any).update(mirrorPatch).eq('id', current.linked_other_budget_txn_id).eq('user_id', user.id);
          setOtherBudgetTxns(prev => prev.map(t => t.id === current.linked_other_budget_txn_id ? { ...t, ...mirrorPatch } : t));
        }
      }
    }

    await supabase.from('loans').update(patch).eq('id', id).eq('user_id', user.id);
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, [user, loans, createLinkedEntry, deleteLinkedEntry]);

  const deleteLoan = useCallback(async (id: string) => {
    if (!user) return;
    const loan = loans.find(l => l.id === id);
    const recs = loanRecoveries.filter(r => r.loan_id === id);
    // Delete linked budget entries for the loan + all recoveries
    if (loan) await deleteLinkedEntry(loan.linked_transaction_id, loan.linked_other_budget_txn_id);
    for (const r of recs) await deleteLinkedEntry(r.linked_transaction_id, r.linked_other_budget_txn_id);
    await supabase.from('loans').delete().eq('id', id).eq('user_id', user.id);
    setLoans(prev => prev.filter(l => l.id !== id));
    setLoanRecoveries(prev => prev.filter(r => r.loan_id !== id));
  }, [user, loans, loanRecoveries, deleteLinkedEntry]);

  const addRecovery = useCallback(async (r: { loan_id: string; amount: number; recovered_date: string; note: string }, link?: LendingLink) => {
    if (!user) return;
    const loan = loans.find(l => l.id === r.loan_id);
    const borrowerName = loan?.borrower_name || 'borrower';
    const linked = link ? await createLinkedEntry({ kind: 'recovery', link, title: `Recovery from ${borrowerName}`, amount: r.amount, date: r.recovered_date }) : { linked_transaction_id: null, linked_other_budget_txn_id: null };
    const { data } = await supabase.from('loan_recoveries').insert({ user_id: user.id, ...r, ...linked } as any).select().single();
    if (data) {
      const d = data as any;
      setLoanRecoveries(prev => [{ id: d.id, loan_id: d.loan_id, amount: Number(d.amount), recovered_date: d.recovered_date, note: d.note || '', linked_transaction_id: d.linked_transaction_id ?? null, linked_other_budget_txn_id: d.linked_other_budget_txn_id ?? null }, ...prev]);
    }
  }, [user, loans, createLinkedEntry]);

  const deleteRecovery = useCallback(async (id: string) => {
    if (!user) return;
    const rec = loanRecoveries.find(r => r.id === id);
    if (rec) await deleteLinkedEntry(rec.linked_transaction_id, rec.linked_other_budget_txn_id);
    await supabase.from('loan_recoveries').delete().eq('id', id).eq('user_id', user.id);
    setLoanRecoveries(prev => prev.filter(r => r.id !== id));
  }, [user, loanRecoveries, deleteLinkedEntry]);
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
      refreshLoans();
      refreshLoanRecoveries();
    }
  }, [user, refreshProfile, refreshSettings, refreshTransactions, refreshCategories, refreshGoals, refreshExpenses, refreshOtherBudgets, refreshOtherBudgetTxns, refreshLoans, refreshLoanRecoveries]);

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
    const row = transactions.find(t => t.id === id);
    const linkedId = (row as any)?.transfer_ref_id || null;
    await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (linkedId) {
      await supabase.from('other_budget_transactions' as any).delete().eq('id', linkedId).eq('user_id', user.id);
      setOtherBudgetTxns(prev => prev.filter(t => t.id !== linkedId));
    } else {
      // Defensive: clean up any other-budget txn pointing back to this row
      await supabase.from('other_budget_transactions' as any).delete().eq('transfer_ref_id', id).eq('user_id', user.id);
      setOtherBudgetTxns(prev => prev.filter(t => (t as any).transfer_ref_id !== id));
    }
    // Lending linkage: remove loan/recovery that references this budget entry
    await supabase.from('loans').delete().eq('linked_transaction_id', id).eq('user_id', user.id);
    await supabase.from('loan_recoveries').delete().eq('linked_transaction_id', id).eq('user_id', user.id);
    setLoans(prev => prev.filter(l => l.linked_transaction_id !== id));
    setLoanRecoveries(prev => prev.filter(r => r.linked_transaction_id !== id));
  }, [user, transactions]);

  const addCategory = useCallback(async (type: 'incoming' | 'outgoing', name: string, icon: string = 'MoreHorizontal', color: string = 'hsl(220, 10%, 46%)') => {
    if (!user) return;
    await supabase.from('custom_categories').insert({ user_id: user.id, name, type, icon, color } as any);
    await refreshCategories();
  }, [user, refreshCategories]);

  const editCategory = useCallback(async (id: string, updates: { name?: string; icon?: string; color?: string }) => {
    if (!user) return;
    await supabase.from('custom_categories').update(updates as any).eq('id', id).eq('user_id', user.id);
    await refreshCategories();
  }, [user, refreshCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('custom_categories').delete().eq('id', id).eq('user_id', user.id);
    await refreshCategories();
  }, [user, refreshCategories]);

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
      user, session, loading, profile, settings, transactions, customCategories, customCategoryRecords,
      currentMonth, setCurrentMonth, refreshProfile, refreshSettings, refreshTransactions, refreshCategories,
      updateProfile, updateSettings, addTransaction, editTransaction, deleteTransaction,
      addCategory, editCategory, deleteCategory, signOut, isDark, toggleDark, theme, setTheme, formatCurrency,
      savingsGoals, refreshGoals, addGoal, editGoal, deleteGoal,
      expenses, refreshExpenses, addExpense, editExpense, deleteExpense,
      otherBudgets, otherBudgetTxns, refreshOtherBudgets, refreshOtherBudgetTxns,
      addOtherBudget, editOtherBudget, deleteOtherBudget,
      addOtherBudgetTxn, editOtherBudgetTxn, deleteOtherBudgetTxn, createTransfer,
      loans, loanRecoveries, refreshLoans, refreshLoanRecoveries, addLoan, editLoan, deleteLoan, addRecovery, deleteRecovery,
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

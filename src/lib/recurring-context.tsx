import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBudget } from './budget-context';

export interface RecurringRule {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: 'incoming' | 'outgoing';
  frequency: 'monthly';
  start_date: string;
  end_date: string;
  is_active: boolean;
  last_generated_date?: string | null;
  created_at: string;
}

interface RecurringContextType {
  rules: RecurringRule[];
  loading: boolean;
  addRule: (rule: Omit<RecurringRule, 'id' | 'created_at' | 'is_active' | 'last_generated_date' | 'frequency'>) => Promise<void>;
  updateRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  generateTransactions: () => Promise<number>;
  refreshRules: () => Promise<void>;
}

const RecurringContext = createContext<RecurringContextType | null>(null);

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshTransactions } = useBudget();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshRules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setRules(data.map(r => ({
        ...r,
        amount: Number(r.amount),
        type: r.type as 'incoming' | 'outgoing',
        frequency: 'monthly' as const,
        end_date: r.end_date,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) refreshRules();
  }, [user, refreshRules]);

  const generateForRule = useCallback(async (rule: RecurringRule): Promise<number> => {
    if (!user || !rule.is_active) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let generated = 0;

    // Parse dates as local
    const [startY, startM] = rule.start_date.split('-').map(Number);
    const [endY, endM] = rule.end_date.split('-').map(Number);

    const upperBound = new Date(Math.min(
      new Date(endY, endM - 1, 1).getTime(),
      today.getTime()
    ));

    // Build list of months to generate (each as first-of-month)
    const datesToGenerate: Date[] = [];
    let curYear = startY;
    let curMonth = startM; // 1-indexed

    // If we have a last_generated_date, skip to the month after it
    if (rule.last_generated_date) {
      const [lgY, lgM] = rule.last_generated_date.split('-').map(Number);
      curYear = lgY;
      curMonth = lgM + 1;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }

    while (curYear < upperBound.getFullYear() || 
           (curYear === upperBound.getFullYear() && curMonth <= upperBound.getMonth() + 1)) {
      // Also check we haven't passed end date
      if (curYear > endY || (curYear === endY && curMonth > endM)) break;
      datesToGenerate.push(new Date(curYear, curMonth - 1, 1));
      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
      if (datesToGenerate.length > 120) break; // safety cap: 10 years
    }

    for (const d of datesToGenerate) {
      const year = d.getFullYear();
      const month = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const dateStr = `${month}-01`;

      // Check for existing transaction for this rule + month
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('recurring_rule_id', rule.id)
        .eq('month', month)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from('transactions').insert({
        user_id: user.id,
        title: rule.title,
        amount: rule.amount,
        category: rule.category,
        type: rule.type,
        date: dateStr,
        month,
        recurring_rule_id: rule.id,
      });
      generated++;
    }

    if (datesToGenerate.length > 0) {
      const last = datesToGenerate[datesToGenerate.length - 1];
      const lastDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-01`;
      await supabase.from('recurring_rules').update({ last_generated_date: lastDate }).eq('id', rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, last_generated_date: lastDate } : r));
    }

    if (generated > 0) {
      await refreshTransactions();
    }
    return generated;
  }, [user, refreshTransactions]);

  const addRule = useCallback(async (rule: Omit<RecurringRule, 'id' | 'created_at' | 'is_active' | 'last_generated_date' | 'frequency'>) => {
    if (!user) return;
    const { data } = await supabase
      .from('recurring_rules')
      .insert({ ...rule, frequency: 'monthly', user_id: user.id })
      .select()
      .single();
    if (data) {
      const newRule: RecurringRule = {
        ...data,
        amount: Number(data.amount),
        type: data.type as 'incoming' | 'outgoing',
        frequency: 'monthly',
        end_date: data.end_date,
      };
      setRules(prev => [newRule, ...prev]);
      await generateForRule(newRule);
    }
  }, [user, generateForRule]);

  const updateRule = useCallback(async (id: string, updates: Partial<RecurringRule>) => {
    if (!user) return;
    await supabase.from('recurring_rules').update(updates).eq('id', id).eq('user_id', user.id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [user]);

  const deleteRule = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('recurring_rules').delete().eq('id', id).eq('user_id', user.id);
    setRules(prev => prev.filter(r => r.id !== id));
  }, [user]);

  const toggleRule = useCallback(async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule || !user) return;
    const newActive = !rule.is_active;
    await supabase.from('recurring_rules').update({ is_active: newActive }).eq('id', id).eq('user_id', user.id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: newActive } : r));
  }, [rules, user]);

  const generateTransactions = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const activeRules = rules.filter(r => r.is_active);
    let total = 0;
    for (const rule of activeRules) {
      total += await generateForRule(rule);
    }
    return total;
  }, [user, rules, generateForRule]);

  useEffect(() => {
    if (rules.length > 0) {
      generateTransactions();
    }
  }, [rules.length > 0]);

  return (
    <RecurringContext.Provider value={{ rules, loading, addRule, updateRule, deleteRule, toggleRule, generateTransactions, refreshRules }}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  const ctx = useContext(RecurringContext);
  if (!ctx) throw new Error('useRecurring must be used within RecurringProvider');
  return ctx;
}

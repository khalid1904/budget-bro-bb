import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { takeSharedReceipt } from '@/lib/share-target';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_OUTGOING_CATEGORIES } from '@/lib/types';
import { getCategoryIcon } from '@/lib/category-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, TrendingDown, TrendingUp, ScanLine, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { sortItems, SORT_OPTIONS, SortOption, formatAddedAt } from '@/lib/sort-utils';
import { scanBill } from '@/lib/bill-scan';

function getMonthOptions() {
  const months: string[] = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ExpensesPage() {
  const { currentMonth, setCurrentMonth, transactions, expenses, addExpense, editExpense, deleteExpense, customCategories, formatCurrency, profile, settings } = useBudget();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billScanEnabled = profile.tier === 'pro' && settings.bill_scan_enabled;

  const monthOptions = getMonthOptions();
  const allCategories = [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];

  const monthExpenses = useMemo(() =>
    sortItems(
      expenses
        .filter(e => e.month === currentMonth)
        .filter(e => filterCategory === 'all' || e.category === filterCategory),
      sortBy
    ),
    [expenses, currentMonth, filterCategory, sortBy]
  );

  const totalExpenses = useMemo(() =>
    expenses.filter(e => e.month === currentMonth).reduce((s, e) => s + e.amount, 0),
    [expenses, currentMonth]
  );

  // Budget vs Actual comparison
  const budgetVsActual = useMemo(() => {
    const allocations = transactions.filter(t => t.month === currentMonth && t.type === 'outgoing');
    const monthExp = expenses.filter(e => e.month === currentMonth);
    const categories = new Set([...allocations.map(t => t.category), ...monthExp.map(e => e.category)]);
    return Array.from(categories).map(cat => {
      const budgeted = allocations.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
      const actual = monthExp.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return { category: cat, budgeted, actual, variance: budgeted - actual };
    }).filter(r => r.budgeted > 0 || r.actual > 0);
  }, [transactions, expenses, currentMonth]);

  const totalBudgeted = useMemo(() =>
    transactions.filter(t => t.month === currentMonth && t.type === 'outgoing').reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonth]
  );

  const resetForm = () => { setTitle(''); setAmount(''); setCategory(''); setDate(''); setNotes(''); setEditId(null); setScanNotice(null); };

  const handleScanFile = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    try {
      const result = await scanBill(file, allCategories, settings.default_currency);
      setEditId(null);
      setTitle(result.title || '');
      setAmount(result.amount > 0 ? String(result.amount) : '');
      setDate(result.date || '');
      setNotes(result.notes || '');
      setCategory(allCategories.includes(result.category) ? result.category : '');
      setScanNotice(
        result.confidence < 0.6 || result.amount <= 0
          ? "We couldn't read this bill clearly — please check every field before saving."
          : 'Scanned from your bill. Review the details before saving.'
      );
      setDialogOpen(true);
    } catch (err: any) {
      toast({ title: 'Bill scan failed', description: err?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !amount || !category) {
      toast({ title: 'Please fill required fields', variant: 'destructive' }); return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' }); return;
    }
    const expDate = date || new Date().toISOString().split('T')[0];

    if (editId) {
      await editExpense(editId, { title: title.trim(), amount: amt, category, date: expDate, notes: notes.trim() });
      toast({ title: 'Expense updated' });
    } else {
      await addExpense({ title: title.trim(), amount: amt, category, date: expDate, month: currentMonth, notes: notes.trim() });
      toast({ title: 'Expense recorded' });
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    setTitle(exp.title); setAmount(String(exp.amount)); setCategory(exp.category); setDate(exp.date); setNotes(exp.notes || ''); setEditId(id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track actual spending vs budget</p>
        </div>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Budget vs Actual Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
              <p className="text-lg font-display font-bold text-foreground">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-lg font-display font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-lg font-display font-bold ${totalBudgeted - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalBudgeted - totalExpenses)}
              </p>
            </div>
          </div>
          {budgetVsActual.length > 0 ? (
            <div className="space-y-3">
              {budgetVsActual.map(row => {
                const pct = row.budgeted > 0 ? Math.min((row.actual / row.budgeted) * 100, 100) : 100;
                const overBudget = row.actual > row.budgeted && row.budgeted > 0;
                return (
                  <div key={row.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{row.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(row.actual)} / {formatCurrency(row.budgeted)}
                      </span>
                    </div>
                    <Progress value={pct} className={`h-2 ${overBudget ? '[&>div]:bg-destructive' : ''}`} />
                    {overBudget && (
                      <p className="text-xs text-destructive">Over budget by {formatCurrency(row.actual - row.budgeted)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No budget or expense data for this month</p>
          )}
        </CardContent>
      </Card>

      {/* Expense List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] sm:w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px] sm:w-[190px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {billScanEnabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={e => handleScanFile(e.target.files?.[0])}
              />
              <Button variant="outline" disabled={scanning} onClick={() => fileInputRef.current?.click()}>
                {scanning
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scanning...</>
                  : <><ScanLine className="w-4 h-4 mr-1" /> Scan Bill</>}
              </Button>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {scanNotice && (
                  <p className="text-xs rounded-md bg-primary/10 text-primary px-3 py-2">{scanNotice}</p>
                )}
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Coffee shop" /></div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date (optional)</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Notes (optional)</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any details..." /></div>
                <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Add'} Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display text-lg">Expense Entries</CardTitle>
          <span className="text-lg font-display font-bold text-destructive">{formatCurrency(totalExpenses)}</span>
        </CardHeader>
        <CardContent>
          {monthExpenses.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {monthExpenses.map(exp => {
                  const catIcon = getCategoryIcon(exp.category);
                  const IconComp = catIcon.icon;
                  return (
                    <motion.div key={exp.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: catIcon.bg }}>
                        <IconComp className="w-5 h-5" style={{ color: catIcon.fg }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground break-words min-w-0 flex-1">{exp.title}</p>
                          <span className="font-display font-semibold whitespace-nowrap text-destructive">{formatCurrency(exp.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-xs text-muted-foreground">{exp.category}</span>
                            {exp.budget_transaction_id && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">From Budget</span>
                            )}
                            {exp.date && <span className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                            {formatAddedAt((exp as any).created_at) && (
                              <span className="text-[11px] text-muted-foreground/70">· added {formatAddedAt((exp as any).created_at)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(exp.id)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteExpense(exp.id); toast({ title: 'Expense deleted' }); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No expenses recorded yet</p>
              <p className="text-sm mt-1">Click "Add Expense" to start tracking</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

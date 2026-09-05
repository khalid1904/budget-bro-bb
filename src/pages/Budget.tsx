import { useState, useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES, getCategoryType } from '@/lib/types';
import { getCategoryIcon } from '@/lib/category-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Repeat, Target, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TransferDialog } from '@/components/TransferDialog';
import { sortItems, SORT_OPTIONS, SortOption, formatAddedAt } from '@/lib/sort-utils';

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

export default function BudgetPage() {
  const { currentMonth, setCurrentMonth, transactions, addTransaction, deleteTransaction, editTransaction, customCategories, formatCurrency, savingsGoals, settings, addExpense, expenses, profile } = useBudget();
  const isPro = profile.tier === 'pro';
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [goalId, setGoalId] = useState<string>('none');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('added_desc');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSourceMonth, setImportSourceMonth] = useState<string>('');
  const [importMode, setImportMode] = useState<'all' | 'select'>('all');
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());

  const availableSourceMonths = useMemo(() => {
    const set = new Set(transactions.map(t => t.month).filter(m => m !== currentMonth));
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonth]);

  const sourceTxns = useMemo(
    () => transactions.filter(t => t.month === importSourceMonth),
    [transactions, importSourceMonth]
  );

  const toggleImportId = (id: string) => {
    setSelectedImportIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleGroup = (type: 'incoming' | 'outgoing') => {
    const ids = sourceTxns.filter(t => t.type === type).map(t => t.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedImportIds.has(id));
    setSelectedImportIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };

  const txnsToImport = useMemo(() => {
    if (importMode === 'all') return sourceTxns;
    return sourceTxns.filter(t => selectedImportIds.has(t.id));
  }, [importMode, sourceTxns, selectedImportIds]);

  const openImportDialog = () => {
    if (availableSourceMonths.length > 0) setImportSourceMonth(availableSourceMonths[0]);
    setImportMode('all');
    setSelectedImportIds(new Set());
    setImportDialogOpen(true);
  };

  const handleImport = async () => {
    if (txnsToImport.length === 0) return;
    const [yStr, mStr] = currentMonth.split('-');
    const year = +yStr, mon = +mStr;
    const lastDay = new Date(year, mon, 0).getDate();
    const activeGoalIds = new Set(savingsGoals.filter(g => g.status === 'active').map(g => g.id));
    const existing = new Set(
      transactions
        .filter(t => t.month === currentMonth)
        .map(t => `${t.type}|${t.title.toLowerCase()}|${t.amount}|${t.category}`)
    );
    let imported = 0, skipped = 0;
    for (const t of txnsToImport) {
      const key = `${t.type}|${t.title.toLowerCase()}|${t.amount}|${t.category}`;
      if (existing.has(key)) { skipped++; continue; }
      const day = Math.min(new Date(t.date).getDate(), lastDay);
      const newDate = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      await addTransaction({
        title: t.title,
        amount: t.amount,
        category: t.category,
        date: newDate,
        type: t.type,
        month: currentMonth,
        goal_id: t.goal_id && activeGoalIds.has(t.goal_id) ? t.goal_id : null,
      });
      existing.add(key);
      imported++;
    }
    toast({
      title: `Imported ${imported} ${imported === 1 ? 'entry' : 'entries'}`,
      description: skipped > 0 ? `${skipped} duplicate${skipped === 1 ? '' : 's'} skipped.` : `From ${formatMonth(importSourceMonth)}`,
    });
    setImportDialogOpen(false);
  };

  const monthOptions = getMonthOptions();

  const allCategories = activeTab === 'incoming'
    ? [...DEFAULT_INCOMING_CATEGORIES, ...customCategories.incoming]
    : [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];

  const isSavingsCategory = activeTab === 'outgoing' && getCategoryType(category) === 'savings';
  const activeGoals = useMemo(() => savingsGoals.filter(g => g.status === 'active'), [savingsGoals]);

  const filteredTxns = useMemo(() =>
    sortItems(
      transactions
        .filter(t => t.month === currentMonth && t.type === activeTab)
        .filter(t => filterCategory === 'all' || t.category === filterCategory),
      sortBy
    ),
    [transactions, currentMonth, activeTab, filterCategory, sortBy]
  );

  const total = useMemo(() =>
    transactions.filter(t => t.month === currentMonth && t.type === activeTab).reduce((s, t) => s + t.amount, 0),
    [transactions, currentMonth, activeTab]
  );

  const resetForm = () => { setTitle(''); setAmount(''); setCategory(''); setDate(''); setEditId(null); setGoalId('none'); };

  const handleSubmit = async () => {
    if (!title.trim() || !amount || !category) {
      toast({ title: 'Please fill required fields', variant: 'destructive' }); return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' }); return;
    }
    const txDate = date || new Date().toISOString().split('T')[0];
    const txGoalId = isSavingsCategory && goalId !== 'none' ? goalId : null;

    if (editId) {
      await editTransaction(editId, { title: title.trim(), amount: amt, category, date: txDate, goal_id: txGoalId });
      toast({ title: 'Entry updated' });
    } else {
      await addTransaction({ title: title.trim(), amount: amt, category, date: txDate, type: activeTab, month: currentMonth, goal_id: txGoalId });
      toast({ title: 'Entry added' });
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setTitle(tx.title); setAmount(String(tx.amount)); setCategory(tx.category); setDate(tx.date); setEditId(id);
    setGoalId(tx.goal_id || 'none');
    setDialogOpen(true);
  };


  const getGoalName = (gId: string | null | undefined) => {
    if (!gId) return null;
    return savingsGoals.find(g => g.id === gId)?.goal_name || null;
  };

  const isAlreadySpent = (txId: string) => expenses.some(e => e.budget_transaction_id === txId);

  const handleMarkAsSpent = async (tx: { id: string; title: string; amount: number; category: string; date: string; month: string }) => {
    await addExpense({
      title: tx.title,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
      month: tx.month,
      budget_transaction_id: tx.id,
      notes: '',
    });
    toast({ title: 'Recorded as expense' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Budget</h1>
          <p className="text-muted-foreground mt-1">Manage your monthly entries</p>
        </div>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'incoming' | 'outgoing'); setFilterCategory('all'); }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted">
            <TabsTrigger value="incoming" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Income</TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-1.5"><TrendingDown className="w-4 h-4" /> Allocations</TabsTrigger>
          </TabsList>
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
            {isPro && (
              <Button variant="outline" onClick={openImportDialog}>
                <Copy className="w-4 h-4 mr-1" /> Import from Month
              </Button>
            )}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Import Budget from Another Month</DialogTitle></DialogHeader>
                {availableSourceMonths.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No previous months with budget entries.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Source Month</Label>
                      <Select value={importSourceMonth} onValueChange={(v) => { setImportSourceMonth(v); setSelectedImportIds(new Set()); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableSourceMonths.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>What to copy</Label>
                      <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'all' | 'select')}>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="all" id="imp-all" />
                          <Label htmlFor="imp-all" className="font-normal cursor-pointer">Copy entire month ({sourceTxns.length} entries)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="select" id="imp-sel" />
                          <Label htmlFor="imp-sel" className="font-normal cursor-pointer">Select specific entries</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {importMode === 'select' && (
                      <ScrollArea className="h-64 border rounded-md p-3">
                        {(['incoming', 'outgoing'] as const).map(type => {
                          const items = sourceTxns.filter(t => t.type === type);
                          if (items.length === 0) return null;
                          const allSel = items.every(i => selectedImportIds.has(i.id));
                          return (
                            <div key={type} className="mb-3 last:mb-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground">{type === 'incoming' ? 'Income' : 'Allocations'}</span>
                                <button type="button" onClick={() => toggleGroup(type)} className="text-xs text-primary hover:underline">
                                  {allSel ? 'Deselect all' : 'Select all'}
                                </button>
                              </div>
                              {items.map(t => (
                                <label key={t.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                                  <Checkbox checked={selectedImportIds.has(t.id)} onCheckedChange={() => toggleImportId(t.id)} />
                                  <span className="flex-1 text-sm truncate">{t.title}</span>
                                  <span className="text-xs text-muted-foreground">{t.category}</span>
                                  <span className="text-sm font-medium">{formatCurrency(t.amount)}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </ScrollArea>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {txnsToImport.length} {txnsToImport.length === 1 ? 'entry' : 'entries'} will be copied to {formatMonth(currentMonth)}.
                    </p>
                    <Button onClick={handleImport} className="w-full" disabled={txnsToImport.length === 0}>
                      Import {txnsToImport.length > 0 ? `${txnsToImport.length} ` : ''}{txnsToImport.length === 1 ? 'Entry' : 'Entries'}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            {isPro && settings.cross_budget_transfers_enabled && (
              <TransferDialog defaultDirection="monthly_to_other" fixedMonth={currentMonth} />
            )}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button className="sm:w-auto w-full"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} {activeTab === 'incoming' ? 'Income' : 'Allocation'} Entry</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly Salary" /></div>
                  <div className="space-y-2"><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => { setCategory(v); if (getCategoryType(v) !== 'savings') setGoalId('none'); }}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {isSavingsCategory && activeGoals.length > 0 && (
                    <div className="space-y-2">
                      <Label>Savings Goal (optional)</Label>
                      <Select value={goalId} onValueChange={setGoalId}>
                        <SelectTrigger><SelectValue placeholder="Link to a goal" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Goal</SelectItem>
                          {activeGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.goal_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2"><Label>Date (optional)</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                  <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Add'} Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg"><CardTitle className="font-display text-lg">{activeTab === 'incoming' ? 'Income' : 'Allocation'} Entries</CardTitle></CardTitle>
              <span className={`text-lg font-display font-bold ${activeTab === 'incoming' ? 'text-success' : 'text-destructive'}`}>{formatCurrency(total)}</span>
            </CardHeader>
            <CardContent>
              {filteredTxns.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredTxns.map(tx => {
                      const catIcon = getCategoryIcon(tx.category);
                      const IconComp = catIcon.icon;
                      return (
                        <motion.div key={tx.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: catIcon.bg }}>
                            <IconComp className="w-5 h-5" style={{ color: catIcon.fg }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-foreground break-words min-w-0 flex-1">{tx.title}</p>
                              <span className={`font-display font-semibold whitespace-nowrap ${activeTab === 'incoming' ? 'text-success' : 'text-destructive'}`}>{formatCurrency(tx.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span className="text-xs text-muted-foreground">{tx.category}</span>
                                {(tx as any).recurring_rule_id && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Repeat className="w-3 h-3" /> Recurring
                                  </span>
                                )}
                                {tx.transfer_ref_id && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">↔ Transfer</span>
                                )}
                                {getGoalName(tx.goal_id) && (
                                  <span className="text-xs bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Target className="w-3 h-3" /> {getGoalName(tx.goal_id)}
                                  </span>
                                )}
                                {tx.date && <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                {formatAddedAt((tx as any).created_at) && (
                                  <span className="text-[11px] text-muted-foreground/70">· added {formatAddedAt((tx as any).created_at)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {activeTab === 'outgoing' && settings.expense_tracking_enabled && !isAlreadySpent(tx.id) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Mark as Spent" onClick={() => handleMarkAsSpent(tx)}>
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {activeTab === 'outgoing' && settings.expense_tracking_enabled && isAlreadySpent(tx.id) && (
                                  <span className="text-xs text-success px-1.5">✓ Spent</span>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tx.id)}><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteTransaction(tx.id); toast({ title: 'Entry deleted' }); }}><Trash2 className="w-4 h-4" /></Button>
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
                  <p>No entries yet</p>
                  <p className="text-sm mt-1">Click "Add Entry" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

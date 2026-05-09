import { useState, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES, getCategoryType } from '@/lib/types';
import { getCategoryIcon } from '@/lib/category-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, ArrowLeft, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TransferDialog } from '@/components/TransferDialog';

export default function OtherBudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { otherBudgets, otherBudgetTxns, addOtherBudgetTxn, editOtherBudgetTxn, deleteOtherBudgetTxn, customCategories, savingsGoals, formatCurrency, settings, profile } = useBudget();
  const isPro = profile.tier === 'pro';

  const budget = otherBudgets.find(b => b.id === id);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [goalId, setGoalId] = useState<string>('none');

  const txns = useMemo(() => otherBudgetTxns.filter(t => t.other_budget_id === id), [otherBudgetTxns, id]);

  const summary = useMemo(() => {
    let income = 0, spending = 0, savings = 0, investment = 0;
    for (const t of txns) {
      if (t.type === 'incoming') { income += t.amount; continue; }
      const ct = getCategoryType(t.category);
      if (ct === 'savings') savings += t.amount;
      else if (ct === 'investment') investment += t.amount;
      else spending += t.amount;
    }
    const allocated = spending + savings + investment;
    return { income, spending, savings, investment, allocated, inHand: income - allocated };
  }, [txns]);

  const allCategories = activeTab === 'incoming'
    ? [...DEFAULT_INCOMING_CATEGORIES, ...customCategories.incoming]
    : [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];

  const isSavingsCategory = activeTab === 'outgoing' && getCategoryType(category) === 'savings';
  const activeGoals = useMemo(() => savingsGoals.filter(g => g.status === 'active'), [savingsGoals]);

  const filteredTxns = useMemo(
    () => txns.filter(t => t.type === activeTab).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [txns, activeTab]
  );

  const reset = () => { setTitle(''); setAmount(''); setCategory(''); setDate(''); setEditId(null); setGoalId('none'); };

  if (!budget && otherBudgets.length > 0) return <Navigate to="/other-budgets" replace />;
  if (!budget) return <div className="text-muted-foreground">Loading...</div>;

  const handleSubmit = async () => {
    if (!title.trim() || !amount || !category) { toast({ title: 'Please fill required fields', variant: 'destructive' }); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    const txDate = date || new Date().toISOString().split('T')[0];
    const txGoalId = isSavingsCategory && goalId !== 'none' ? goalId : null;
    if (editId) {
      await editOtherBudgetTxn(editId, { title: title.trim(), amount: amt, category, date: txDate, goal_id: txGoalId });
      toast({ title: 'Entry updated' });
    } else {
      await addOtherBudgetTxn({ other_budget_id: budget.id, title: title.trim(), amount: amt, category, date: txDate, type: activeTab, goal_id: txGoalId });
      toast({ title: 'Entry added' });
    }
    reset();
    setDialogOpen(false);
  };

  const handleEdit = (txId: string) => {
    const t = txns.find(x => x.id === txId);
    if (!t) return;
    setActiveTab(t.type);
    setTitle(t.title); setAmount(String(t.amount)); setCategory(t.category); setDate(t.date); setEditId(txId);
    setGoalId(t.goal_id || 'none');
    setDialogOpen(true);
  };

  const getGoalName = (gId: string | null | undefined) => gId ? savingsGoals.find(g => g.id === gId)?.goal_name || null : null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/other-budgets')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Other Budgets
      </button>

      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{budget.name}</h1>
        {budget.description && <p className="text-muted-foreground mt-1">{budget.description}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Income', value: summary.income, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Spending', value: summary.spending, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Savings', value: summary.savings, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Investment', value: summary.investment, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Allocated', value: summary.allocated, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'In-Hand', value: summary.inHand, color: summary.inHand < 0 ? 'text-destructive' : 'text-primary', bg: 'bg-primary/10' },
        ].map(s => (
          <Card key={s.label} className={`shadow-card ${s.bg}`}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={`text-base font-semibold mt-1 truncate ${s.color}`}>{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'incoming' | 'outgoing')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted">
            <TabsTrigger value="incoming" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Income</TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-1.5"><TrendingDown className="w-4 h-4" /> Allocations</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            {isPro && settings.cross_budget_transfers_enabled && (
              <TransferDialog defaultDirection="other_to_monthly" fixedOtherBudgetId={budget.id} />
            )}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} {activeTab === 'incoming' ? 'Income' : 'Allocation'} Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Year-end Bonus" /></div>
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

        <div className="mt-4 space-y-2">
          {filteredTxns.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="text-center py-10 text-muted-foreground text-sm">
                No {activeTab === 'incoming' ? 'income' : 'allocation'} entries yet.
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredTxns.map(t => {
                const cfg = getCategoryIcon(t.category);
                const Icon = cfg.icon;
                const goalName = getGoalName(t.goal_id);
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Card className="shadow-card">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground break-words min-w-0 flex-1">{t.title}</p>
                            <span className={`text-sm font-semibold whitespace-nowrap ${t.type === 'incoming' ? 'text-success' : 'text-destructive'}`}>{formatCurrency(t.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-xs text-muted-foreground">{t.category}</span>
                              <span className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</span>
                              {t.transfer_ref_id && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">↔ Transfer</span>
                              )}
                              {goalName && (
                                <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Target className="w-3 h-3" />{goalName}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t.id)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteOtherBudgetTxn(t.id); toast({ title: 'Entry deleted' }); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </Tabs>
    </div>
  );
}

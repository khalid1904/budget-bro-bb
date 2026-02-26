import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function BudgetPage() {
  const { currentMonth, getCurrentBudget, addTransaction, deleteTransaction, editTransaction, getTotalIncoming, getTotalOutgoing, customCategories, addCategory } = useBudget();
  const { toast } = useToast();
  const budget = getCurrentBudget();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const allCategories = activeTab === 'incoming'
    ? [...DEFAULT_INCOMING_CATEGORIES, ...customCategories.incoming]
    : [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];

  const transactions = (budget?.transactions || [])
    .filter(t => t.type === activeTab)
    .filter(t => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const total = activeTab === 'incoming' ? getTotalIncoming() : getTotalOutgoing();

  const resetForm = () => {
    setTitle(''); setAmount(''); setCategory(''); setDate(''); setEditId(null);
  };

  const handleSubmit = () => {
    if (!title.trim() || !amount || !category) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    if (editId) {
      editTransaction(editId, { title: title.trim(), amount: amt, category, date: date || new Date().toISOString().split('T')[0] });
      toast({ title: 'Entry updated' });
    } else {
      addTransaction({ title: title.trim(), amount: amt, category, date: date || new Date().toISOString().split('T')[0], type: activeTab });
      toast({ title: 'Entry added' });
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (id: string) => {
    const tx = budget?.transactions.find(t => t.id === id);
    if (!tx) return;
    setTitle(tx.title); setAmount(String(tx.amount)); setCategory(tx.category); setDate(tx.date); setEditId(id);
    setDialogOpen(true);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(activeTab, newCategoryName.trim());
    setNewCategoryName('');
    setNewCategoryDialogOpen(false);
    toast({ title: 'Category added' });
  };

  const monthLabel = (() => {
    const [y, m] = currentMonth.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Budget</h1>
        <p className="text-muted-foreground mt-1">{monthLabel}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'incoming' | 'outgoing'); setFilterCategory('all'); }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="incoming" className="gap-1.5">
              <TrendingUp className="w-4 h-4" /> Income
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-1.5">
              <TrendingDown className="w-4 h-4" /> Expenses
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon"><Tag className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Custom Category</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Side Hustle" />
                  </div>
                  <Button onClick={handleAddCategory} className="w-full">Add Category</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} {activeTab === 'incoming' ? 'Income' : 'Expense'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly Salary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date (optional)</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Add'} Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-lg">
                {activeTab === 'incoming' ? 'Income' : 'Expense'} Entries
              </CardTitle>
              <span className={`text-lg font-display font-bold ${activeTab === 'incoming' ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(total)}
              </span>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {transactions.map(tx => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between py-3 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{tx.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tx.category}</span>
                            {tx.date && <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span className={`font-display font-semibold whitespace-nowrap ${activeTab === 'incoming' ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(tx.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tx.id)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteTransaction(tx.id); toast({ title: 'Entry deleted' }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
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

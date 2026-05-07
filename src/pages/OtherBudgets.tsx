import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function OtherBudgetsPage() {
  const { otherBudgets, otherBudgetTxns, addOtherBudget, editOtherBudget, deleteOtherBudget, formatCurrency } = useBudget();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const summaries = useMemo(() => {
    const map: Record<string, { income: number; allocated: number; count: number }> = {};
    for (const b of otherBudgets) map[b.id] = { income: 0, allocated: 0, count: 0 };
    for (const t of otherBudgetTxns) {
      const s = map[t.other_budget_id];
      if (!s) continue;
      s.count++;
      if (t.type === 'incoming') s.income += t.amount; else s.allocated += t.amount;
    }
    return map;
  }, [otherBudgets, otherBudgetTxns]);

  const reset = () => { setName(''); setDescription(''); setEditId(null); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (editId) {
      await editOtherBudget(editId, { name: name.trim(), description: description.trim() });
      toast({ title: 'Budget updated' });
    } else {
      await addOtherBudget({ name: name.trim(), description: description.trim() });
      toast({ title: 'Budget created' });
    }
    reset();
    setDialogOpen(false);
  };

  const handleEdit = (b: { id: string; name: string; description: string }) => {
    setEditId(b.id); setName(b.name); setDescription(b.description); setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget and all its entries?')) return;
    await deleteOtherBudget(id);
    toast({ title: 'Budget deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Other Budgets</h1>
          <p className="text-muted-foreground mt-1">Standalone pots for bonuses, gifts, one-off windfalls</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> New Budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'New'} Budget</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bonus Amount" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's this pot for?" />
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Create'} Budget</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {otherBudgets.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="text-center py-12 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No other budgets yet</p>
            <p className="text-sm mt-1">Create a pot to plan one-off windfalls separately from your monthly budget</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {otherBudgets.map(b => {
              const s = summaries[b.id] || { income: 0, allocated: 0, count: 0 };
              const inHand = s.income - s.allocated;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="shadow-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/other-budgets/${b.id}`)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="font-display text-lg truncate flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary shrink-0" />
                            {b.name}
                          </CardTitle>
                          {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-success/10">
                          <p className="text-[10px] uppercase text-muted-foreground">Income</p>
                          <p className="text-sm font-semibold text-success truncate">{formatCurrency(s.income)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <p className="text-[10px] uppercase text-muted-foreground">Allocated</p>
                          <p className="text-sm font-semibold text-destructive truncate">{formatCurrency(s.allocated)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <p className="text-[10px] uppercase text-muted-foreground">In-Hand</p>
                          <p className={`text-sm font-semibold truncate ${inHand < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(inHand)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="text-xs text-muted-foreground">{s.count} {s.count === 1 ? 'entry' : 'entries'}</span>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(b)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

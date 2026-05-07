import { useState, useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Target, Trash2, Edit2, Pause, Play, CheckCircle2, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryType } from '@/lib/types';

export default function SavingsGoalsPage() {
  const { savingsGoals, transactions, otherBudgetTxns, addGoal, editGoal, deleteGoal, formatCurrency } = useBudget();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Calculate saved amount for each goal dynamically (includes Other Budgets contributions)
  const goalProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const goal of savingsGoals) {
      const fromMain = transactions
        .filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'savings' && (t as any).goal_id === goal.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const fromOther = otherBudgetTxns
        .filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'savings' && t.goal_id === goal.id)
        .reduce((sum, t) => sum + t.amount, 0);
      map[goal.id] = fromMain + fromOther;
    }
    return map;
  }, [savingsGoals, transactions, otherBudgetTxns]);

  const filteredGoals = useMemo(() =>
    filterStatus === 'all' ? savingsGoals : savingsGoals.filter(g => g.status === filterStatus),
    [savingsGoals, filterStatus]
  );

  const resetForm = () => {
    setGoalName(''); setTargetAmount(''); setTargetDate(''); setDescription(''); setEditId(null);
  };

  const handleSubmit = async () => {
    if (!goalName.trim() || !targetAmount) {
      toast({ title: 'Please fill required fields', variant: 'destructive' }); return;
    }
    const amt = parseFloat(targetAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Enter a valid target amount', variant: 'destructive' }); return;
    }

    if (editId) {
      await editGoal(editId, {
        goal_name: goalName.trim(),
        target_amount: amt,
        target_date: targetDate || null,
        description: description.trim(),
      });
      toast({ title: 'Goal updated' });
    } else {
      await addGoal({
        goal_name: goalName.trim(),
        target_amount: amt,
        target_date: targetDate || null,
        description: description.trim(),
      });
      toast({ title: 'Goal created' });
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (goal: any) => {
    setGoalName(goal.goal_name);
    setTargetAmount(String(goal.target_amount));
    setTargetDate(goal.target_date || '');
    setDescription(goal.description || '');
    setEditId(goal.id);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (goal: any) => {
    const saved = goalProgress[goal.id] || 0;
    if (goal.status === 'active') {
      if (saved >= goal.target_amount) {
        await editGoal(goal.id, { status: 'completed' });
        toast({ title: '🎉 Goal completed!' });
      } else {
        await editGoal(goal.id, { status: 'paused' });
        toast({ title: 'Goal paused' });
      }
    } else if (goal.status === 'paused') {
      await editGoal(goal.id, { status: 'active' });
      toast({ title: 'Goal resumed' });
    } else if (goal.status === 'completed') {
      await editGoal(goal.id, { status: 'active' });
      toast({ title: 'Goal reactivated' });
    }
  };

  const handleMarkComplete = async (goalId: string) => {
    await editGoal(goalId, { status: 'completed' });
    toast({ title: '🎉 Goal completed!' });
  };

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const diff = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    completed: 'bg-primary/10 text-primary border-primary/20',
    paused: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Savings Goals</h1>
          <p className="text-muted-foreground mt-1">Track progress toward your financial targets</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> New Goal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Create'} Savings Goal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="e.g. Emergency Fund" />
                </div>
                <div className="space-y-2">
                  <Label>Target Amount</Label>
                  <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Deadline (optional)</Label>
                  <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this goal for?" rows={2} />
                </div>
                <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Create'} Goal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No savings goals yet</p>
            <p className="text-sm mt-1">Create your first goal to start tracking your savings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {filteredGoals.map(goal => {
              const saved = goalProgress[goal.id] || 0;
              const pct = Math.min(100, goal.target_amount > 0 ? (saved / goal.target_amount) * 100 : 0);
              const remaining = Math.max(0, goal.target_amount - saved);
              const daysLeft = getDaysRemaining(goal.target_date);
              const isOverTarget = saved >= goal.target_amount;

              return (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="font-display text-lg truncate">{goal.goal_name}</CardTitle>
                          {goal.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>}
                        </div>
                        <Badge variant="outline" className={statusColors[goal.status] || ''}>
                          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={pct} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Saved: {formatCurrency(saved)}</span>
                          <span>Target: {formatCurrency(goal.target_amount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
                      </div>

                      {goal.target_date && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {daysLeft !== null && daysLeft > 0
                              ? `${daysLeft} days remaining`
                              : daysLeft !== null && daysLeft <= 0
                                ? 'Deadline passed'
                                : ''}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(goal.target_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 pt-1 border-t border-border">
                        {isOverTarget && goal.status !== 'completed' && (
                          <Button variant="outline" size="sm" className="gap-1 text-success" onClick={() => handleMarkComplete(goal.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleToggleStatus(goal)}>
                          {goal.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> :
                           goal.status === 'paused' ? <><Play className="w-3.5 h-3.5" /> Resume</> :
                           <><TrendingUp className="w-3.5 h-3.5" /> Reactivate</>}
                        </Button>
                        <div className="ml-auto flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deleteGoal(goal.id); toast({ title: 'Goal deleted' }); }}>
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

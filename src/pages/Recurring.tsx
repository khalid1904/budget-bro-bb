import { useState } from 'react';
import { useRecurring, RecurringRule } from '@/lib/recurring-context';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, RefreshCw, Repeat, Pause, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

function formatMonthYear(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getLastDayOfMonth(year: string, month: string): string {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
}

export default function RecurringPage() {
  const { rules, loading, addRule, updateRule, deleteRule, toggleRule, generateTransactions } = useRecurring();
  const { customCategories, formatCurrency, refreshTransactions } = useBudget();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  const [generating, setGenerating] = useState(false);

  const allCategories = type === 'incoming'
    ? [...DEFAULT_INCOMING_CATEGORIES, ...customCategories.incoming]
    : [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];

  const resetForm = () => {
    setTitle(''); setAmount(''); setCategory(''); setType('outgoing');
    setStartMonth(''); setStartYear(''); setEndMonth(''); setEndYear('');
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !amount || !category) {
      toast({ title: 'Please fill required fields', variant: 'destructive' }); return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' }); return;
    }
    if (!startMonth || !startYear) {
      toast({ title: 'Please select a start month and year', variant: 'destructive' }); return;
    }
    if (!endMonth || !endYear) {
      toast({ title: 'Please select an end month and year', variant: 'destructive' }); return;
    }

    const startDate = `${startYear}-${startMonth}-01`;
    const endDate = getLastDayOfMonth(endYear, endMonth);

    if (endDate < startDate) {
      toast({ title: 'End date must be after start date', variant: 'destructive' }); return;
    }

    const payload = {
      title: title.trim(),
      amount: amt,
      category,
      type,
      start_date: startDate,
      end_date: endDate,
    };

    if (editId) {
      await updateRule(editId, payload);
      toast({ title: 'Recurring rule updated' });
    } else {
      await addRule(payload);
      toast({ title: 'Recurring rule created' });
    }
    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (rule: RecurringRule) => {
    setTitle(rule.title);
    setAmount(String(rule.amount));
    setCategory(rule.category);
    setType(rule.type);
    const sd = rule.start_date.split('-');
    setStartYear(sd[0]); setStartMonth(sd[1]);
    const ed = rule.end_date.split('-');
    setEndYear(ed[0]); setEndMonth(ed[1]);
    setEditId(rule.id);
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const count = await generateTransactions();
    await refreshTransactions();
    setGenerating(false);
    toast({ title: count > 0 ? `Generated ${count} transaction${count > 1 ? 's' : ''}` : 'All transactions up to date' });
  };

  const activeRules = rules.filter(r => r.is_active);
  const pausedRules = rules.filter(r => !r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Recurring</h1>
          <p className="text-muted-foreground mt-1">Manage automated monthly income & expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">{editId ? 'Edit' : 'New'} Recurring Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Netflix Subscription" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => { setType(v as 'incoming' | 'outgoing'); setCategory(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incoming">Income</SelectItem>
                        <SelectItem value="outgoing">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Start Date: Month + Year */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={startMonth} onValueChange={setStartMonth}>
                      <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={startYear} onValueChange={setStartYear}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End Date: Month + Year (required) */}
                <div className="space-y-2">
                  <Label>End Date <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={endMonth} onValueChange={setEndMonth}>
                      <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={endYear} onValueChange={setEndYear}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full">{editId ? 'Update' : 'Create'} Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">Active Rules</p>
            <p className="text-2xl font-display font-bold text-foreground">{activeRules.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">Monthly Recurring Income</p>
            <p className="text-2xl font-display font-bold text-success">
              {formatCurrency(activeRules.filter(r => r.type === 'incoming').reduce((s, r) => s + r.amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">Monthly Recurring Expenses</p>
            <p className="text-2xl font-display font-bold text-destructive">
              {formatCurrency(activeRules.filter(r => r.type === 'outgoing').reduce((s, r) => s + r.amount, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Rules */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" /> Active Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRules.length > 0 ? (
            <div className="divide-y divide-border">
              <AnimatePresence>
                {activeRules.map(rule => (
                  <RuleRow key={rule.id} rule={rule} onEdit={handleEdit} onDelete={deleteRule} onToggle={toggleRule} formatCurrency={formatCurrency} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No active recurring rules. Create one to get started!</p>
          )}
        </CardContent>
      </Card>

      {/* Paused Rules */}
      {pausedRules.length > 0 && (
        <Card className="shadow-card opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Pause className="w-5 h-5 text-muted-foreground" /> Paused Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <AnimatePresence>
                {pausedRules.map(rule => (
                  <RuleRow key={rule.id} rule={rule} onEdit={handleEdit} onDelete={deleteRule} onToggle={toggleRule} formatCurrency={formatCurrency} />
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleRow({ rule, onEdit, onDelete, onToggle, formatCurrency }: {
  rule: RecurringRule;
  onEdit: (r: RecurringRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  formatCurrency: (n: number) => string;
}) {
  const { toast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center justify-between py-3 gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{rule.title}</p>
          <Badge variant="outline" className="text-xs shrink-0">
            <Repeat className="w-3 h-3 mr-1" /> Monthly
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{rule.category}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {formatMonthYear(rule.start_date)} → {formatMonthYear(rule.end_date)}
          </span>
          <Badge variant={rule.type === 'incoming' ? 'default' : 'destructive'} className="text-xs">
            {rule.type === 'incoming' ? 'Income' : 'Expense'}
          </Badge>
        </div>
      </div>
      <span className={`font-display font-semibold whitespace-nowrap ${rule.type === 'incoming' ? 'text-success' : 'text-destructive'}`}>
        {formatCurrency(rule.amount)}
      </span>
      <div className="flex items-center gap-1">
        <Switch checked={rule.is_active} onCheckedChange={() => onToggle(rule.id)} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(rule)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
          await onDelete(rule.id);
          toast({ title: 'Rule deleted' });
        }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  /** Default direction based on the page that opens this dialog */
  defaultDirection: 'other_to_monthly' | 'monthly_to_other';
  /** When opened from an Other Budget detail page, lock the pot */
  fixedOtherBudgetId?: string;
  /** When opened from the monthly Budget page, lock the month */
  fixedMonth?: string;
  triggerClassName?: string;
}

export function TransferDialog({ defaultDirection, fixedOtherBudgetId, fixedMonth, triggerClassName }: Props) {
  const { otherBudgets, currentMonth, transactions, customCategories, createTransfer } = useBudget();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState(defaultDirection);
  const [otherBudgetId, setOtherBudgetId] = useState(fixedOtherBudgetId || otherBudgets[0]?.id || '');
  const [month, setMonth] = useState(fixedMonth || currentMonth);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceCategory, setSourceCategory] = useState('Savings');
  const [destCategory, setDestCategory] = useState('Other');
  const [submitting, setSubmitting] = useState(false);

  // Available months from existing transactions plus current
  const monthOptions = useMemo(() => {
    const set = new Set<string>(transactions.map(t => t.month));
    set.add(currentMonth);
    if (fixedMonth) set.add(fixedMonth);
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonth, fixedMonth]);

  const outgoingCats = [...DEFAULT_OUTGOING_CATEGORIES, ...customCategories.outgoing];
  const incomingCats = [...DEFAULT_INCOMING_CATEGORIES, ...customCategories.incoming];

  useEffect(() => {
    if (!open) return;
    setDirection(defaultDirection);
    setOtherBudgetId(fixedOtherBudgetId || otherBudgets[0]?.id || '');
    setMonth(fixedMonth || currentMonth);
    setAmount('');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setSourceCategory('Savings');
    setDestCategory('Other');
  }, [open, defaultDirection, fixedOtherBudgetId, fixedMonth, currentMonth, otherBudgets]);

  const otherName = otherBudgets.find(b => b.id === otherBudgetId)?.name || 'Other Budget';

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    if (!otherBudgetId) { toast({ title: 'Pick an Other Budget', variant: 'destructive' }); return; }
    if (!month) { toast({ title: 'Pick a month', variant: 'destructive' }); return; }
    const finalTitle = title.trim() || (direction === 'other_to_monthly' ? `Transfer from ${otherName}` : `Transfer to ${otherName}`);
    setSubmitting(true);
    try {
      await createTransfer({ direction, otherBudgetId, month, amount: amt, title: finalTitle, date, sourceCategory, destCategory });
      toast({ title: 'Transfer completed' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Transfer failed', description: e?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (otherBudgets.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <ArrowLeftRight className="w-4 h-4 mr-1" /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Cross-budget Transfer</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup value={direction} onValueChange={(v) => setDirection(v as any)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other_to_monthly" id="dir-otm" />
                <Label htmlFor="dir-otm" className="font-normal cursor-pointer">Other Budget → Monthly</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="monthly_to_other" id="dir-mto" />
                <Label htmlFor="dir-mto" className="font-normal cursor-pointer">Monthly → Other Budget</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Other Budget</Label>
              <Select value={otherBudgetId} onValueChange={setOtherBudgetId} disabled={!!fixedOtherBudgetId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {otherBudgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth} disabled={!!fixedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2"><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
          <div className="space-y-2"><Label>Title (optional)</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-generated if empty" /></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Source category (outgoing)</Label>
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{outgoingCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination category (incoming)</Label>
              <Select value={destCategory} onValueChange={setDestCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{incomingCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? 'Transferring…' : 'Transfer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

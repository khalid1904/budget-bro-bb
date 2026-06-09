import { useState, useMemo, useEffect } from 'react';
import { useBudget, Loan, LendingLink } from '@/lib/budget-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, HandCoins, Wallet, TrendingUp, Users, Edit2, Trash2, CheckCircle2, Clock, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Filter = 'all' | 'open' | 'closed';
type LinkKind = 'none' | 'monthly' | 'other';

function LinkControls({
  enabled, setEnabled, kind, setKind, month, setMonth, otherId, setOtherId, otherBudgets, label,
}: {
  enabled: boolean; setEnabled: (v: boolean) => void;
  kind: 'monthly' | 'other'; setKind: (k: 'monthly' | 'other') => void;
  month: string; setMonth: (m: string) => void;
  otherId: string; setOtherId: (i: string) => void;
  otherBudgets: { id: string; name: string }[];
  label: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {enabled && (
        <div className="space-y-2 pt-1">
          <RadioGroup value={kind} onValueChange={(v) => setKind(v as 'monthly' | 'other')} className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="monthly" id={`${label}-m`} /> Monthly Budget
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="other" id={`${label}-o`} disabled={otherBudgets.length === 0} /> Other Budget
            </label>
          </RadioGroup>
          {kind === 'monthly' ? (
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          ) : (
            <Select value={otherId} onValueChange={setOtherId}>
              <SelectTrigger><SelectValue placeholder="Pick an Other Budget" /></SelectTrigger>
              <SelectContent>
                {otherBudgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

function buildLink(enabled: boolean, kind: 'monthly' | 'other', month: string, otherId: string): LendingLink {
  if (!enabled) return null;
  if (kind === 'monthly') return { kind: 'monthly', month };
  if (kind === 'other' && otherId) return { kind: 'other', other_budget_id: otherId };
  return null;
}

export default function Lending() {
  const { loans, loanRecoveries, otherBudgets, currentMonth, addLoan, editLoan, deleteLoan, addRecovery, deleteRecovery, formatCurrency } = useBudget();
  const { toast } = useToast();

  const [filter, setFilter] = useState<Filter>('all');
  const [loanDialog, setLoanDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [lentDate, setLentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  // Loan link state
  const [loanLinkEnabled, setLoanLinkEnabled] = useState(false);
  const [loanLinkKind, setLoanLinkKind] = useState<'monthly' | 'other'>('monthly');
  const [loanLinkMonth, setLoanLinkMonth] = useState(currentMonth);
  const [loanLinkOther, setLoanLinkOther] = useState('');

  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [recAmount, setRecAmount] = useState('');
  const [recDate, setRecDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recNote, setRecNote] = useState('');

  // Recovery link state
  const [recLinkEnabled, setRecLinkEnabled] = useState(false);
  const [recLinkKind, setRecLinkKind] = useState<'monthly' | 'other'>('monthly');
  const [recLinkMonth, setRecLinkMonth] = useState(currentMonth);
  const [recLinkOther, setRecLinkOther] = useState('');

  const [deleteLoanId, setDeleteLoanId] = useState<string | null>(null);
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null);

  // Keep detailLoan in sync when underlying loans change
  useEffect(() => {
    if (detailLoan) {
      const fresh = loans.find(l => l.id === detailLoan.id);
      if (fresh && fresh !== detailLoan) setDetailLoan(fresh);
      if (!fresh) setDetailLoan(null);
    }
  }, [loans, detailLoan]);

  const recoveredByLoan = useMemo(() => {
    const m = new Map<string, number>();
    loanRecoveries.forEach(r => m.set(r.loan_id, (m.get(r.loan_id) || 0) + r.amount));
    return m;
  }, [loanRecoveries]);

  const enriched = useMemo(() => {
    return loans.map(l => {
      const recovered = recoveredByLoan.get(l.id) || 0;
      const outstanding = Math.max(l.amount - recovered, 0);
      const fully = recovered >= l.amount;
      const status: 'open' | 'partial' | 'closed' = fully ? 'closed' : recovered > 0 ? 'partial' : 'open';
      return { loan: l, recovered, outstanding, status };
    });
  }, [loans, recoveredByLoan]);

  const filtered = enriched.filter(e => filter === 'all' ? true : filter === 'open' ? e.status !== 'closed' : e.status === 'closed');

  const totals = useMemo(() => {
    const lent = loans.reduce((s, l) => s + l.amount, 0);
    const recovered = loanRecoveries.reduce((s, r) => s + r.amount, 0);
    const active = enriched.filter(e => e.status !== 'closed').length;
    return { lent, recovered, outstanding: Math.max(lent - recovered, 0), active };
  }, [loans, loanRecoveries, enriched]);

  const otherBudgetName = (id?: string | null) => id ? otherBudgets.find(b => b.id === id)?.name : null;

  const resetLoanLinkForm = () => {
    setLoanLinkEnabled(false); setLoanLinkKind('monthly'); setLoanLinkMonth(currentMonth); setLoanLinkOther('');
  };

  const openAdd = () => {
    setEditingLoan(null);
    setBorrower(''); setAmount(''); setLentDate(new Date().toISOString().slice(0, 10)); setNote('');
    resetLoanLinkForm();
    setLoanDialog(true);
  };

  const openEdit = (l: Loan) => {
    setEditingLoan(l);
    setBorrower(l.borrower_name); setAmount(String(l.amount)); setLentDate(l.lent_date); setNote(l.note);
    if (l.linked_transaction_id) {
      setLoanLinkEnabled(true); setLoanLinkKind('monthly'); setLoanLinkMonth(currentMonth); setLoanLinkOther('');
    } else if (l.linked_other_budget_txn_id) {
      setLoanLinkEnabled(true); setLoanLinkKind('other'); setLoanLinkOther(''); setLoanLinkMonth(currentMonth);
    } else {
      resetLoanLinkForm();
    }
    setLoanDialog(true);
  };

  const saveLoan = async () => {
    const amt = parseFloat(amount);
    if (!borrower.trim() || !amt || amt <= 0) {
      toast({ title: 'Enter borrower name and a valid amount', variant: 'destructive' });
      return;
    }
    if (loanLinkEnabled && loanLinkKind === 'other' && !loanLinkOther) {
      toast({ title: 'Pick an Other Budget', variant: 'destructive' }); return;
    }
    const link = buildLink(loanLinkEnabled, loanLinkKind, loanLinkMonth, loanLinkOther);
    if (editingLoan) {
      const had = editingLoan.linked_transaction_id || editingLoan.linked_other_budget_txn_id;
      // Only pass link if user changed it (we can't perfectly detect, so always pass when destination differs from current)
      // For safety: if had link and now enabled with same kind, don't recreate. Otherwise recreate.
      const sameMonthly = editingLoan.linked_transaction_id && loanLinkEnabled && loanLinkKind === 'monthly';
      const sameOther = editingLoan.linked_other_budget_txn_id && loanLinkEnabled && loanLinkKind === 'other';
      const linkChanged = !((had && !loanLinkEnabled) ? false : (!had && !loanLinkEnabled) ? true : sameMonthly || sameOther);
      await editLoan(editingLoan.id, { borrower_name: borrower.trim(), amount: amt, lent_date: lentDate, note: note.trim() }, linkChanged ? link : undefined);
      toast({ title: 'Loan updated' });
    } else {
      await addLoan({ borrower_name: borrower.trim(), amount: amt, lent_date: lentDate, note: note.trim() }, link);
      toast({ title: 'Loan recorded' });
    }
    setLoanDialog(false);
  };

  const addRec = async () => {
    if (!detailLoan) return;
    const amt = parseFloat(recAmount);
    if (!amt || amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    if (recLinkEnabled && recLinkKind === 'other' && !recLinkOther) {
      toast({ title: 'Pick an Other Budget', variant: 'destructive' }); return;
    }
    const link = buildLink(recLinkEnabled, recLinkKind, recLinkMonth, recLinkOther);
    await addRecovery({ loan_id: detailLoan.id, amount: amt, recovered_date: recDate, note: recNote.trim() }, link);
    setRecAmount(''); setRecNote(''); setRecDate(new Date().toISOString().slice(0, 10));
    setRecLinkEnabled(false); setRecLinkKind('monthly'); setRecLinkMonth(currentMonth); setRecLinkOther('');
    toast({ title: 'Recovery added' });
  };

  const detailRecoveries = detailLoan ? loanRecoveries.filter(r => r.loan_id === detailLoan.id) : [];
  const detailRecovered = detailRecoveries.reduce((s, r) => s + r.amount, 0);
  const detailOutstanding = detailLoan ? Math.max(detailLoan.amount - detailRecovered, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <HandCoins className="w-7 h-7 text-primary" /> Lending Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Track money you've lent and recover it over time</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> New Loan</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><Wallet className="w-3.5 h-3.5" /> TOTAL LENT</div>
          <div className="text-xl font-display font-bold text-foreground">{formatCurrency(totals.lent)}</div>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><TrendingUp className="w-3.5 h-3.5" /> RECOVERED</div>
          <div className="text-xl font-display font-bold text-primary">{formatCurrency(totals.recovered)}</div>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><Clock className="w-3.5 h-3.5" /> OUTSTANDING</div>
          <div className="text-xl font-display font-bold text-destructive">{formatCurrency(totals.outstanding)}</div>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><Users className="w-3.5 h-3.5" /> ACTIVE</div>
          <div className="text-xl font-display font-bold text-foreground">{totals.active}</div>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all">All ({enriched.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({enriched.filter(e => e.status !== 'closed').length})</TabsTrigger>
          <TabsTrigger value="closed">Recovered ({enriched.filter(e => e.status === 'closed').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loans list */}
      {filtered.length === 0 ? (
        <Card className="shadow-card"><CardContent className="p-10 text-center">
          <HandCoins className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">{loans.length === 0 ? 'No loans yet. Click "New Loan" to record one.' : 'No loans in this filter.'}</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(({ loan, recovered, outstanding, status }) => {
            const pct = loan.amount > 0 ? Math.min((recovered / loan.amount) * 100, 100) : 0;
            const linkedLabel = loan.linked_transaction_id
              ? 'Linked to monthly budget'
              : loan.linked_other_budget_txn_id
                ? `Linked to ${otherBudgetName(loan.linked_other_budget_txn_id) || 'Other Budget'}`
                : null;
            return (
              <Card key={loan.id} className="shadow-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDetailLoan(loan)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-foreground truncate">{loan.borrower_name}</p>
                      <p className="text-xs text-muted-foreground">Lent on {new Date(loan.lent_date).toLocaleDateString()}</p>
                    </div>
                    {status === 'closed' ? (
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Recovered</Badge>
                    ) : status === 'partial' ? (
                      <Badge variant="secondary">Partial</Badge>
                    ) : (
                      <Badge variant="outline">Outstanding</Badge>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-semibold text-foreground">{formatCurrency(outstanding)}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(recovered)} recovered</span>
                    <span>of {formatCurrency(loan.amount)}</span>
                  </div>
                  {linkedLabel && (
                    <div className="flex items-center gap-1 text-[11px] text-primary/80 pt-1">
                      <Link2 className="w-3 h-3" /> {linkedLabel}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New / Edit loan dialog */}
      <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editingLoan ? 'Edit Loan' : 'New Loan'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Borrower</Label><Input value={borrower} onChange={e => setBorrower(e.target.value)} placeholder="e.g. Alex" /></div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>Date Lent</Label><Input type="date" value={lentDate} onChange={e => setLentDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What was it for?" rows={2} /></div>

            <LinkControls
              enabled={loanLinkEnabled} setEnabled={setLoanLinkEnabled}
              kind={loanLinkKind} setKind={setLoanLinkKind}
              month={loanLinkMonth} setMonth={setLoanLinkMonth}
              otherId={loanLinkOther} setOtherId={setLoanLinkOther}
              otherBudgets={otherBudgets}
              label="Also record as an outgoing in my budget"
            />
            {editingLoan && (editingLoan.linked_transaction_id || editingLoan.linked_other_budget_txn_id) && (
              <p className="text-xs text-muted-foreground">This loan is linked to a budget entry. Changing destination will replace the linked entry; turning off removes it.</p>
            )}
          </div>
          <DialogFooter>
            {editingLoan && <Button variant="destructive" className="mr-auto" onClick={() => { setDeleteLoanId(editingLoan.id); setLoanDialog(false); }}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
            <Button variant="outline" onClick={() => setLoanDialog(false)}>Cancel</Button>
            <Button onClick={saveLoan}>{editingLoan ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan detail dialog */}
      <Dialog open={!!detailLoan} onOpenChange={(o) => !o && setDetailLoan(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailLoan && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center justify-between gap-2">
                  <span className="truncate">{detailLoan.borrower_name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDetailLoan(null); openEdit(detailLoan); }}><Edit2 className="w-4 h-4" /></Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lent</p>
                    <p className="font-display font-bold text-sm">{formatCurrency(detailLoan.amount)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recovered</p>
                    <p className="font-display font-bold text-sm text-primary">{formatCurrency(detailRecovered)}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open</p>
                    <p className="font-display font-bold text-sm text-destructive">{formatCurrency(detailOutstanding)}</p>
                  </div>
                </div>
                {detailLoan.note && <p className="text-sm text-muted-foreground italic">"{detailLoan.note}"</p>}

                {detailOutstanding > 0 && (
                  <div className="rounded-xl border border-border p-3 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Add Recovery</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" inputMode="decimal" placeholder="Amount" value={recAmount} onChange={e => setRecAmount(e.target.value)} />
                      <Input type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />
                    </div>
                    <Input placeholder="Note (optional)" value={recNote} onChange={e => setRecNote(e.target.value)} />
                    <LinkControls
                      enabled={recLinkEnabled} setEnabled={setRecLinkEnabled}
                      kind={recLinkKind} setKind={setRecLinkKind}
                      month={recLinkMonth} setMonth={setRecLinkMonth}
                      otherId={recLinkOther} setOtherId={setRecLinkOther}
                      otherBudgets={otherBudgets}
                      label="Also record as an incoming in my budget"
                    />
                    <Button size="sm" className="w-full" onClick={addRec}><Plus className="w-4 h-4 mr-1" /> Record Recovery</Button>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recovery History</p>
                  {detailRecoveries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No recoveries yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detailRecoveries.map(r => {
                        const recLinked = r.linked_transaction_id
                          ? 'Linked to monthly budget'
                          : r.linked_other_budget_txn_id
                            ? `Linked to ${otherBudgetName(r.linked_other_budget_txn_id) || 'Other Budget'}`
                            : null;
                        return (
                          <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{formatCurrency(r.amount)}</p>
                              <p className="text-xs text-muted-foreground">{new Date(r.recovered_date).toLocaleDateString()}{r.note ? ` · ${r.note}` : ''}</p>
                              {recLinked && <p className="text-[11px] text-primary/80 flex items-center gap-1 mt-0.5"><Link2 className="w-3 h-3" />{recLinked}</p>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteRecId(r.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteLoanId} onOpenChange={(o) => !o && setDeleteLoanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the loan, all its recovery entries, and any linked budget entries. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteLoanId) { await deleteLoan(deleteLoanId); setDeleteLoanId(null); setDetailLoan(null); toast({ title: 'Loan deleted' }); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRecId} onOpenChange={(o) => !o && setDeleteRecId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recovery?</AlertDialogTitle>
            <AlertDialogDescription>This will reduce the recovered total for this loan and remove the linked budget entry (if any).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteRecId) { await deleteRecovery(deleteRecId); setDeleteRecId(null); toast({ title: 'Recovery deleted' }); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

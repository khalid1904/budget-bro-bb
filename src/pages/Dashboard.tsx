import { useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, Plus, AlertTriangle, PiggyBank, BarChart3 } from 'lucide-react';
import { getCategoryType } from '@/lib/types';
import { getCategoryIcon } from '@/lib/category-icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const CHART_COLORS = [
  'hsl(160, 84%, 39%)', 'hsl(142, 71%, 45%)', 'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(38, 92%, 50%)',
];

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

export default function DashboardPage() {
  const { currentMonth, setCurrentMonth, transactions, formatCurrency, profile } = useBudget();

  const monthTxns = useMemo(() => transactions.filter(t => t.month === currentMonth), [transactions, currentMonth]);
  const incoming = useMemo(() => monthTxns.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const outgoing = useMemo(() => monthTxns.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const spending = useMemo(() => monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'spending').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const savings = useMemo(() => monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'savings').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const investments = useMemo(() => monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'investment').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const inHand = incoming - outgoing;
  const isNegative = inHand < 0;
  const monthOptions = getMonthOptions();

  const categoryData = useMemo(() => {
    const group = (type: string) => {
      const map: Record<string, number> = {};
      monthTxns.filter(t => t.type === type).forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    };
    return { incoming: group('incoming'), outgoing: group('outgoing') };
  }, [monthTxns]);

  const monthlyTrend = useMemo(() => {
    const byMonth: Record<string, { income: number; spending: number }> = {};
    transactions.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = { income: 0, spending: 0 };
      if (t.type === 'incoming') byMonth[t.month].income += t.amount;
      else if (getCategoryType(t.category) === 'spending') byMonth[t.month].spending += t.amount;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([m, d]) => ({
      month: formatMonth(m).split(' ')[0]?.slice(0, 3), ...d
    }));
  }, [transactions]);

  // Recent transactions (latest 5)
  const recentTxns = useMemo(() =>
    monthTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [monthTxns]
  );

  // Donut data for total budget allocation
  const donutData = useMemo(() => {
    const data = [];
    if (spending > 0) data.push({ name: 'Spending', value: spending });
    if (savings > 0) data.push({ name: 'Savings', value: savings });
    if (investments > 0) data.push({ name: 'Investments', value: investments });
    if (inHand > 0) data.push({ name: 'In Hand', value: inHand });
    return data;
  }, [spending, savings, investments, inHand]);

  const donutColors = ['hsl(0, 72%, 51%)', 'hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)'];

  const displayName = profile.username || 'Bro';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Yo, {displayName}! 🤙
          </h1>
          <p className="text-muted-foreground mt-1">Your financial overview for {formatMonth(currentMonth)}</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <Select value={currentMonth} onValueChange={setCurrentMonth}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild><Link to="/budget"><Plus className="w-4 h-4 mr-1" /> Add</Link></Button>
        </div>
      </div>

      {/* Hero Section: Donut + Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-elevated overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Donut */}
              <div className="relative w-48 h-48 shrink-0">
                {donutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {donutData.map((_, i) => <Cell key={i} fill={donutColors[i % donutColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full rounded-full border-[12px] border-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No data</span>
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total Budget</span>
                  <span className="text-lg font-display font-bold text-foreground">{formatCurrency(outgoing)}</span>
                </div>
              </div>

              {/* Summary Cards inline */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
                {[
                  { label: 'Income', value: incoming, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
                  { label: 'Spending', value: spending, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
                  { label: 'Savings', value: savings, icon: PiggyBank, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Investments', value: investments, icon: BarChart3, color: 'text-warning', bg: 'bg-warning/10' },
                  { label: 'In Hand', value: inHand, icon: Wallet, color: isNegative ? 'text-destructive' : 'text-success', bg: isNegative ? 'bg-destructive/10' : 'bg-success/10' },
                ].map((card) => (
                  <div key={card.label} className={`rounded-xl p-3 ${card.bg}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                    </div>
                    <p className={`text-lg font-display font-bold ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                    {card.label === 'In Hand' && isNegative && (
                      <div className="flex items-center gap-1 mt-1 text-destructive text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Deficit</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/budget" className="text-primary text-xs">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTxns.length > 0 ? (
                <div className="space-y-3">
                  {recentTxns.map(tx => {
                    const catIcon = getCategoryIcon(tx.category);
                    const IconComp = catIcon.icon;
                    return (
                      <div key={tx.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: catIcon.bg }}>
                          <IconComp className="w-5 h-5" style={{ color: catIcon.fg }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{tx.title}</p>
                          <p className="text-xs text-muted-foreground">{tx.category} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <span className={`text-sm font-display font-semibold whitespace-nowrap ${tx.type === 'incoming' ? 'text-success' : 'text-destructive'}`}>
                          {tx.type === 'incoming' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet. <Link to="/budget" className="text-primary hover:underline">Add entries</Link></p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Donut (Outgoing) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="font-display text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.outgoing.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData.outgoing} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={60} strokeWidth={0}>
                          {categoryData.outgoing.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {categoryData.outgoing.map((d, i) => {
                      const catIcon = getCategoryIcon(d.name);
                      const IconComp = catIcon.icon;
                      return (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: catIcon.bg }}>
                              <IconComp className="w-3.5 h-3.5" style={{ color: catIcon.fg }} />
                            </div>
                            <span className="text-foreground">{d.name}</span>
                          </div>
                          <span className="text-muted-foreground">{formatCurrency(d.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No outgoing data yet. <Link to="/budget" className="text-primary hover:underline">Add entries</Link></p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Trend */}
        {monthlyTrend.length > 1 && (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="spending" fill="hsl(0, 72%, 58%)" radius={[6, 6, 0, 0]} name="Spending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

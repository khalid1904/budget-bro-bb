import { useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, Plus, AlertTriangle, PiggyBank, BarChart3 } from 'lucide-react';
import { getCategoryType } from '@/lib/types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const CHART_COLORS = [
  'hsl(160, 84%, 30%)', 'hsl(38, 92%, 50%)', 'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(80, 60%, 45%)',
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
  const { currentMonth, setCurrentMonth, transactions, formatCurrency } = useBudget();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial overview</p>
        </div>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Income', value: incoming, icon: TrendingUp, color: 'text-success' },
          { label: 'Total Spending', value: spending, icon: TrendingDown, color: 'text-destructive' },
          { label: 'Savings', value: savings, icon: PiggyBank, color: 'text-primary' },
          { label: 'Investments', value: investments, icon: BarChart3, color: 'text-warning' },
          { label: 'In Hand', value: inHand, icon: Wallet, color: isNegative ? 'text-destructive' : 'text-primary' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className={`text-2xl md:text-3xl font-display font-bold ${card.color}`}>
                  {formatCurrency(card.value)}
                </p>
                {card.label === 'In Hand' && isNegative && (
                  <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Deficit — spending exceeds income</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['incoming', 'outgoing'] as const).map(type => (
          <Card key={type} className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg capitalize">{type} by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData[type].length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData[type]} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={60}>
                          {categoryData[type].map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {categoryData[type].map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-foreground">{d.name}</span>
                        </div>
                        <span className="text-muted-foreground">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No {type} data yet. <Link to="/budget" className="text-primary hover:underline">Add entries</Link></p>
              )}
            </CardContent>
          </Card>
        ))}

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
                    <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="spending" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Spending" />
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

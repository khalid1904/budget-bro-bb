import { useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, Plus, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const CHART_COLORS = [
  'hsl(160, 84%, 30%)', 'hsl(38, 92%, 50%)', 'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(80, 60%, 45%)',
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

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
  const { currentMonth, setCurrentMonth, getTotalIncoming, getTotalOutgoing, getInHand, getCurrentBudget, budgets } = useBudget();

  const incoming = getTotalIncoming();
  const outgoing = getTotalOutgoing();
  const inHand = getInHand();
  const budget = getCurrentBudget();
  const isNegative = inHand < 0;
  const monthOptions = getMonthOptions();

  const categoryData = useMemo(() => {
    if (!budget) return { incoming: [], outgoing: [] };
    const group = (type: 'incoming' | 'outgoing') => {
      const map: Record<string, number> = {};
      budget.transactions.filter(t => t.type === type).forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    };
    return { incoming: group('incoming'), outgoing: group('outgoing') };
  }, [budget]);

  const monthlyTrend = useMemo(() => {
    return budgets.slice(-6).map(b => {
      const inc = b.transactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
      const out = b.transactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);
      return { month: formatMonth(b.month).split(' ')[0]?.slice(0, 3), income: inc, expense: out };
    });
  }, [budgets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentMonth} onValueChange={setCurrentMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild><Link to="/budget"><Plus className="w-4 h-4 mr-1" /> Add</Link></Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: incoming, icon: TrendingUp, color: 'text-success' },
          { label: 'Total Expenses', value: outgoing, icon: TrendingDown, color: 'text-destructive' },
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
                    <span>Deficit — expenses exceed income</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
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
                          {categoryData[type].map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
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

        {/* Monthly trend */}
        {monthlyTrend.length > 1 && (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
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

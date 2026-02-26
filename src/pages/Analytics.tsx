import { useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

const COLORS = [
  'hsl(160, 84%, 30%)', 'hsl(38, 92%, 50%)', 'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(80, 60%, 45%)',
  'hsl(30, 70%, 50%)', 'hsl(260, 50%, 55%)',
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function AnalyticsPage() {
  const { budgets, currentMonth, setCurrentMonth } = useBudget();
  const budget = budgets.find(b => b.month === currentMonth);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, []);

  const categoryBreakdown = useMemo(() => {
    if (!budget) return { incoming: [], outgoing: [] };
    const group = (type: 'incoming' | 'outgoing') => {
      const map: Record<string, number> = {};
      budget.transactions.filter(t => t.type === type).forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    };
    return { incoming: group('incoming'), outgoing: group('outgoing') };
  }, [budget]);

  const monthlyComparison = useMemo(() => {
    return budgets.map(b => {
      const inc = b.transactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
      const out = b.transactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);
      return { month: formatMonth(b.month), income: inc, expense: out, savings: inc - out };
    }).slice(-12);
  }, [budgets]);

  const totalInc = budget?.transactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalOut = budget?.transactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0) ?? 0;
  const savingsRatio = totalInc > 0 ? ((totalInc - totalOut) / totalInc * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your finances</p>
        </div>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Income</p>
            <p className="text-2xl font-display font-bold text-success">{formatCurrency(totalInc)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Expenses</p>
            <p className="text-2xl font-display font-bold text-destructive">{formatCurrency(totalOut)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Savings Ratio</p>
            <p className={`text-2xl font-display font-bold ${savingsRatio >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {savingsRatio.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['incoming', 'outgoing'] as const).map(type => (
          <Card key={type} className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display capitalize">{type} Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryBreakdown[type].length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryBreakdown[type]} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {categoryBreakdown[type].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                    {categoryBreakdown[type].map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-foreground truncate">{d.name}</span>
                        </div>
                        <span className="text-muted-foreground ml-2">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">No data for this month</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly comparison */}
      {monthlyComparison.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings trend */}
      {monthlyComparison.length > 1 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyComparison}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="savings" stroke="hsl(160, 84%, 30%)" strokeWidth={2} dot={{ r: 4 }} name="Net Savings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

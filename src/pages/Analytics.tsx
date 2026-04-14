import { useMemo } from 'react';
import { useBudget } from '@/lib/budget-context';
import { Receipt, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import { Info, ShieldCheck, Droplets, PiggyBank, TrendingUp } from 'lucide-react';

const COLORS = [
  'hsl(160, 84%, 39%)', 'hsl(142, 71%, 45%)', 'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(38, 92%, 50%)',
  'hsl(170, 60%, 40%)', 'hsl(260, 50%, 55%)',
];

import { getCategoryType } from '@/lib/types';

function formatMonthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatRatio(value: number, totalIncome: number): string {
  if (totalIncome === 0) return 'N/A';
  return `${(Math.round(value * 100) / 100).toFixed(2)}%`;
}

export default function AnalyticsPage() {
  const { transactions, currentMonth, setCurrentMonth, formatCurrency, expenses, settings } = useBudget();

  const monthOptions = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, []);

  const monthTxns = useMemo(() => transactions.filter(t => t.month === currentMonth), [transactions, currentMonth]);

  const categoryBreakdown = useMemo(() => {
    const group = (type: string) => {
      const map: Record<string, number> = {};
      monthTxns.filter(t => t.type === type).forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    };
    return { incoming: group('incoming'), outgoing: group('outgoing') };
  }, [monthTxns]);

  const monthlyComparison = useMemo(() => {
    const byMonth: Record<string, { income: number; spending: number }> = {};
    transactions.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = { income: 0, spending: 0 };
      if (t.type === 'incoming') byMonth[t.month].income += t.amount;
      else if (getCategoryType(t.category) === 'spending') byMonth[t.month].spending += t.amount;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([m, d]) => ({
      month: formatMonthLabel(m), income: d.income, spending: d.spending, surplus: d.income - d.spending
    }));
  }, [transactions]);

  const totalInc = useMemo(() => monthTxns.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const totalOut = useMemo(() => monthTxns.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const totalSpending = useMemo(() => monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'spending').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const inHand = totalInc - totalOut;

  const savingsAmount = useMemo(() =>
    monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'savings').reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );
  const investmentAmount = useMemo(() =>
    monthTxns.filter(t => t.type === 'outgoing' && getCategoryType(t.category) === 'investment').reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );

  const wrr = totalInc > 0 ? (inHand + savingsAmount + investmentAmount) / totalInc * 100 : 0;
  const lrr = totalInc > 0 ? inHand / totalInc * 100 : 0;
  const sar = totalInc > 0 ? savingsAmount / totalInc * 100 : 0;
  const iar = totalInc > 0 ? investmentAmount / totalInc * 100 : 0;

  // Expense tracking data
  const expenseEnabled = settings?.expense_tracking_enabled ?? false;

  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.month === currentMonth),
    [expenses, currentMonth]
  );

  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthExpenses]);

  const budgetVsActual = useMemo(() => {
    const budgeted: Record<string, number> = {};
    monthTxns.filter(t => t.type === 'outgoing').forEach(t => {
      budgeted[t.category] = (budgeted[t.category] || 0) + t.amount;
    });
    const actual: Record<string, number> = {};
    monthExpenses.forEach(e => { actual[e.category] = (actual[e.category] || 0) + e.amount; });
    const allCats = [...new Set([...Object.keys(budgeted), ...Object.keys(actual)])];
    return allCats.map(cat => ({
      category: cat,
      budgeted: budgeted[cat] || 0,
      actual: actual[cat] || 0,
    }));
  }, [monthTxns, monthExpenses]);

  const expenseTrend = useMemo(() => {
    const byMonth: Record<string, number> = {};
    expenses.forEach(e => { byMonth[e.month] = (byMonth[e.month] || 0) + e.amount; });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([m, total]) => ({
      month: formatMonthLabel(m), total,
    }));
  }, [expenses]);

  const totalExpenses = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const totalBudgeted = useMemo(() => monthTxns.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const budgetUtilization = totalBudgeted > 0 ? (totalExpenses / totalBudgeted * 100) : 0;
  const overBudgetCount = budgetVsActual.filter(d => d.actual > d.budgeted && d.budgeted > 0).length;
  const showExpenseReports = expenseEnabled && monthExpenses.length > 0;

  const healthMetrics = [
    {
      label: 'Wealth Retention',
      abbr: 'WRR',
      value: wrr,
      icon: ShieldCheck,
      color: 'text-primary',
      tooltip: 'Wealth Retention Ratio = (In-Hand + Savings + Investments) ÷ Total Income × 100\nShows how much income contributes to long-term wealth.',
    },
    {
      label: 'Liquidity Retention',
      abbr: 'LRR',
      value: lrr,
      icon: Droplets,
      color: 'text-accent-foreground',
      tooltip: 'Liquidity Retention Ratio = In-Hand ÷ Total Income × 100\nShows remaining liquid cash.',
    },
    {
      label: 'Savings Allocation',
      abbr: 'SAR',
      value: sar,
      icon: PiggyBank,
      color: 'text-success',
      tooltip: 'Savings Allocation Ratio = Savings ÷ Total Income × 100\nShows percentage of income saved.',
    },
    {
      label: 'Investment Allocation',
      abbr: 'IAR',
      value: iar,
      icon: TrendingUp,
      color: 'text-warning',
      tooltip: 'Investment Allocation Ratio = Investments ÷ Total Income × 100\nShows percentage of income invested.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your finances</p>
        </div>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Income</p><p className="text-2xl font-display font-bold text-success">{formatCurrency(totalInc)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Spending</p><p className="text-2xl font-display font-bold text-destructive">{formatCurrency(totalSpending)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Savings</p><p className="text-2xl font-display font-bold text-primary">{formatCurrency(savingsAmount)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Investments</p><p className="text-2xl font-display font-bold text-warning">{formatCurrency(investmentAmount)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">In Hand</p><p className={`text-2xl font-display font-bold ${inHand >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(inHand)}</p></CardContent></Card>
      </div>

      {/* Financial Health Metrics */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            Financial Health Metrics
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">These ratios measure how effectively you retain and allocate your income. Based on Savings and Investments expense categories.</p>
              </TooltipContent>
            </UITooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {healthMetrics.map(metric => (
              <div key={metric.abbr} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.abbr}</span>
                  </div>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs whitespace-pre-line">
                      <p className="text-xs">{metric.tooltip}</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className={`text-2xl font-display font-bold ${metric.color}`}>
                  {formatRatio(metric.value, totalInc)}
                </p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['incoming', 'outgoing'] as const).map(type => (
          <Card key={type} className="shadow-card">
            <CardHeader><CardTitle className="font-display">{type === 'incoming' ? 'Income' : 'Budget'} Breakdown</CardTitle></CardHeader>
            <CardContent>
              {categoryBreakdown[type].length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={categoryBreakdown[type]} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {categoryBreakdown[type].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                    {categoryBreakdown[type].map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-foreground truncate">{d.name}</span></div>
                        <span className="text-muted-foreground ml-2">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (<p className="text-center text-muted-foreground py-12">No data for this month</p>)}
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyComparison.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display">Income vs Spending</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="spending" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Spending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {monthlyComparison.length > 1 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display">Savings Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyComparison}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="surplus" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} name="Net Surplus" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Reports Section - only shown when expense tracking is enabled and has data */}
      {showExpenseReports && (
        <>
          <div className="pt-2">
            <h2 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Expense Reports
            </h2>
            <p className="text-muted-foreground mt-1">Actual spending compared to your budget</p>
          </div>

          {/* Expense summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-2xl font-display font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Budget Utilization</p>
                <p className={`text-2xl font-display font-bold ${budgetUtilization > 100 ? 'text-destructive' : 'text-primary'}`}>
                  {budgetUtilization.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Over-budget Categories</p>
                <p className={`text-2xl font-display font-bold ${overBudgetCount > 0 ? 'text-destructive' : 'text-success'}`}>
                  {overBudgetCount > 0 && <AlertTriangle className="w-5 h-5 inline mr-1 mb-1" />}
                  {overBudgetCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expense by Category & Budget vs Actual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense by Category Pie */}
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Expense by Category</CardTitle></CardHeader>
              <CardContent>
                {expenseCategoryBreakdown.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expenseCategoryBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                            {expenseCategoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                      {expenseCategoryBreakdown.map((d, i) => (
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
                  <p className="text-center text-muted-foreground py-12">No expense data</p>
                )}
              </CardContent>
            </Card>

            {/* Budget vs Actual Bar Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {budgetVsActual.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetVsActual}>
                        <XAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="budgeted" fill="hsl(200, 60%, 50%)" radius={[4, 4, 0, 0]} name="Budgeted" />
                        <Bar dataKey="actual" fill="hsl(340, 60%, 50%)" radius={[4, 4, 0, 0]} name="Actual" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data to compare</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Trend */}
          {expenseTrend.length > 1 && (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Expense Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={expenseTrend}>
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="total" stroke="hsl(340, 60%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

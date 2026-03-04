import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, PiggyBank, BarChart3, ShieldCheck, Droplets, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
import { useBudget } from '@/lib/budget-context';
import {
  getMonthRange, getAvailableYears, computeYearlyMetrics,
  computeHealthScore, getScoreLabel, getScoreColor, generateInsights,
  type FYType, type YearlyMetrics, type ScoreBreakdown,
} from '@/lib/financial-year-utils';

export default function YearlyInsights() {
  const { transactions, formatCurrency } = useBudget();
  const [fyType, setFyType] = useState<FYType>('calendar');

  const allTxns = useMemo(() =>
    transactions.map(t => ({ ...t, type: t.type as 'incoming' | 'outgoing' })),
    [transactions]
  );

  const availableYears = useMemo(() => getAvailableYears(allTxns, fyType), [allTxns, fyType]);
  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || new Date().getFullYear());

  const months = useMemo(() => getMonthRange(selectedYear, fyType), [selectedYear, fyType]);
  const metrics = useMemo(() => computeYearlyMetrics(allTxns, months), [allTxns, months]);

  const prevMonths = useMemo(() => getMonthRange(selectedYear - 1, fyType), [selectedYear, fyType]);
  const prevMetrics = useMemo(() => computeYearlyMetrics(allTxns, prevMonths), [allTxns, prevMonths]);

  const score = useMemo(() => computeHealthScore(metrics), [metrics]);
  const insights = useMemo(() => generateInsights(metrics, prevMetrics.monthsWithData >= 3 ? prevMetrics : null), [metrics, prevMetrics]);

  const insufficientData = metrics.monthsWithData < 3;
  const noIncome = metrics.totalIncome === 0 && metrics.monthsWithData >= 3;
  const label = insufficientData ? 'Insufficient Data' : noIncome ? 'Score Unavailable' : getScoreLabel(score.total);
  const color = getScoreColor(label);

  const displayScore = insufficientData || noIncome ? null : score.total;

  // SVG gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = displayScore !== null ? circumference - (displayScore / 100) * circumference : circumference;

  const yearLabel = fyType === 'calendar' ? `${selectedYear}` : `${selectedYear}–${selectedYear + 1}`;

  const scoreComponents = [
    { key: 'wealthRetention', label: 'Wealth Retention', max: 30, value: score.wealthRetention, icon: ShieldCheck, tooltip: 'Based on (In-Hand + Savings + Investments) / Income' },
    { key: 'savingsDiscipline', label: 'Savings Discipline', max: 25, value: score.savingsDiscipline, icon: PiggyBank, tooltip: 'Based on Savings / Income ratio' },
    { key: 'investmentGrowth', label: 'Investment Growth', max: 20, value: score.investmentGrowth, icon: TrendingUp, tooltip: 'Based on Investment / Income ratio' },
    { key: 'expenseStability', label: 'Expense Stability', max: 15, value: score.expenseStability, icon: BarChart3, tooltip: 'Based on monthly expense volatility' },
    { key: 'liquidityBalance', label: 'Liquidity Balance', max: 10, value: score.liquidityBalance, icon: Droplets, tooltip: 'Based on In-Hand / Income in 15-40% range' },
  ];

  const summaryCards = [
    { label: 'Total Income', value: metrics.totalIncome },
    { label: 'Total Spending', value: metrics.totalSpending },
    { label: 'Total Savings', value: metrics.savingsAmount },
    { label: 'Total Investments', value: metrics.investmentAmount },
    { label: 'Net Surplus', value: metrics.netSurplus },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Yearly Insights</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={fyType} onValueChange={v => v && setFyType(v as FYType)}>
            <ToggleGroupItem value="calendar" className="text-xs px-3">Calendar Year</ToggleGroupItem>
            <ToggleGroupItem value="april-march" className="text-xs px-3">April – March</ToggleGroupItem>
          </ToggleGroup>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>
                  {fyType === 'calendar' ? y : `${y}–${String(y + 1).slice(2)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Score Gauge */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-card-gradient shadow-card">
          <CardContent className="flex flex-col items-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Financial Health Score — {yearLabel}</p>
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                <motion.circle
                  cx="100" cy="100" r={radius}
                  fill="none" stroke={color} strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-display font-bold text-foreground">
                  {displayScore !== null ? displayScore : '—'}
                </span>
                <span className="text-sm font-medium" style={{ color }}>{label}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-bold font-display ${c.value < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(c.value)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Score Breakdown */}
      {!insufficientData && !noIncome && (
        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold text-foreground">Score Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scoreComponents.map((comp, i) => (
              <motion.div key={comp.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Card className="shadow-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <comp.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{comp.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-display font-bold text-foreground">{Math.round(comp.value)}</span>
                      <span className="text-xs text-muted-foreground">/ {comp.max}</span>
                    </div>
                    <Progress value={(comp.value / comp.max) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">{comp.tooltip}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && !insufficientData && !noIncome && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Lightbulb className="w-4 h-4 text-primary" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((text, i) => (
                <p key={i} className="text-sm text-muted-foreground">• {text}</p>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Insufficient data message */}
      {insufficientData && (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Not enough data to calculate a score. At least 3 months of transactions are needed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

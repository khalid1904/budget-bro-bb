import type { Transaction } from '@/lib/types';

export type FYType = 'calendar' | 'april-march';

export interface YearlyMetrics {
  totalIncome: number;
  totalExpenses: number;
  savingsAmount: number;
  investmentAmount: number;
  inHand: number;
  netSurplus: number;
  monthlyExpenses: number[]; // per-month expense totals for volatility
  monthsWithData: number;
  wrr: number;
  lrr: number;
  sar: number;
  iar: number;
}

export interface ScoreBreakdown {
  wealthRetention: number;   // 0-30
  savingsDiscipline: number; // 0-25
  investmentGrowth: number;  // 0-20
  expenseStability: number;  // 0-15
  liquidityBalance: number;  // 0-10
  total: number;             // 0-100
}

export type ScoreLabel = 'Weak' | 'Moderate' | 'Strong' | 'Excellent' | 'Insufficient Data' | 'Score Unavailable';

const SAVINGS_CATEGORIES = ['Savings'];
const INVESTMENT_CATEGORIES = ['Investments'];

/** Returns array of YYYY-MM strings for a given year and FY type */
export function getMonthRange(year: number, type: FYType): string[] {
  const months: string[] = [];
  if (type === 'calendar') {
    for (let m = 1; m <= 12; m++) {
      months.push(`${year}-${String(m).padStart(2, '0')}`);
    }
  } else {
    // April of `year` through March of `year+1`
    for (let m = 4; m <= 12; m++) {
      months.push(`${year}-${String(m).padStart(2, '0')}`);
    }
    for (let m = 1; m <= 3; m++) {
      months.push(`${year + 1}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

/** Extracts distinct years from transaction data relevant to the FY type */
export function getAvailableYears(transactions: Transaction[], type: FYType): number[] {
  const yearSet = new Set<number>();
  for (const t of transactions) {
    const [y, m] = t.date.substring(0, 7).split('-').map(Number);
    if (type === 'calendar') {
      yearSet.add(y);
    } else {
      // For April-March: months 4-12 belong to that year's FY, months 1-3 belong to previous year's FY
      yearSet.add(m >= 4 ? y : y - 1);
    }
  }
  const years = Array.from(yearSet).sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());
  return years;
}

/** Aggregate metrics across selected months */
export function computeYearlyMetrics(transactions: Transaction[], months: string[]): YearlyMetrics {
  const monthSet = new Set(months);
  const filtered = transactions.filter(t => monthSet.has(t.date.substring(0, 7)));

  let totalIncome = 0;
  let totalExpenses = 0;
  let savingsAmount = 0;
  let investmentAmount = 0;

  // Track per-month expenses
  const expByMonth = new Map<string, number>();
  for (const m of months) expByMonth.set(m, 0);

  for (const t of filtered) {
    const month = t.date.substring(0, 7);
    if (t.type === 'incoming') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      expByMonth.set(month, (expByMonth.get(month) || 0) + t.amount);
      if (SAVINGS_CATEGORIES.includes(t.category)) savingsAmount += t.amount;
      if (INVESTMENT_CATEGORIES.includes(t.category)) investmentAmount += t.amount;
    }
  }

  const inHand = totalIncome - totalExpenses;
  const netSurplus = inHand;

  // Only count months that have any transaction data
  const monthsWithData = months.filter(m =>
    filtered.some(t => t.date.substring(0, 7) === m)
  ).length;

  const monthlyExpenses = months.map(m => expByMonth.get(m) || 0);

  const wrr = totalIncome > 0 ? ((inHand + savingsAmount + investmentAmount) / totalIncome) * 100 : 0;
  const lrr = totalIncome > 0 ? (inHand / totalIncome) * 100 : 0;
  const sar = totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0;
  const iar = totalIncome > 0 ? (investmentAmount / totalIncome) * 100 : 0;

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    savingsAmount: Math.round(savingsAmount * 100) / 100,
    investmentAmount: Math.round(investmentAmount * 100) / 100,
    inHand: Math.round(inHand * 100) / 100,
    netSurplus: Math.round(netSurplus * 100) / 100,
    monthlyExpenses,
    monthsWithData,
    wrr: Math.round(wrr * 100) / 100,
    lrr: Math.round(lrr * 100) / 100,
    sar: Math.round(sar * 100) / 100,
    iar: Math.round(iar * 100) / 100,
  };
}

/** Compute health score from metrics */
export function computeHealthScore(metrics: YearlyMetrics): ScoreBreakdown {
  // Wealth Retention (30 pts): linear scale, >=60% = 30
  const wealthRetention = Math.min(30, Math.max(0, (metrics.wrr / 60) * 30));

  // Savings Discipline (25 pts): linear scale, >=25% = 25
  const savingsDiscipline = Math.min(25, Math.max(0, (metrics.sar / 25) * 25));

  // Investment Growth (20 pts): linear scale, >=20% = 20
  const investmentGrowth = Math.min(20, Math.max(0, (metrics.iar / 20) * 20));

  // Expense Stability (15 pts): based on coefficient of variation
  let expenseStability = 15;
  const nonZeroExpenses = metrics.monthlyExpenses.filter(e => e > 0);
  if (nonZeroExpenses.length >= 2) {
    const mean = nonZeroExpenses.reduce((s, v) => s + v, 0) / nonZeroExpenses.length;
    if (mean > 0) {
      const variance = nonZeroExpenses.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZeroExpenses.length;
      const cv = Math.sqrt(variance) / mean;
      expenseStability = Math.max(0, Math.min(15, 15 * (1 - cv)));
    }
  }

  // Liquidity Balance (10 pts): LRR 15-40% sweet spot
  let liquidityBalance = 0;
  if (metrics.lrr >= 15 && metrics.lrr <= 40) {
    liquidityBalance = 10;
  } else if (metrics.lrr < 15) {
    liquidityBalance = Math.max(0, (metrics.lrr / 15) * 10);
  } else {
    // > 40%, slight penalty
    liquidityBalance = Math.max(0, 10 - ((metrics.lrr - 40) / 60) * 10);
  }

  const total = Math.round(
    Math.min(100, Math.max(0, wealthRetention + savingsDiscipline + investmentGrowth + expenseStability + liquidityBalance))
  );

  return {
    wealthRetention: Math.round(wealthRetention * 100) / 100,
    savingsDiscipline: Math.round(savingsDiscipline * 100) / 100,
    investmentGrowth: Math.round(investmentGrowth * 100) / 100,
    expenseStability: Math.round(expenseStability * 100) / 100,
    liquidityBalance: Math.round(liquidityBalance * 100) / 100,
    total,
  };
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score <= 40) return 'Weak';
  if (score <= 60) return 'Moderate';
  if (score <= 80) return 'Strong';
  return 'Excellent';
}

export function getScoreColor(label: ScoreLabel): string {
  switch (label) {
    case 'Weak': return 'hsl(0, 84%, 60%)';
    case 'Moderate': return 'hsl(45, 93%, 47%)';
    case 'Strong': return 'hsl(217, 91%, 60%)';
    case 'Excellent': return 'hsl(142, 71%, 45%)';
    default: return 'hsl(var(--muted-foreground))';
  }
}

/** Generate 2-3 rule-based insights comparing current vs previous year */
export function generateInsights(current: YearlyMetrics, prev: YearlyMetrics | null): string[] {
  const insights: string[] = [];

  if (prev && prev.totalIncome > 0) {
    // Savings comparison
    if (current.sar > prev.sar + 2) {
      insights.push('Your savings rate improved compared to the previous year.');
    } else if (current.sar < prev.sar - 2) {
      insights.push('Your savings rate declined compared to the previous year.');
    }

    // Investment comparison
    if (current.iar > prev.iar + 2) {
      insights.push('Investment allocation increased year-over-year — great progress!');
    }

    // Income growth
    if (current.totalIncome > prev.totalIncome * 1.1) {
      insights.push(`Your income grew by ${Math.round(((current.totalIncome - prev.totalIncome) / prev.totalIncome) * 100)}% compared to last year.`);
    }
  }

  // Current year insights
  if (current.sar < 15 && current.totalIncome > 0) {
    insights.push('Savings allocation is below the recommended 15% threshold.');
  }
  if (current.iar < 10 && current.totalIncome > 0) {
    insights.push('Investment allocation is below the recommended 10% threshold.');
  }

  // Expense volatility
  const nonZero = current.monthlyExpenses.filter(e => e > 0);
  if (nonZero.length >= 3) {
    const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
    if (mean > 0) {
      const variance = nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv > 0.5) {
        insights.push('Monthly expense volatility is high — consider stabilizing your spending.');
      }
    }
  }

  if (current.wrr >= 60 && current.totalIncome > 0) {
    insights.push('Excellent wealth retention — you\'re keeping over 60% of income as wealth.');
  }

  return insights.slice(0, 3);
}

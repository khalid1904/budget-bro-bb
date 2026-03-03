/** Year-month pair for safe month arithmetic */
export interface YearMonth {
  year: number;
  month: number; // 1-indexed (1=Jan, 12=Dec)
}

/** Parse "YYYY-MM-DD" or "YYYY-MM" into YearMonth */
export function parseYearMonth(dateStr: string): YearMonth {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
}

/** Format YearMonth as "YYYY-MM" */
export function formatYearMonth(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, '0')}`;
}

/** Compare two YearMonth values: -1 if a<b, 0 if equal, 1 if a>b */
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  return 0;
}

/** Return the next month after a YearMonth */
export function nextYearMonth(ym: YearMonth): YearMonth {
  if (ym.month >= 12) return { year: ym.year + 1, month: 1 };
  return { year: ym.year, month: ym.month + 1 };
}

/**
 * Build inclusive list of months from `start` to `end`.
 * Optionally skip months <= `after` (used for last_generated_date).
 * Returns empty array if start > end.
 * Safety cap: 120 months (10 years).
 */
export function buildMonthsInclusive(
  start: YearMonth,
  end: YearMonth,
  after?: YearMonth | null
): YearMonth[] {
  if (compareYearMonth(start, end) > 0) return [];

  let cur = after ? nextYearMonth(after) : { ...start };

  // If after is already past end, nothing to generate
  if (compareYearMonth(cur, end) > 0) return [];
  // If after pushed us before start, clamp to start
  if (compareYearMonth(cur, start) < 0) cur = { ...start };

  const result: YearMonth[] = [];
  while (compareYearMonth(cur, end) <= 0) {
    result.push({ ...cur });
    cur = nextYearMonth(cur);
    if (result.length > 120) break;
  }
  return result;
}

import { describe, it, expect } from 'vitest';
import {
  parseYearMonth,
  formatYearMonth,
  compareYearMonth,
  nextYearMonth,
  buildMonthsInclusive,
} from '@/lib/recurrence-utils';

describe('parseYearMonth', () => {
  it('parses YYYY-MM-DD', () => {
    expect(parseYearMonth('2026-02-01')).toEqual({ year: 2026, month: 2 });
  });
  it('parses YYYY-MM', () => {
    expect(parseYearMonth('2026-12')).toEqual({ year: 2026, month: 12 });
  });
});

describe('formatYearMonth', () => {
  it('pads single-digit month', () => {
    expect(formatYearMonth({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('compareYearMonth', () => {
  it('returns 0 for equal', () => {
    expect(compareYearMonth({ year: 2026, month: 2 }, { year: 2026, month: 2 })).toBe(0);
  });
  it('returns -1 for earlier', () => {
    expect(compareYearMonth({ year: 2026, month: 2 }, { year: 2026, month: 4 })).toBe(-1);
  });
  it('returns 1 for later', () => {
    expect(compareYearMonth({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBe(1);
  });
});

describe('nextYearMonth', () => {
  it('increments within year', () => {
    expect(nextYearMonth({ year: 2026, month: 3 })).toEqual({ year: 2026, month: 4 });
  });
  it('rolls over year boundary', () => {
    expect(nextYearMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });
});

describe('buildMonthsInclusive', () => {
  it('Feb 2026 → Feb 2026 = 1 month', () => {
    const result = buildMonthsInclusive({ year: 2026, month: 2 }, { year: 2026, month: 2 });
    expect(result).toEqual([{ year: 2026, month: 2 }]);
  });

  it('Feb 2026 → Mar 2026 = 2 months', () => {
    const result = buildMonthsInclusive({ year: 2026, month: 2 }, { year: 2026, month: 3 });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ year: 2026, month: 2 });
    expect(result[1]).toEqual({ year: 2026, month: 3 });
  });

  it('Feb 2026 → Apr 2026 = 3 months (inclusive end)', () => {
    const result = buildMonthsInclusive({ year: 2026, month: 2 }, { year: 2026, month: 4 });
    expect(result).toHaveLength(3);
    expect(result.map(formatYearMonth)).toEqual(['2026-02', '2026-03', '2026-04']);
  });

  it('Dec 2026 → Feb 2027 = 3 months (year boundary)', () => {
    const result = buildMonthsInclusive({ year: 2026, month: 12 }, { year: 2027, month: 2 });
    expect(result).toHaveLength(3);
    expect(result.map(formatYearMonth)).toEqual(['2026-12', '2027-01', '2027-02']);
  });

  it('invalid range (start > end) returns empty', () => {
    const result = buildMonthsInclusive({ year: 2027, month: 1 }, { year: 2026, month: 12 });
    expect(result).toEqual([]);
  });

  it('skips months <= after (last_generated_date)', () => {
    const result = buildMonthsInclusive(
      { year: 2026, month: 2 },
      { year: 2026, month: 4 },
      { year: 2026, month: 2 } // already generated Feb
    );
    expect(result).toHaveLength(2);
    expect(result.map(formatYearMonth)).toEqual(['2026-03', '2026-04']);
  });

  it('after past end returns empty', () => {
    const result = buildMonthsInclusive(
      { year: 2026, month: 2 },
      { year: 2026, month: 4 },
      { year: 2026, month: 4 }
    );
    expect(result).toEqual([]);
  });
});

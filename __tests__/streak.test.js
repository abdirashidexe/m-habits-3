import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { format, subDays } from 'date-fns';
import {
  calculateMonthlyConsistency,
  calculateStreak,
  calculateDailyStreak,
  longestDailyStreakFromPredicate,
  maxLongestStreakAcrossHabits,
  isDateInFutureYmd,
  isHabitDueOnDate,
} from '../utils/streak.js';
import { setDevDateOverride } from '../utils/now.js';

const REF_DATE = new Date(2025, 5, 15); // Sunday 2025-06-15

function daysAgo(n) {
  return format(subDays(REF_DATE, n), 'yyyy-MM-dd');
}

function makeHabit(overrides = {}) {
  return {
    id: 'h1',
    type: 'custom',
    frequency: 'daily',
    specificDays: [],
    createdAt: `${daysAgo(30)}T00:00:00.000Z`,
    ...overrides,
  };
}

function makeLog(habitId, date, completed) {
  return {
    habitId,
    date,
    completed,
    completedAt: completed ? `${date}T12:00:00.000Z` : null,
  };
}

beforeAll(() => {
  setDevDateOverride('2025-06-15');
});

afterAll(() => {
  setDevDateOverride(null);
});

// ─── isHabitDueOnDate ────────────────────────────────────────────────────────

describe('isHabitDueOnDate', () => {
  it('returns true for a daily habit on any day', () => {
    const habit = makeHabit({ frequency: 'daily' });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(true);
    expect(isHabitDueOnDate(habit, subDays(REF_DATE, 3))).toBe(true);
  });

  it('returns true for specific_days habit when day matches', () => {
    // REF_DATE is Sunday = 0
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [0] });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(true);
  });

  it('returns false for specific_days habit when day does not match', () => {
    // REF_DATE is Sunday = 0, habit is Monday = 1
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [1] });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(false);
  });

  it('returns false for specific_days habit with empty specificDays array', () => {
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [] });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(false);
  });

  it('returns false for null habit', () => {
    expect(isHabitDueOnDate(null, REF_DATE)).toBe(false);
  });

  it('returns true for a habit due on multiple days including today', () => {
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [0, 3, 5] });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(true);
  });

  it('returns false for a habit due on multiple days not including today', () => {
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [1, 3, 5] });
    expect(isHabitDueOnDate(habit, REF_DATE)).toBe(false);
  });
});

// ─── calculateStreak — daily habits ─────────────────────────────────────────

describe('calculateStreak — daily habits', () => {
  it('returns streak 0 for a new habit with no logs', () => {
    const r = calculateStreak('h1', [], makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(0);
  });

  it('returns streak 1 when only today is completed', () => {
    const logs = [makeLog('h1', daysAgo(0), true)];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('returns streak 7 when last 7 consecutive days completed', () => {
    const logs = Array.from({ length: 7 }, (_, i) => makeLog('h1', daysAgo(i), true));
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(7);
  });

  it('returns streak 1 and atRisk true when yesterday done but today not', () => {
    const logs = [makeLog('h1', daysAgo(1), true)];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(1);
    expect(r.atRisk).toBe(true);
  });

  it('returns streak 0 and atRisk false when both today and yesterday missed', () => {
    const r = calculateStreak('h1', [], makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(0);
    expect(r.atRisk).toBe(false);
  });

  it('returns streak 3 when days 0-2 done, day 3 missed, days 4-6 done', () => {
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('h1', daysAgo(1), true),
      makeLog('h1', daysAgo(2), true),
      makeLog('h1', daysAgo(4), true),
      makeLog('h1', daysAgo(5), true),
      makeLog('h1', daysAgo(6), true),
    ];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(3);
  });

  it('completedToday is true when today has a completed log', () => {
    const logs = [makeLog('h1', daysAgo(0), true)];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.completedToday).toBe(true);
  });

  it('completedToday is false when today has no log', () => {
    const logs = [makeLog('h1', daysAgo(1), true)];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.completedToday).toBe(false);
  });

  it('dueToday is true for a daily habit', () => {
    const r = calculateStreak('h1', [], makeHabit(), REF_DATE);
    expect(r.dueToday).toBe(true);
  });

  it('does not count a false log toward the streak', () => {
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('h1', daysAgo(1), false),
      makeLog('h1', daysAgo(2), true),
    ];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('does not count logs from a different habitId', () => {
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('other', daysAgo(1), true),
    ];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('handles a habit created today with no logs', () => {
    const habit = makeHabit({ createdAt: `${daysAgo(0)}T00:00:00.000Z` });
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.currentStreak).toBe(0);
    expect(r.dueToday).toBe(true);
    expect(r.atRisk).toBe(false);
  });
});

// ─── calculateStreak — specific_days ────────────────────────────────────────

describe('calculateStreak — specific_days Mon/Wed/Fri (1,3,5)', () => {
  const specificHabit = () =>
    makeHabit({ frequency: 'specific_days', specificDays: [1, 3, 5] });

  it('returns streak 2 when most recent two due days completed', () => {
    const logs = [makeLog('h1', daysAgo(6), true), makeLog('h1', daysAgo(4), true)];
    const r = calculateStreak('h1', logs, specificHabit(), REF_DATE);
    expect(r.currentStreak).toBe(2);
  });

  it('returns streak 0 when most recent due day was missed', () => {
    const logs = [makeLog('h1', daysAgo(6), true)];
    const r = calculateStreak('h1', logs, specificHabit(), REF_DATE);
    expect(r.currentStreak).toBe(0);
  });

  it('dueToday is false when today is not in specificDays', () => {
    const r = calculateStreak('h1', [], specificHabit(), REF_DATE);
    expect(r.dueToday).toBe(false);
  });

  it('dueToday is true when today matches a specificDay', () => {
    const habit = makeHabit({ frequency: 'specific_days', specificDays: [0] });
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.dueToday).toBe(true);
  });
});

// ─── calculateStreak — longest streak ───────────────────────────────────────

describe('calculateStreak — longest streak', () => {
  it('longestStreak is 7 after 7 consecutive days then a gap then 3 more', () => {
    const logs = [
      ...Array.from({ length: 3 }, (_, i) => makeLog('h1', daysAgo(i), true)),
      ...Array.from({ length: 7 }, (_, i) => makeLog('h1', daysAgo(i + 5), true)),
    ];
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.longestStreak).toBe(7);
    expect(r.currentStreak).toBe(3);
  });

  it('longestStreak equals currentStreak when streak never broken', () => {
    const logs = Array.from({ length: 7 }, (_, i) => makeLog('h1', daysAgo(i), true));
    const r = calculateStreak('h1', logs, makeHabit(), REF_DATE);
    expect(r.longestStreak).toBe(r.currentStreak);
  });

  it('longestStreak is 0 when no logs exist', () => {
    const r = calculateStreak('h1', [], makeHabit(), REF_DATE);
    expect(r.longestStreak).toBe(0);
  });
});

// ─── calculateMonthlyConsistency ─────────────────────────────────────────────

describe('calculateMonthlyConsistency — daily habits', () => {
  it('returns 100% when all due days completed', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = Array.from({ length: 15 }, (_, i) =>
      makeLog('h1', format(new Date(2025, 5, i + 1), 'yyyy-MM-dd'), true)
    );
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.percentage).toBe(100);
    expect(r.isPerfect).toBe(true);
    expect(r.completedDays).toBe(15);
    expect(r.dueDays).toBe(15);
  });

  it('returns correct percentage when some days missed', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = Array.from({ length: 15 }, (_, i) => {
      const d = i + 1;
      if ([4, 9, 13].includes(d)) return null;
      return makeLog('h1', format(new Date(2025, 5, d), 'yyyy-MM-dd'), true);
    }).filter(Boolean);
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.completedDays).toBe(12);
    expect(r.percentage).toBe(80);
    expect(r.isPerfect).toBe(false);
  });

  it('returns 0% when no logs exist', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.percentage).toBe(0);
    expect(r.completedDays).toBe(0);
    expect(r.dueDays).toBe(15);
  });

  it('does not count future days toward dueDays', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = [makeLog('h1', '2025-06-20', true)];
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.dueDays).toBe(15);
    expect(r.completedDays).toBe(0);
  });

  it('only counts from createdAt when habit created mid-month', () => {
    const habit = makeHabit({ createdAt: '2025-06-10T00:00:00.000Z' });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.dueDays).toBe(6); // June 10 through June 15
  });

  it('returns 0 dueDays for a habit created today with no logs', () => {
    const habit = makeHabit({ createdAt: `${daysAgo(0)}T00:00:00.000Z` });
    const logs = [];
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.dueDays).toBe(1); // just today
    expect(r.completedDays).toBe(0);
  });
});

describe('calculateMonthlyConsistency — specific_days habits', () => {
  it('returns 0 dueDays when no due days occurred yet this month', () => {
    // REF_DATE is Sunday June 15. Habit is Monday only. First Monday in June is June 2.
    // But habit created today so start = June 15, and June 15 is Sunday not Monday.
    const habit = makeHabit({
      createdAt: '2025-06-15T00:00:00.000Z',
      frequency: 'specific_days',
      specificDays: [1], // Monday
    });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.dueDays).toBe(0);
    expect(r.percentage).toBe(0);
    expect(r.isPerfect).toBe(false);
  });

  it('counts only due days for specific_days habit across the month', () => {
    // Mondays in June 1-15 2025: June 2, 9
    const habit = makeHabit({
      createdAt: '2025-05-01T00:00:00.000Z',
      frequency: 'specific_days',
      specificDays: [1],
    });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.dueDays).toBe(2);
  });

  it('returns 100% for specific_days habit when all due days completed', () => {
    const habit = makeHabit({
      createdAt: '2025-05-01T00:00:00.000Z',
      frequency: 'specific_days',
      specificDays: [1],
    });
    const logs = [
      makeLog('h1', '2025-06-02', true),
      makeLog('h1', '2025-06-09', true),
    ];
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.completedDays).toBe(2);
    expect(r.dueDays).toBe(2);
    expect(r.percentage).toBe(100);
    expect(r.isPerfect).toBe(true);
  });

  it('returns 50% for specific_days habit when half the due days completed', () => {
    const habit = makeHabit({
      createdAt: '2025-05-01T00:00:00.000Z',
      frequency: 'specific_days',
      specificDays: [1],
    });
    const logs = [makeLog('h1', '2025-06-02', true)];
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.percentage).toBe(50);
  });
});

// ─── calculateDailyStreak ────────────────────────────────────────────────────

describe('calculateDailyStreak', () => {
  it('returns streak 0 when neither today nor yesterday completed', () => {
    const r = calculateDailyStreak(() => false, REF_DATE);
    expect(r.currentStreak).toBe(0);
    expect(r.completedToday).toBe(false);
    expect(r.dueToday).toBe(true);
    expect(r.atRisk).toBe(true);
  });

  it('returns streak 1 when only today completed', () => {
    const todayStr = format(REF_DATE, 'yyyy-MM-dd');
    const r = calculateDailyStreak((ds) => ds === todayStr, REF_DATE);
    expect(r.currentStreak).toBe(1);
    expect(r.completedToday).toBe(true);
  });

  it('returns streak 7 when last 7 days all completed', () => {
    const completed = new Set(
      Array.from({ length: 7 }, (_, i) => format(subDays(REF_DATE, i), 'yyyy-MM-dd'))
    );
    const r = calculateDailyStreak((ds) => completed.has(ds), REF_DATE);
    expect(r.currentStreak).toBe(7);
  });

  it('returns streak 0 when yesterday missed but today completed', () => {
    const todayStr = format(REF_DATE, 'yyyy-MM-dd');
    const r = calculateDailyStreak((ds) => ds === todayStr, REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('atRisk is true when today not completed', () => {
    const r = calculateDailyStreak(() => false, REF_DATE);
    expect(r.atRisk).toBe(true);
  });

  it('atRisk is false when today is completed', () => {
    const todayStr = format(REF_DATE, 'yyyy-MM-dd');
    const r = calculateDailyStreak((ds) => ds === todayStr, REF_DATE);
    expect(r.atRisk).toBe(false);
  });

  it('longestStreak reflects historical best even after a break', () => {
    const streak1 = new Set(
      Array.from({ length: 10 }, (_, i) => format(subDays(REF_DATE, i + 20), 'yyyy-MM-dd'))
    );
    const streak2 = new Set(
      Array.from({ length: 3 }, (_, i) => format(subDays(REF_DATE, i), 'yyyy-MM-dd'))
    );
    const all = new Set([...streak1, ...streak2]);
    const r = calculateDailyStreak((ds) => all.has(ds), REF_DATE);
    expect(r.longestStreak).toBe(10);
    expect(r.currentStreak).toBe(3);
  });
});

// ─── longestDailyStreakFromPredicate ─────────────────────────────────────────

describe('longestDailyStreakFromPredicate', () => {
  it('returns 0 when nothing ever completed', () => {
    const { longestDailyStreakFromPredicate } = require('../utils/streak.js');
    const r = longestDailyStreakFromPredicate(() => false, REF_DATE);
    expect(r).toBe(0);
  });

  it('returns correct longest run', () => {
    const { longestDailyStreakFromPredicate } = require('../utils/streak.js');
    const run = new Set(
      Array.from({ length: 5 }, (_, i) => format(subDays(REF_DATE, i + 10), 'yyyy-MM-dd'))
    );
    const r = longestDailyStreakFromPredicate((ds) => run.has(ds), REF_DATE);
    expect(r).toBe(5);
  });
});

// ─── maxLongestStreakAcrossHabits ────────────────────────────────────────────

describe('maxLongestStreakAcrossHabits', () => {
  it('returns 0 when no habits', () => {
    expect(maxLongestStreakAcrossHabits([], [])).toBe(0);
  });

  it('returns the max longest streak across multiple habits', () => {
    const h1 = makeHabit({ id: 'h1' });
    const h2 = makeHabit({ id: 'h2' });
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => makeLog('h1', daysAgo(i), true)),
      ...Array.from({ length: 10 }, (_, i) => makeLog('h2', daysAgo(i), true)),
    ];
    const result = maxLongestStreakAcrossHabits([h1, h2], logs);
    expect(result).toBe(10);
  });

  it('returns 0 when habits exist but no logs', () => {
    const h1 = makeHabit({ id: 'h1' });
    expect(maxLongestStreakAcrossHabits([h1], [])).toBe(0);
  });
});

// ─── isDateInFutureYmd ───────────────────────────────────────────────────────

describe('isDateInFutureYmd', () => {
  it('returns true for a date string after the reference date', () => {
    expect(isDateInFutureYmd('2025-06-20', REF_DATE)).toBe(true);
  });

  it('returns false for a date string before the reference date', () => {
    expect(isDateInFutureYmd('2025-06-10', REF_DATE)).toBe(false);
  });

  it('returns false for the reference date itself', () => {
    expect(isDateInFutureYmd('2025-06-15', REF_DATE)).toBe(false);
  });

  it('returns true for a date in a future month', () => {
    expect(isDateInFutureYmd('2025-12-01', REF_DATE)).toBe(true);
  });

  it('returns false for a date in a past year', () => {
    expect(isDateInFutureYmd('2024-06-15', REF_DATE)).toBe(false);
  });
});
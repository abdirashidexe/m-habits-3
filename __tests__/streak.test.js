import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { format, subDays } from 'date-fns';
import { calculateMonthlyConsistency, calculateStreak } from '../utils/streak.js';
import { setDevDateOverride } from '../utils/now.js';

/** Fixed reference calendar date for every test (local 2025-06-15). */
const REF_DATE = new Date(2025, 5, 15);

/**
 * @param {number} n
 * @returns {string} YYYY-MM-DD for n days before 2025-06-15
 */
function daysAgo(n) {
  return format(subDays(REF_DATE, n), 'yyyy-MM-dd');
}

/**
 * @param {object} [overrides]
 * @returns {object}
 */
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

/**
 * @param {string} habitId
 * @param {string} date
 * @param {boolean} completed
 */
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

describe('calculateStreak — daily habits', () => {
  it('returns streak 0 for a new habit with no logs', () => {
    const habit = makeHabit();
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.currentStreak).toBe(0);
  });

  it('returns streak 1 when only today is completed', () => {
    const habit = makeHabit();
    const logs = [makeLog('h1', daysAgo(0), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('returns streak 7 when the last 7 consecutive days are all completed', () => {
    const habit = makeHabit();
    const logs = [];
    for (let i = 0; i < 7; i += 1) {
      logs.push(makeLog('h1', daysAgo(i), true));
    }
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(7);
  });

  it('returns streak 1 and atRisk true when today is not yet completed but yesterday was completed', () => {
    const habit = makeHabit();
    const logs = [makeLog('h1', daysAgo(1), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(1);
    expect(r.atRisk).toBe(true);
  });

  it('returns streak 0 and atRisk false when today is not completed and yesterday was also missed', () => {
    const habit = makeHabit();
    const logs = [];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(0);
    expect(r.atRisk).toBe(false);
  });

  it('returns streak 1 when yesterday was missed but today is completed — streak restarts', () => {
    const habit = makeHabit();
    const logs = [makeLog('h1', daysAgo(0), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('returns streak 3 when days 1-3 are done, day 4 is missed, days 5-7 are done — only counts current unbroken run', () => {
    const habit = makeHabit();
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('h1', daysAgo(1), true),
      makeLog('h1', daysAgo(2), true),
      makeLog('h1', daysAgo(4), true),
      makeLog('h1', daysAgo(5), true),
      makeLog('h1', daysAgo(6), true),
    ];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(3);
  });

  it('completedToday is true when today has a completed log', () => {
    const habit = makeHabit();
    const logs = [makeLog('h1', daysAgo(0), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.completedToday).toBe(true);
  });

  it('completedToday is false when today has no log at all', () => {
    const habit = makeHabit();
    const logs = [makeLog('h1', daysAgo(1), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.completedToday).toBe(false);
  });

  it('dueToday is true for a daily habit regardless of the day', () => {
    const habit = makeHabit();
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.dueToday).toBe(true);
  });
});

describe('calculateStreak — specific_days Mon / Wed / Fri (1, 3, 5)', () => {
  const specificHabit = () =>
    makeHabit({
      frequency: 'specific_days',
      specificDays: [1, 3, 5],
    });

  it('returns streak 2 for a Mon/Wed/Fri habit when both the most recent Monday and Wednesday are completed — Tuesday in between does not break the streak', () => {
    const habit = specificHabit();
    const logs = [makeLog('h1', daysAgo(6), true), makeLog('h1', daysAgo(4), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(2);
  });

  it('returns streak 0 when the most recent due day was missed even if non-due days have passed since', () => {
    const habit = specificHabit();
    const logs = [makeLog('h1', daysAgo(6), true)];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(0);
  });

  it('dueToday is false when today is a day not in the habit\'s specificDays', () => {
    const habit = specificHabit();
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.dueToday).toBe(false);
  });

  it('dueToday is true when today matches one of the habit\'s specificDays', () => {
    const habit = makeHabit({
      frequency: 'specific_days',
      specificDays: [0],
    });
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.dueToday).toBe(true);
  });
});

describe('calculateStreak — longest streak', () => {
  it('longestStreak is 7 after 7 consecutive completed days followed by a 2-day gap followed by 3 more completed days', () => {
    const habit = makeHabit();
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('h1', daysAgo(1), true),
      makeLog('h1', daysAgo(2), true),
      makeLog('h1', daysAgo(5), true),
      makeLog('h1', daysAgo(6), true),
      makeLog('h1', daysAgo(7), true),
      makeLog('h1', daysAgo(8), true),
      makeLog('h1', daysAgo(9), true),
      makeLog('h1', daysAgo(10), true),
      makeLog('h1', daysAgo(11), true),
    ];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.longestStreak).toBe(7);
    expect(r.currentStreak).toBe(3);
  });

  it('longestStreak equals currentStreak when the streak has never been broken', () => {
    const habit = makeHabit();
    const logs = [];
    for (let i = 0; i < 7; i += 1) {
      logs.push(makeLog('h1', daysAgo(i), true));
    }
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.longestStreak).toBe(r.currentStreak);
  });
});

describe('calculateStreak — edge cases', () => {
  it('handles a habit created today with no logs — streak 0, dueToday true, atRisk false because there has been no chance to miss it yet', () => {
    const habit = makeHabit({
      createdAt: `${daysAgo(0)}T00:00:00.000Z`,
    });
    const r = calculateStreak('h1', [], habit, REF_DATE);
    expect(r.currentStreak).toBe(0);
    expect(r.dueToday).toBe(true);
    expect(r.atRisk).toBe(false);
  });

  it('does not count a log where completed is false toward the streak', () => {
    const habit = makeHabit();
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('h1', daysAgo(1), false),
      makeLog('h1', daysAgo(2), true),
    ];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(1);
  });

  it('does not count logs belonging to a different habitId toward this habit\'s streak', () => {
    const habit = makeHabit();
    const logs = [
      makeLog('h1', daysAgo(0), true),
      makeLog('other', daysAgo(1), true),
      makeLog('other', daysAgo(2), true),
    ];
    const r = calculateStreak('h1', logs, habit, REF_DATE);
    expect(r.currentStreak).toBe(1);
  });
});

describe('calculateMonthlyConsistency', () => {
  it('returns 100% and isPerfect true when all due days completed this month', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = [];
    for (let d = 1; d <= 15; d += 1) {
      const ds = format(new Date(2025, 5, d), 'yyyy-MM-dd');
      logs.push(makeLog('h1', ds, true));
    }
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.completedDays).toBe(15);
    expect(r.dueDays).toBe(15);
    expect(r.percentage).toBe(100);
    expect(r.isPerfect).toBe(true);
  });

  it('returns correct percentage when some days missed', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = [];
    // 12/15 completed (miss 3 days by omitting logs)
    for (let d = 1; d <= 15; d += 1) {
      if ([4, 9, 13].includes(d)) continue;
      const ds = format(new Date(2025, 5, d), 'yyyy-MM-dd');
      logs.push(makeLog('h1', ds, true));
    }
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.completedDays).toBe(12);
    expect(r.dueDays).toBe(15);
    expect(r.percentage).toBe(80);
    expect(r.isPerfect).toBe(false);
  });

  it('returns 0% when no logs exist', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.completedDays).toBe(0);
    expect(r.dueDays).toBe(15);
    expect(r.percentage).toBe(0);
    expect(r.isPerfect).toBe(false);
  });

  it('returns 0 dueDays and 0% for a specific_days habit when no due days have occurred yet this month', () => {
    const habit = makeHabit({
      createdAt: '2025-06-15T00:00:00.000Z',
      frequency: 'specific_days',
      specificDays: [1], // Monday; 2025-06-15 is Sunday
    });
    const r = calculateMonthlyConsistency('h1', [], habit, REF_DATE);
    expect(r.completedDays).toBe(0);
    expect(r.dueDays).toBe(0);
    expect(r.percentage).toBe(0);
    expect(r.isPerfect).toBe(false);
  });

  it('does not count future days in the month toward dueDays', () => {
    const habit = makeHabit({ createdAt: '2025-05-01T00:00:00.000Z' });
    const logs = [makeLog('h1', '2025-06-20', true)];
    const r = calculateMonthlyConsistency('h1', logs, habit, REF_DATE);
    expect(r.completedDays).toBe(0);
    expect(r.dueDays).toBe(15);
    expect(r.percentage).toBe(0);
  });
});

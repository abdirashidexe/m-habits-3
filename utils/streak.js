import { startOfDay, subDays, isBefore, isAfter, parseISO, isValid } from 'date-fns';
import { getDayIndex, toLocalDateString, eachDayInclusive, parseYmd } from './dates';
import { now } from './now';

/**
 * @typedef {{ id: string, name: string, frequency: string, specificDays: number[], createdAt: string }} Habit
 * @typedef {{ habitId: string, date: string, completed: boolean }} HabitLog
 */

/**
 * @param {Habit} habit
 * @param {Date} date
 * @returns {boolean}
 */
export function isHabitDueOnDate(habit, date) {
  if (!habit) return false;
  if (habit.frequency === 'daily') return true;
  const idx = getDayIndex(date);
  return Array.isArray(habit.specificDays) && habit.specificDays.length > 0 && habit.specificDays.includes(idx);
}

/**
 * @param {string} habitId
 * @param {string} dateStr YYYY-MM-DD
 * @param {HabitLog[]} logs
 * @returns {boolean}
 */
function isCompletedOnDate(habitId, dateStr, logs) {
  const entry = logs.find((l) => l.habitId === habitId && l.date === dateStr);
  return Boolean(entry?.completed);
}

/**
 * @param {Habit} habit
 * @param {HabitLog[]} logs
 * @param {Date} [refDate]
 * @returns {{ currentStreak: number, longestStreak: number, completedToday: boolean, dueToday: boolean, atRisk: boolean }}
 */
export function calculateStreak(habitId, logs, habit, refDate = now()) {
  const today = startOfDay(refDate);
  const todayStr = toLocalDateString(today);

  const dueToday = isHabitDueOnDate(habit, today);
  const completedToday = dueToday && isCompletedOnDate(habitId, todayStr, logs);

  const yesterday = subDays(today, 1);
  const yesterdayStr = toLocalDateString(yesterday);
  const dueYesterday = isHabitDueOnDate(habit, yesterday);
  const completedYesterday = dueYesterday && isCompletedOnDate(habitId, yesterdayStr, logs);

  const longest = () => longestStreakEverForHabit(habitId, habit, logs, refDate);

  if (dueYesterday && !completedYesterday) {
    if (completedToday) {
      return {
        currentStreak: 1,
        longestStreak: longest(),
        completedToday: true,
        dueToday: true,
        atRisk: false,
      };
    }
    if (dueToday && !completedToday) {
      return {
        currentStreak: 0,
        longestStreak: longest(),
        completedToday: false,
        dueToday: true,
        atRisk: false,
      };
    }
    return {
      currentStreak: 0,
      longestStreak: longest(),
      completedToday: Boolean(completedToday),
      dueToday,
      atRisk: dueToday && !completedToday,
    };
  }

  let currentStreak = 0;
  let i = 0;
  const maxDays = 3650;
  // When today is not a scheduled day, the single most recent missed due (e.g. Fri before Sun) may
  // sit between "today" and an otherwise valid run (Mon+Wed done). Skip at most one such miss before
  // the first completed due; a second miss while still at streak 0 means the chain is broken (test 12).
  const allowOneLeadingMissedDue = !dueToday;
  let usedLeadingMissedDueSkip = false;

  while (i < maxDays) {
    const d = subDays(today, i);
    if (!isHabitDueOnDate(habit, d)) {
      i += 1;
      continue;
    }
    const ds = toLocalDateString(d);
    const done = isCompletedOnDate(habitId, ds, logs);
    if (i === 0) {
      if (!done) {
        i += 1;
        continue;
      }
      currentStreak += 1;
      i += 1;
      continue;
    }
    if (done) {
      currentStreak += 1;
      i += 1;
      continue;
    }
    if (allowOneLeadingMissedDue && currentStreak === 0 && !usedLeadingMissedDueSkip) {
      usedLeadingMissedDueSkip = true;
      i += 1;
      continue;
    }
    break;
  }

  return {
    currentStreak,
    longestStreak: longest(),
    completedToday: Boolean(completedToday),
    dueToday,
    atRisk: dueToday && !completedToday,
  };
}

/**
 * @param {string} habitId
 * @param {Habit} habit
 * @param {HabitLog[]} logs
 * @returns {number}
 */
export function longestStreakEverForHabit(habitId, habit, logs, refDate = now()) {
  const habitLogs = logs.filter((l) => l.habitId === habitId);
  if (habitLogs.length === 0) return 0;

  let minD = todayStrFromIso(habit.createdAt);
  for (const l of habitLogs) {
    const t = parseYmd(l.date);
    const c = parseYmd(minD);
    if (isBefore(t, c)) minD = l.date;
  }

  const maxD = toLocalDateString(refDate);
  const days = eachDayInclusive(parseYmd(minD), parseYmd(maxD));

  let run = 0;
  let best = 0;
  for (const day of days) {
    if (!isHabitDueOnDate(habit, day)) continue;
    const ds = toLocalDateString(day);
    if (isCompletedOnDate(habitId, ds, logs)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * @param {string} iso
 * @returns {string}
 */
function todayStrFromIso(iso) {
  const d = parseISO(iso);
  if (!isValid(d)) return toLocalDateString(now());
  return toLocalDateString(d);
}

/**
 * Daily activity: "completed" if predicate true for that calendar day.
 * @param {(dateStr: string) => boolean} isCompletedOnDateStr
 * @param {Date} [refDate]
 * @returns {{ currentStreak: number, longestStreak: number, completedToday: boolean, dueToday: boolean, atRisk: boolean }}
 */
export function calculateDailyStreak(isCompletedOnDateStr, refDate = now()) {
  const today = startOfDay(refDate);
  const todayStr = toLocalDateString(today);
  const dueToday = true;
  const completedToday = isCompletedOnDateStr(todayStr);

  const yesterdayStr = toLocalDateString(subDays(today, 1));
  const completedYesterday = isCompletedOnDateStr(yesterdayStr);

  if (!completedYesterday) {
    if (!completedToday) {
      return {
        currentStreak: 0,
        longestStreak: longestDailyStreakFromPredicate(isCompletedOnDateStr, refDate),
        completedToday: false,
        dueToday: true,
        atRisk: true,
      };
    }
  }

  let currentStreak = 0;
  let i = 0;
  const maxDays = 3650;
  while (i < maxDays) {
    const d = subDays(today, i);
    const ds = toLocalDateString(d);
    const done = isCompletedOnDateStr(ds);
    if (i === 0) {
      if (!done) {
        i += 1;
        continue;
      }
      currentStreak += 1;
      i += 1;
      continue;
    }
    if (done) {
      currentStreak += 1;
      i += 1;
      continue;
    }
    break;
  }

  return {
    currentStreak,
    longestStreak: longestDailyStreakFromPredicate(isCompletedOnDateStr, refDate),
    completedToday,
    dueToday: true,
    atRisk: !completedToday,
  };
}

/**
 * @param {(dateStr: string) => boolean} isCompletedOnDateStr
 * @param {Date} refDate
 * @returns {number}
 */
export function longestDailyStreakFromPredicate(isCompletedOnDateStr, refDate) {
  const end = startOfDay(refDate);
  const start = subDays(end, 365 * 5);
  const days = eachDayInclusive(start, end);
  let run = 0;
  let best = 0;
  for (const day of days) {
    const ds = toLocalDateString(day);
    if (isCompletedOnDateStr(ds)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * @param {Habit[]} habits
 * @param {HabitLog[]} logs
 * @returns {number} Max of longestStreak ever across custom habits
 */
export function maxLongestStreakAcrossHabits(habits, logs) {
  let m = 0;
  for (const h of habits) {
    const ls = longestStreakEverForHabit(h.id, h, logs);
    if (ls > m) m = ls;
  }
  return m;
}

/**
 * @param {string} ymd
 * @param {Date} ref
 * @returns {boolean}
 */
export function isDateInFutureYmd(ymd, ref = now()) {
  const d = parseYmd(ymd);
  return isAfter(startOfDay(d), startOfDay(ref));
}

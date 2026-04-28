import { subDays, startOfDay } from 'date-fns';

import { getDayOfYear, toLocalDateString } from './dates';
import { now } from './now';
import { isHabitDueOnDate } from './streak';

const PAIRS = [
  {
    arabic: 'إِنَّ أَحَبَّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
    translation:
      'The most beloved deeds to Allah are the most consistent, even if they are few. — Sahih al-Bukhari',
  },
  {
    arabic: 'وَٱصْبِرْ فَإِنَّ ٱللَّهَ لَا يُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ',
    translation:
      'Be patient, for Allah does not let the reward of the good-doers be lost. — Qur’an 11:115',
  },
  {
    arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    translation: 'So surely with hardship comes ease. — Qur’an 94:5',
  },
  {
    arabic: 'وَٱعْبُدْ رَبَّكَ حَتَّىٰ يَأْتِيَكَ ٱلْيَقِينُ',
    translation: 'Worship your Lord until certainty comes to you. — Qur’an 15:99',
  },
  {
    arabic: 'سَدِّدُوا وَقَارِبُوا وَأَبْشِرُوا',
    translation:
      'Be steadfast, do your best, and receive glad tidings. — Sahih al-Bukhari',
  },
  {
    arabic: 'وَمَا تُقَدِّمُوا لِأَنفُسِكُم مِّنْ خَيْرٍ تَجِدُوهُ عِندَ ٱللَّهِ',
    translation:
      'Whatever good you put forward for yourselves—you will find it with Allah. — Qur’an 2:110',
  },
];

const TEMPLATES = [
  '{habitName} — {count} of {due} days this week. That is istiqamah.',
  'SubhanAllah. You showed up for {habitName} {count} times this week.',
  '{percentage}% consistent with {habitName} this week. Keep going.',
  'Small steps add up. {habitName}: {count}/{due} this week.',
  'Your most consistent habit this week: {habitName} ({count} times).',
  'May Allah accept it. {habitName} — {percentage}% this week.',
  'You are building a rhythm. {habitName}: {count} of {due}.',
  'Consistency beats intensity. {habitName} — {count}/{due}.',
  'Quiet progress: {habitName} completed {count} times this week.',
  'Keep showing up. {habitName}: {percentage}% this week.',
  'Alhamdulillah. {habitName} — {count} completions in 7 days.',
  'One day at a time. {habitName}: {count}/{due} this week.',
];

/**
 * @param {import('../context/AppReducer').Habit[]} habits
 * @param {import('../context/AppReducer').HabitLog[]} habitLogs
 * @param {Date} [referenceDate]
 * @returns {{ arabic: string, translation: string, message: string | null }}
 */
export function generateDailyInsight(habits, habitLogs, referenceDate = now()) {
  const d0 = startOfDay(referenceDate);
  const dayIndex = Math.abs(getDayOfYear(d0));
  const pair = PAIRS[dayIndex % 6];

  const customHabits = Array.isArray(habits) ? habits.filter((h) => h?.type === 'custom') : [];
  const logsArr = Array.isArray(habitLogs) ? habitLogs : [];

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    days.push(startOfDay(subDays(d0, i)));
  }
  const daySet = new Set(days.map((d) => toLocalDateString(d)));
  const logsInWeek = logsArr.filter((l) => l && daySet.has(l.date));

  if (customHabits.length === 0 || logsInWeek.length === 0) {
    return { ...pair, message: null };
  }

  const completedIndex = new Set(
    logsInWeek.filter((l) => l.completed === true).map((l) => `${l.habitId}_${l.date}`)
  );

  let top = null;
  for (const h of customHabits) {
    let due = 0;
    let count = 0;
    for (const day of days) {
      if (!isHabitDueOnDate(h, day)) continue;
      due += 1;
      const ds = toLocalDateString(day);
      if (completedIndex.has(`${h.id}_${ds}`)) count += 1;
    }
    if (!top || count > top.count) top = { habit: h, count, due };
  }

  if (!top || !top.habit) return { ...pair, message: null };
  const percentage = top.due > 0 ? Math.round((top.count / top.due) * 100) : 0;
  const template = TEMPLATES[dayIndex % 12];
  const message = template
    .replaceAll('{habitName}', top.habit.name || 'Your habit')
    .replaceAll('{count}', String(top.count))
    .replaceAll('{due}', String(top.due))
    .replaceAll('{percentage}', String(percentage));

  return { ...pair, message };
}


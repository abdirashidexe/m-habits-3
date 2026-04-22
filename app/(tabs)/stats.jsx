import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useFocusEffect } from '@react-navigation/native';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { PlusBadge } from '../../components/PlusBadge';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { toLocalDateString } from '../../utils/dates';
import { now, nowIso } from '../../utils/now';
import { calculateMonthlyConsistency, isHabitDueOnDate } from '../../utils/streak';

const DEV_DAY_MIN = startOfDay(new Date(2024, 0, 1));
const DEV_DAY_MAX = startOfDay(new Date(2027, 0, 31));
const DEV_MONTH_MIN = startOfMonth(DEV_DAY_MIN);
const DEV_MONTH_MAX = startOfMonth(DEV_DAY_MAX);
/** Earliest month the stats month-at-a-glance can navigate to */
const MONTH_GLANCE_MIN = startOfMonth(new Date(2026, 1, 1));

/**
 * @param {Date} day
 * @param {Date} today
 * @param {import('../../context/AppReducer').AppState} state
 * @returns {'nodue' | 'future' | 'complete' | 'none' | 'partial'}
 */
function getMonthDayConsistency(day, today, state) {
  const d0 = startOfDay(day);
  const t0 = startOfDay(today);
  if (isAfter(d0, t0)) return 'future';
  const ds = toLocalDateString(d0);
  const logs = state.habitLogs.filter((l) => l.date === ds);
  if (logs.length === 0) return 'none';
  const anyTrue = logs.some((l) => l.completed === true);
  const anyFalse = logs.some((l) => l.completed === false);
  if (anyTrue && !anyFalse) return 'complete';
  if (!anyTrue && anyFalse) return 'none';
  if (!anyTrue && !anyFalse) return 'none';
  return 'partial';
}

/**
 * @param {Date} day
 * @param {import('../../context/AppReducer').AppState} state
 * @param {(key: string) => string} t
 * @returns {{ id: string, name: string, status: 'completed' | 'missed' | 'untouched' }[]}
 */
function getDayDetailRows(day, state, t) {
  const d0 = startOfDay(day);
  const ds = toLocalDateString(d0);
  const logsForDay = state.habitLogs.filter((l) => l.date === ds);
  const habitById = new Map(state.habits.map((h) => [h.id, h]));
  return logsForDay.map((log) => {
    const h = habitById.get(log.habitId);
    /** @type {'completed' | 'missed' | 'untouched'} */
    let status;
    if (log?.completed === true) status = 'completed';
    else if (log && log.completed === false) status = isSameDay(d0, now()) ? 'untouched' : 'missed';
    else status = 'untouched';
    return {
      id: log.habitId,
      name: h?.name || t('stats.deletedHabit'),
      status,
    };
  });
}

/**
 * @param {Date} monthDate
 * @param {Date} todayDate
 */
function clampMonthToBounds(monthDate, todayDate) {
  let m = startOfMonth(monthDate);
  const maxM = startOfMonth(todayDate);
  if (isAfter(m, maxM)) m = maxM;
  if (isBefore(m, MONTH_GLANCE_MIN)) m = MONTH_GLANCE_MIN;
  return m;
}

/**
 * @param {'complete' | 'missed' | 'clear'} action
 * @param {Date} d0
 */
function runDevDayAction(action, d0, state, dispatch) {
  if (isBefore(d0, DEV_DAY_MIN) || isAfter(d0, DEV_DAY_MAX)) return;
  const ds = toLocalDateString(d0);
  const customs = state.habits.filter((h) => h.type === 'custom');

  if (action === 'clear') {
    dispatch({
      type: ActionTypes.SET_HABIT_LOGS,
      payload: state.habitLogs.filter((l) => l.date !== ds),
    });
    return;
  }

  const habitLogs = [...state.habitLogs];
  const indexByKey = new Map(habitLogs.map((l, i) => [`${l.habitId}_${l.date}`, i]));

  if (action === 'complete') {
    const iso = nowIso();
    for (const h of customs) {
      if (!isHabitDueOnDate(h, d0)) continue;
      const key = `${h.id}_${ds}`;
      const i = indexByKey.get(key);
      if (i !== undefined) {
        habitLogs[i] = { ...habitLogs[i], completed: true, completedAt: iso };
      } else {
        habitLogs.push({ habitId: h.id, date: ds, completed: true, completedAt: iso });
        indexByKey.set(key, habitLogs.length - 1);
      }
    }
    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: habitLogs });
    return;
  }

  if (action === 'missed') {
    for (const h of customs) {
      if (!isHabitDueOnDate(h, d0)) continue;
      const key = `${h.id}_${ds}`;
      const i = indexByKey.get(key);
      if (i !== undefined) {
        habitLogs[i] = { ...habitLogs[i], completed: false, completedAt: null };
      } else {
        habitLogs.push({ habitId: h.id, date: ds, completed: false, completedAt: null });
      }
    }
    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: habitLogs });
  }
}

/**
 * @param {Date} day
 * @param {import('../../context/AppReducer').AppState} state
 * @returns {'nodue' | 'neutral' | 'complete' | 'missed' | 'mixed'}
 */
function getDayTapPhase(day, state) {
  const d0 = startOfDay(day);
  const ds = toLocalDateString(d0);
  const customs = state.habits.filter((h) => h.type === 'custom' && isHabitDueOnDate(h, d0));
  if (customs.length === 0) return 'nodue';

  let anyLog = false;
  let allTrue = true;
  let allFalse = true;
  for (const h of customs) {
    const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === ds);
    if (!log) {
      allTrue = false;
      allFalse = false;
      continue;
    }
    anyLog = true;
    if (log.completed) allFalse = false;
    else allTrue = false;
  }

  if (!anyLog) return 'neutral';
  if (allTrue) return 'complete';
  if (allFalse) return 'missed';
  return 'mixed';
}

/**
 * @returns {{ id: string, mode: 'injected' | 'missedExplicit' | 'pending' | 'future' | 'missed' }[]}
 */
function devCalendarDotsForDay(day, customHabits, habitLogs, today) {
  const dateStr = toLocalDateString(day);
  const isTodayCol = isSameDay(day, today);
  const d0 = startOfDay(day);
  const today0 = startOfDay(today);
  const isPast = isBefore(d0, today0);
  const isFuture = isAfter(d0, today0);
  const dots = [];
  for (const h of customHabits) {
    if (!isHabitDueOnDate(h, day)) continue;
    const log = habitLogs.find((l) => l.habitId === h.id && l.date === dateStr);
    if (log?.completed === true) {
      dots.push({ id: h.id, mode: 'injected' });
      continue;
    }
    if (log && log.completed === false) {
      dots.push({ id: h.id, mode: 'missedExplicit' });
      continue;
    }
    let fill = 'missed';
    if (isTodayCol) fill = 'pending';
    else if (isFuture) fill = 'future';
    else if (isPast) fill = 'missed';
    dots.push({ id: h.id, mode: fill });
  }
  return dots;
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useApp();
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = makeStyles({ colors, radii, spacing });
  const plus = state.userProfile.isPlus;
  const [today, setToday] = useState(() => now());
  const [monthGlanceMonth, setMonthGlanceMonth] = useState(() =>
    clampMonthToBounds(startOfMonth(now()), now())
  );
  const [detailDay, setDetailDay] = useState(/** @type {Date | null} */ (null));
  const [devCalendarMonth, setDevCalendarMonth] = useState(() => startOfMonth(now()));
  useFocusEffect(
    useCallback(() => {
      setToday(now());
    }, [])
  );

  useEffect(() => {
    setMonthGlanceMonth((prev) => clampMonthToBounds(prev, today));
  }, [today]);

  const dateLocale = useMemo(
    () => getDateFnsLocale(state.userProfile.language || 'en'),
    [state.userProfile.language]
  );

  const customHabits = useMemo(
    () => state.habits.filter((h) => h.type === 'custom'),
    [state.habits]
  );

  const dayLetters = useMemo(
    () => [
      t('stats.dayLetterSun'),
      t('stats.dayLetterMon'),
      t('stats.dayLetterTue'),
      t('stats.dayLetterWed'),
      t('stats.dayLetterThu'),
      t('stats.dayLetterFri'),
      t('stats.dayLetterSat'),
    ],
    [t]
  );

  const bestStreaks = useMemo(() => {
    const rows = customHabits.map((h) => ({
      name: h.name,
      percentage: calculateMonthlyConsistency(h.id, state.habitLogs, h, today).percentage,
    }));
    rows.sort((a, b) => b.percentage - a.percentage);
    return rows.slice(0, 3);
  }, [customHabits, state.habitLogs, today]);

  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = useMemo(() => [...Array(7)].map((_, i) => addDays(weekStart, i)), [weekStart]);

  const gridDots = useMemo(() => {
    return weekDays.map((day) => {
      const dateStr = toLocalDateString(day);
      const isTodayCol = isSameDay(day, today);
      const d0 = startOfDay(day);
      const t0 = startOfDay(today);
      const isPast = isBefore(d0, t0);
      const isFuture = isAfter(d0, t0);
      const dots = [];

      // Past days: derive dots from stored logs so history doesn't change when habits are edited/deleted.
      if (isPast) {
        const logs = state.habitLogs.filter((l) => l.date === dateStr);
        for (const log of logs) {
          dots.push({ fill: log.completed ? 'done' : 'missed', id: log.habitId });
        }
        return { day, dateStr, isTodayCol, dots };
      }

      // Today + future: keep showing "due" state based on current habits.
      for (const h of customHabits) {
        if (!isHabitDueOnDate(h, day)) continue;
        const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === dateStr);
        const done = Boolean(log?.completed);
        let fill = 'missed';
        if (done) fill = 'done';
        else if (isTodayCol) fill = 'pending';
        else if (isFuture) fill = 'future';
        dots.push({ fill, id: h.id });
      }
      return { day, dateStr, isTodayCol, dots };
    });
  }, [weekDays, customHabits, state.habitLogs, today]);

  const monthGlanceRows = useMemo(() => {
    const monthStart = startOfMonth(monthGlanceMonth);
    const last = endOfMonth(monthStart);
    const pad = getDay(monthStart);
    const totalDays = last.getDate();
    const cells = /** @type {(Date | null)[]} */ ([]);
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(startOfDay(addDays(monthStart, d - 1)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [monthGlanceMonth]);

  const monthGlanceSummary = useMemo(() => {
    const monthStart = startOfMonth(monthGlanceMonth);
    const endD = endOfMonth(monthStart);
    let full = 0;
    let total = 0;
    for (let d = new Date(monthStart); !isAfter(d, endD); d = addDays(d, 1)) {
      const d0 = startOfDay(d);
      if (isAfter(d0, startOfDay(today))) break;
      const ph = getMonthDayConsistency(d0, today, state);
      if (ph === 'nodue') continue;
      total += 1;
      if (ph === 'complete') full += 1;
    }
    return { full, total };
  }, [monthGlanceMonth, today, state]);

  const canPrevMonthGlance = isAfter(startOfMonth(monthGlanceMonth), MONTH_GLANCE_MIN);
  const canNextMonthGlance = isBefore(startOfMonth(monthGlanceMonth), startOfMonth(today));

  const onMonthGlanceDayPress = useCallback(
    (day) => {
      if (!day) return;
      const d0 = startOfDay(day);
      if (isAfter(d0, startOfDay(today))) return;
      if (!plus) {
        router.push('/modals/paywall');
        return;
      }
      setDetailDay(day);
    },
    [plus, router, today]
  );

  const dayDetailRows = useMemo(() => {
    if (!detailDay) return [];
    return getDayDetailRows(detailDay, state, t);
  }, [detailDay, state, t]);

  const devCalendarRows = useMemo(() => {
    const monthStart = startOfMonth(devCalendarMonth);
    const last = endOfMonth(monthStart);
    const pad = getDay(monthStart);
    const totalDays = last.getDate();
    const cells = /** @type {(Date | null)[]} */ ([]);
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(startOfDay(addDays(monthStart, d - 1)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [devCalendarMonth]);

  const canPrevDevMonth = isAfter(startOfMonth(devCalendarMonth), DEV_MONTH_MIN);
  const canNextDevMonth = isBefore(startOfMonth(devCalendarMonth), DEV_MONTH_MAX);

  const onDevCalendarDayPress = useCallback(
    (day) => {
      if (!__DEV__ || !state.devUiModeActive) return;
      const d0 = startOfDay(day);
      if (isBefore(d0, DEV_DAY_MIN) || isAfter(d0, DEV_DAY_MAX)) return;
      const phase = getDayTapPhase(day, state);
      if (phase === 'nodue') return;
      if (phase === 'complete') runDevDayAction('missed', d0, state, dispatch);
      else if (phase === 'missed') runDevDayAction('clear', d0, state, dispatch);
      else runDevDayAction('complete', d0, state, dispatch);
    },
    [dispatch, state]
  );

  const medalIcons = /** @type {{ name: any, color: string }[]} */ ([
    { name: 'trophy', color: colors.plusGold },
    { name: 'medal', color: colors.textSecondary },
    { name: 'award', color: colors.textMuted },
  ]);

  return (
    <>
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleBlock}>
        <Text style={[typography.displayMedium, styles.screenTitle]}>{t('stats.title')}</Text>
        <Text style={[typography.subtext2, typography.caption, styles.subUnderTitle]}>
          {t('stats.subtitle')}
        </Text>
      </View>

      <Text style={[typography.heading, styles.section]}>{t('stats.yourStreaks')}</Text>
      <View style={[styles.card, shadows.card]}>
        {bestStreaks.length > 0 ? bestStreaks.map((row, i) => (
          <View
            key={row.name + i}
            style={[styles.rankRow, i === bestStreaks.length - 1 && styles.rankRowLast]}
          >
            <View style={styles.medal}>
              <FontAwesome6
                name={(medalIcons[i]?.name || 'award')}
                size={18}
                color={medalIcons[i]?.color || colors.textMuted}
              />
              <Text style={[typography.caption, styles.rankBadge]}>#{i + 1}</Text>
            </View>
            <View style={styles.rankMain}>
              <Text style={[typography.body, styles.rankName]}>{row.name}</Text>
              <Text style={[typography.caption, styles.rankVal]}>
                {t('stats.thisMonthPct', { count: row.percentage })}
              </Text>
            </View>
          </View>
        )) : <Text style={[typography.body, styles.emptyStreaks]}>{t('stats.noStreaks')}</Text>}
      </View>

      <View style={styles.sectionSpacer} />
      <Text style={[typography.heading, styles.section]}>{t('stats.monthGlance')}</Text>
      <View style={[styles.card, shadows.card]}>
        <View style={styles.calNav}>
          <Pressable
            disabled={!canPrevMonthGlance}
            onPress={() => setMonthGlanceMonth((m) => clampMonthToBounds(addMonths(m, -1), today))}
            style={({ pressed }) => [
              styles.calNavBtn,
              !canPrevMonthGlance && styles.calNavDisabled,
              pressed && canPrevMonthGlance && styles.calNavBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('devTools.prevMonthA11y')}
          >
            <Text style={[typography.heading, styles.calNavChev]}>‹</Text>
          </Pressable>
          <Text style={[typography.subheading, styles.calNavTitle]}>
            {format(monthGlanceMonth, 'MMMM yyyy', { locale: dateLocale })}
          </Text>
          <Pressable
            disabled={!canNextMonthGlance}
            onPress={() => setMonthGlanceMonth((m) => clampMonthToBounds(addMonths(m, 1), today))}
            style={({ pressed }) => [
              styles.calNavBtn,
              !canNextMonthGlance && styles.calNavDisabled,
              pressed && canNextMonthGlance && styles.calNavBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('devTools.nextMonthA11y')}
          >
            <Text style={[typography.heading, styles.calNavChev]}>›</Text>
          </Pressable>
        </View>
        {monthGlanceSummary.total > 0 ? (
          <Text style={[typography.caption, styles.mgSummary]}>
            {t('stats.monthSummary', {
              full: monthGlanceSummary.full,
              total: monthGlanceSummary.total,
            })}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.mgSummary]}>{t('stats.monthSummaryEmpty')}</Text>
        )}
        <View style={styles.calWeekHdr}>
          {dayLetters.map((letter, i) => (
            <Text key={`mg-dow-${i}`} style={[typography.label, styles.calWeekLbl]}>
              {letter}
            </Text>
          ))}
        </View>
        {monthGlanceRows.map((row, ri) => (
          <View key={`mg-${ri}`} style={styles.calRow}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={ci} style={styles.calCellEmpty} />;
              const phase = getMonthDayConsistency(cell, today, state);
              const isTodayCell = isSameDay(cell, today);
              const onPrimary = phase === 'complete';
              return (
                <Pressable
                  key={ci}
                  onPress={() => onMonthGlanceDayPress(cell)}
                  disabled={phase === 'future'}
                  style={({ pressed }) => [
                    styles.mgCell,
                    phase === 'complete' && styles.mgCellComplete,
                    phase === 'partial' && styles.mgCellPartial,
                    (phase === 'none' || phase === 'future') && styles.mgCellNeutral,
                    phase === 'future' && styles.mgCellFuture,
                    isTodayCell && styles.mgCellToday,
                    pressed && phase !== 'future' && styles.mgCellPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: phase === 'future' }}
                  accessibilityLabel={format(cell, 'yyyy-MM-dd')}
                >
                  <Text
                    style={[
                      typography.label,
                      styles.mgDayNum,
                      onPrimary && styles.mgDayNumOnPrimary,
                    ]}
                  >
                    {format(cell, 'd')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.sectionSpacer} />
      <Text style={[typography.heading, styles.section]}>{t('stats.weekGlance')}</Text>
      <View style={[styles.card, shadows.card]}>
        <View style={styles.gridRow}>
          {gridDots.map((col, idx) => (
            <View key={col.dateStr} style={styles.col}>
              <Text style={[typography.label, styles.colLbl]}>{dayLetters[idx]}</Text>
              <View style={styles.dotCol}>
                {col.dots.map((d) => (
                  <View
                    key={d.id}
                    style={[
                      styles.dot,
                      d.fill === 'done' && styles.dotFill,
                      d.fill === 'pending' && styles.dotHalf,
                      d.fill === 'future' && styles.dotFuture,
                    ]}
                  />
                ))}
                {col.dots.length === 0 ? (
                  <Text style={[typography.caption, styles.noDots]}>—</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        {!plus ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.unlockPlus')}
            onPress={() => router.push('/modals/paywall')}
            style={({ pressed }) => [
              styles.plusCard,
              shadows.card,
              pressed && styles.plusCardPressed,
            ]}
          >
            <PlusBadge />
            <Text style={[typography.subheading, styles.premTitle]}>{t('stats.plusTitle')}</Text>
            {[1, 2, 3, 4].map((i) => (
              <Text key={i} style={[typography.bodySmall, styles.benefit]}>
                • {t(`profile.benefit${i}`)}
              </Text>
            ))}
            <View style={styles.premCta}>
              <Text style={[typography.body, styles.premCtaTxt]}>{t('profile.unlockPlus')}</Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      {__DEV__ && state.devUiModeActive ? (
        <>
          <View style={styles.sectionSpacer} />
          <Text style={[typography.heading, styles.section]}>{t('devTools.calendarTitle')}</Text>
          <Text style={[typography.caption, styles.devCalHint]}>{t('devTools.calendarHint')}</Text>
          <View style={[styles.card, shadows.card]}>
            <View style={styles.calNav}>
              <Pressable
                disabled={!canPrevDevMonth}
                onPress={() => setDevCalendarMonth((m) => addMonths(m, -1))}
                style={({ pressed }) => [
                  styles.calNavBtn,
                  !canPrevDevMonth && styles.calNavDisabled,
                  pressed && canPrevDevMonth && styles.calNavBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('devTools.prevMonthA11y')}
              >
                <Text style={[typography.heading, styles.calNavChev]}>‹</Text>
              </Pressable>
              <Text style={[typography.subheading, styles.calNavTitle]}>
                {format(devCalendarMonth, 'MMMM yyyy')}
              </Text>
              <Pressable
                disabled={!canNextDevMonth}
                onPress={() => setDevCalendarMonth((m) => addMonths(m, 1))}
                style={({ pressed }) => [
                  styles.calNavBtn,
                  !canNextDevMonth && styles.calNavDisabled,
                  pressed && canNextDevMonth && styles.calNavBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('devTools.nextMonthA11y')}
              >
                <Text style={[typography.heading, styles.calNavChev]}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calWeekHdr}>
              {dayLetters.map((letter, i) => (
                <Text key={`cal-dow-${i}`} style={[typography.label, styles.calWeekLbl]}>
                  {letter}
                </Text>
              ))}
            </View>
            {devCalendarRows.map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((cell, ci) => {
                  if (!cell) return <View key={ci} style={styles.calCellEmpty} />;
                  const cellDots = devCalendarDotsForDay(cell, customHabits, state.habitLogs, today);
                  return (
                    <Pressable
                      key={ci}
                      onPress={() => onDevCalendarDayPress(cell)}
                      style={({ pressed }) => [
                        styles.calCell,
                        isSameDay(cell, today) && styles.calCellToday,
                        pressed && styles.calCellPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={format(cell, 'yyyy-MM-dd')}
                    >
                      <Text style={[typography.label, styles.calDayNum]}>{format(cell, 'd')}</Text>
                      <View style={styles.calDotCol}>
                        {cellDots.map((d) => (
                          <View
                            key={d.id}
                            style={[
                              styles.calDot,
                              d.mode === 'injected' && styles.calDotGreen,
                              d.mode === 'missedExplicit' && styles.calDotYellow,
                              d.mode === 'pending' && styles.dotHalf,
                              d.mode === 'future' && styles.dotFuture,
                            ]}
                          />
                        ))}
                        {cellDots.length === 0 ? (
                          <Text style={[typography.caption, styles.calNoDots]}>—</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>

    <Modal
      visible={detailDay != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setDetailDay(null)}
    >
      <View style={[styles.dayModalRoot, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setDetailDay(null)}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={[styles.dayModalCard, shadows.card]} pointerEvents="box-none">
          <Text style={[typography.heading, styles.dayModalTitle]}>
            {detailDay ? format(detailDay, 'PPP', { locale: dateLocale }) : ''}
          </Text>
          <ScrollView
            style={styles.dayModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {dayDetailRows.map((row) => (
              <View key={row.id} style={styles.dayModalRow}>
                <Text style={[typography.body, styles.dayModalHabitName]}>{row.name}</Text>
                <Text style={[typography.caption, styles.dayModalStatus]}>
                  {row.status === 'completed'
                    ? t('stats.dayStatusCompleted')
                    : row.status === 'missed'
                      ? t('stats.dayStatusMissed')
                      : t('stats.dayStatusUntouched')}
                </Text>
              </View>
            ))}
          </ScrollView>
          <Button
            title={t('stats.dayDetailDone')}
            onPress={() => setDetailDay(null)}
            style={styles.dayModalBtn}
          />
        </View>
      </View>
    </Modal>
    </>
  );
}

function makeStyles({ colors, radii, spacing }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    titleBlock: {
      width: '100%',
      alignItems: 'center',
    },
    screenTitle: {
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 0,
    },
    subUnderTitle: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    emptyStreaks: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    section: {
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    sectionSpacer: {
      marginTop: spacing.md,
      paddingTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
      marginBottom: spacing.sm,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rankRowLast: {
      borderBottomWidth: 0,
    },
    medal: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankBadge: {
      marginTop: 2,
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 10,
      lineHeight: 12,
    },
    rankMain: {
      flex: 1,
    },
    rankName: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    rankVal: {
      color: colors.textSecondary,
      marginTop: 2,
    },
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    col: {
      flex: 1,
      alignItems: 'center',
    },
    colLbl: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    dotCol: {
      alignItems: 'center',
      gap: 4,
      minHeight: 80,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.background,
    },
    dotFill: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dotHalf: {
      backgroundColor: colors.accent,
      opacity: 0.45,
      borderColor: colors.accent,
    },
    dotFuture: {
      opacity: 0.35,
    },
    noDots: {
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    plusCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.plusGold,
      marginTop: spacing.md,
    },
    plusCardPressed: {
      opacity: 0.92,
    },
    premTitle: {
      color: colors.textPrimary,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    benefit: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 20,
    },
    premCta: {
      alignSelf: 'center',
      width: 240,
      maxWidth: '88%',
      marginTop: spacing.md,
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premCtaTxt: {
      color: colors.background,
      fontWeight: '600',
      textAlign: 'center',
    },
    devCalHint: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
      lineHeight: 18,
    },
    calNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    calNavBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calNavDisabled: {
      opacity: 0.35,
    },
    calNavBtnPressed: {
      opacity: 0.75,
    },
    calNavChev: {
      color: colors.textPrimary,
      lineHeight: 32,
    },
    calNavTitle: {
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    calWeekHdr: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    calWeekLbl: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
    },
    calRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    calCell: {
      flex: 1,
      minHeight: 52,
      marginHorizontal: 2,
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    calCellToday: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    calCellPressed: {
      opacity: 0.88,
    },
    calCellEmpty: {
      flex: 1,
      marginHorizontal: 2,
      minHeight: 52,
    },
    calDayNum: {
      color: colors.textPrimary,
      marginBottom: 2,
    },
    calDotCol: {
      alignItems: 'center',
      gap: 2,
      minHeight: 28,
      justifyContent: 'center',
    },
    calDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.background,
    },
    calNoDots: {
      color: colors.textMuted,
      fontSize: 10,
    },
    calDotGreen: {
      backgroundColor: '#22c55e',
      borderColor: '#16a34a',
    },
    calDotYellow: {
      backgroundColor: '#eab308',
      borderColor: '#ca8a04',
    },
    mgSummary: {
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      lineHeight: 18,
    },
    mgCell: {
      flex: 1,
      minHeight: 40,
      marginHorizontal: 2,
      paddingVertical: 6,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mgCellComplete: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    mgCellPartial: {
      backgroundColor: colors.accent + '55',
      borderColor: colors.accent,
    },
    mgCellNeutral: {
      backgroundColor: colors.background,
      borderColor: colors.divider,
    },
    mgCellFuture: {
      opacity: 0.5,
    },
    mgCellToday: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    mgCellPressed: {
      opacity: 0.88,
    },
    mgDayNum: {
      color: colors.textPrimary,
    },
    mgDayNumOnPrimary: {
      color: colors.background,
    },
    dayModalRoot: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    dayModalCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.divider,
      padding: spacing.lg,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
      maxHeight: 440,
      zIndex: 1,
    },
    dayModalTitle: {
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    dayModalScroll: {
      maxHeight: 280,
    },
    dayModalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    dayModalHabitName: {
      flex: 1,
      color: colors.textPrimary,
      marginRight: spacing.sm,
    },
    dayModalStatus: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    dayModalBtn: {
      marginTop: spacing.md,
      alignSelf: 'stretch',
    },
  });
}

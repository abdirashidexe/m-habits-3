import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { subDays, startOfDay } from 'date-fns';

import { Button } from './Button';
import { Input } from './Input';
import { ActionTypes, useApp } from '../context/AppContext';
import { useFajrTheme } from '../hooks/useFajrTheme';
import { eachDayInclusive, toLocalDateString } from '../utils/dates';
import { now, nowIso } from '../utils/now';
import { isHabitDueOnDate } from '../utils/streak';

function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/**
 * Shared dev-only cards: date override + streak testing.
 * Used from the dev-tools modal and from Profile when expanded.
 */
export function DevToolsSection() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = makeStyles({ colors, radii, spacing });

  const [devDate, setDevDate] = useState(state.devDateOverride || '');

  useEffect(() => {
    setDevDate(state.devDateOverride || '');
  }, [state.devDateOverride]);

  if (!__DEV__) return null;

  const effectiveToday = startOfDay(now());

  const applyDevDate = () => {
    const v = devDate.trim();
    if (!v) {
      dispatch({ type: ActionTypes.SET_DEV_DATE_OVERRIDE, payload: null });
      return;
    }
    if (!isValidYmd(v)) {
      Alert.alert(t('devTools.invalidDate'), t('devTools.invalidDateMsg'), [{ text: t('common.ok') }]);
      return;
    }
    dispatch({ type: ActionTypes.SET_DEV_DATE_OVERRIDE, payload: v });
  };

  const inject7DaysCompleted = () => {
    const days = eachDayInclusive(subDays(effectiveToday, 6), effectiveToday);
    const iso = nowIso();

    const habitLogs = [...state.habitLogs];
    const habitIndex = new Map(habitLogs.map((l) => [`${l.habitId}_${l.date}`, l]));

    for (const h of state.habits.filter((x) => x.type === 'custom')) {
      for (const day of days) {
        if (!isHabitDueOnDate(h, day)) continue;
        const ds = toLocalDateString(day);
        const key = `${h.id}_${ds}`;
        if (habitIndex.has(key)) continue;
        const entry = { habitId: h.id, date: ds, completed: true, completedAt: iso };
        habitIndex.set(key, entry);
        habitLogs.push(entry);
      }
    }

    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: habitLogs });
    Alert.alert(t('devTools.injected'), t('devTools.injected7'), [{ text: t('common.ok') }]);
  };

  const injectMissedYesterday = () => {
    const y = subDays(effectiveToday, 1);
    const yStr = toLocalDateString(y);

    const habitLogs = [...state.habitLogs];
    const habitIndex = new Map(habitLogs.map((l) => [`${l.habitId}_${l.date}`, l]));
    for (const h of state.habits.filter((x) => x.type === 'custom')) {
      if (!isHabitDueOnDate(h, y)) continue;
      const key = `${h.id}_${yStr}`;
      const existing = habitIndex.get(key);
      if (existing) {
        existing.completed = false;
        existing.completedAt = null;
      } else {
        habitLogs.push({ habitId: h.id, date: yStr, completed: false, completedAt: null });
      }
    }

    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: habitLogs });
    Alert.alert(t('devTools.injected'), t('devTools.injectedMissed'), [{ text: t('common.ok') }]);
  };

  const clearLogsOnly = () => {
    Alert.alert(t('devTools.clearLogsTitle'), t('devTools.clearLogsMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('devTools.clearLogsBtn'),
        style: 'destructive',
        onPress: () => {
          dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: [] });
        },
      },
    ]);
  };

  return (
    <View>
      <View style={[styles.card, shadows.card]}>
        <Text style={[typography.subheading, styles.cardTitle]}>{t('devTools.dateOverride')}</Text>
        <Text style={[typography.caption, styles.help]}>{t('devTools.dateHelp')}</Text>
        <Input
          label={t('devTools.overrideLabel')}
          value={devDate}
          onChangeText={setDevDate}
          placeholder={t('devTools.overridePh')}
        />
        <Button title={t('devTools.apply')} onPress={applyDevDate} />
      </View>

      <View style={[styles.card, shadows.card]}>
        <Text style={[typography.subheading, styles.cardTitle]}>{t('devTools.streakTesting')}</Text>
        <Text style={[typography.caption, styles.help]}>{t('devTools.streakHelp')}</Text>
        <Button title={t('devTools.inject7')} onPress={inject7DaysCompleted} />
        <View style={{ height: spacing.sm }} />
        <Button
          title={t('devTools.injectMissed')}
          variant="secondary"
          onPress={injectMissedYesterday}
        />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.clearLogs')} variant="ghost" onPress={clearLogsOnly} />
      </View>
    </View>
  );
}

function makeStyles({ colors, radii, spacing }) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
      marginBottom: spacing.md,
    },
    cardTitle: {
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    help: {
      color: colors.textMuted,
      marginBottom: spacing.md,
      lineHeight: 18,
    },
  });
}

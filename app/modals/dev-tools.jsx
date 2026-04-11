import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subDays, startOfDay } from 'date-fns';

import { useApp, ActionTypes } from '../../context/AppContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { isHabitDueOnDate } from '../../utils/streak';
import { eachDayInclusive, toLocalDateString } from '../../utils/dates';
import { now, nowIso } from '../../utils/now';

function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());}

export default function DevToolsModal() {
  if (!__DEV__) return null;

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();

  const [devDate, setDevDate] = useState(state.devDateOverride || '');

  const close = () => router.back();

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
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Text style={[typography.heading, styles.title]}>{t('devTools.title')}</Text>
        <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel={t('common.close')}>
          <Text style={[typography.heading, styles.closeTxt]}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  spacer: { width: 40 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 32,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
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


import * as Notifications from 'expo-notifications';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { subDays, startOfDay } from 'date-fns';

import i18n from '../i18n';
import { ActionTypes, useApp } from '../context/AppContext';
import { useFajrTheme } from '../hooks/useFajrTheme';
import { eachDayInclusive, toLocalDateString } from '../utils/dates';
import { now, nowIso } from '../utils/now';
import { isHabitDueOnDate } from '../utils/streak';
import * as storage from '../utils/storage';
import { Button } from './Button';
import { Input } from './Input';

function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function monoFont() {
  if (Platform.OS === 'ios') return 'Menlo';
  if (Platform.OS === 'android') return 'monospace';
  return 'monospace';
}

export function DevToolsSection() {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ colors, radii, spacing }), [colors, radii, spacing]);

  const [devDate, setDevDate] = useState(state.devDateOverride || '');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const inspectorAnimRef = useRef(0);

  useEffect(() => {
    setDevDate(state.devDateOverride || '');
  }, [state.devDateOverride]);

  if (!__DEV__) return null;

  const effectiveToday = startOfDay(now());
  const todayStr = toLocalDateString(effectiveToday);
  const isoNow = nowIso();

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

  const clearDevDate = () => {
    setDevDate('');
    dispatch({ type: ActionTypes.SET_DEV_DATE_OVERRIDE, payload: null });
  };

  const customHabits = state.habits.filter((h) => h.type === 'custom');

  const completeAllToday = () => {
    for (const h of customHabits) {
      if (!isHabitDueOnDate(h, effectiveToday)) continue;
      dispatch({
        type: ActionTypes.TOGGLE_HABIT_LOG,
        payload: { habitId: h.id, date: todayStr, completed: true, nowIso: isoNow },
      });
    }
  };

  const missAllToday = () => {
    dispatch({
      type: ActionTypes.SET_HABIT_LOGS,
      payload: state.habitLogs.filter((l) => l.date !== todayStr),
    });
  };

  const injectCompletions = (n) => {
    const days = eachDayInclusive(subDays(effectiveToday, n - 1), effectiveToday);
    const habitLogs = [...state.habitLogs];
    const indexByKey = new Map(habitLogs.map((l, i) => [`${l.habitId}_${l.date}`, i]));
    for (const h of customHabits) {
      for (const day of days) {
        if (!isHabitDueOnDate(h, day)) continue;
        const ds = toLocalDateString(day);
        const key = `${h.id}_${ds}`;
        const i = indexByKey.get(key);
        if (i !== undefined) {
          habitLogs[i] = { ...habitLogs[i], completed: true, completedAt: isoNow };
        } else {
          habitLogs.push({ habitId: h.id, date: ds, completed: true, completedAt: isoNow });
          indexByKey.set(key, habitLogs.length - 1);
        }
      }
    }
    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: habitLogs });
  };

  const missYesterdayAll = () => {
    const y = toLocalDateString(subDays(effectiveToday, 1));
    dispatch({
      type: ActionTypes.SET_HABIT_LOGS,
      payload: state.habitLogs.filter((l) => l.date !== y),
    });
  };

  const clearAllLogs = () => {
    dispatch({ type: ActionTypes.SET_HABIT_LOGS, payload: [] });
  };

  const grantPlus = () => dispatch({ type: ActionTypes.SET_PLUS, payload: true });
  const revokePlus = () => dispatch({ type: ActionTypes.SET_PLUS, payload: false });

  const setInstallDate = async (iso) => {
    await storage.writeJson(storage.KEYS.installDate, iso);
    dispatch({ type: ActionTypes.SET_INSTALL_DATE, payload: iso });
  };

  const resetInstallDateToday = async () => {
    await setInstallDate(new Date().toISOString());
  };

  const setInstallDate91DaysAgo = async () => {
    const d = subDays(now(), 91);
    await setInstallDate(d.toISOString());
  };

  const fireIn3Seconds = async (identifier, title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false },
      });
    } catch (e) {
      Alert.alert(t('common.ok'), e?.message || String(e));
    }
  };

  const fireMorningNow = () =>
    fireIn3Seconds('dev-fire-morning', i18n.t('notifications.morningTitle'), i18n.t('notifications.morningBody'));
  const fireEveningNow = () =>
    fireIn3Seconds('dev-fire-evening', i18n.t('notifications.eveningTitle'), i18n.t('notifications.eveningBody'));
  const fireWeeklyNow = () =>
    fireIn3Seconds(
      'dev-fire-weekly',
      i18n.t('notifications.weeklyReportTitle'),
      i18n.t('notifications.weeklyReportBody')
    );

  const cancelAllNotifs = async () => {
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of all) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
      Alert.alert(t('common.ok'), t('devTools.cancelledNotifsMsg', { count: all.length }));
    } catch (e) {
      Alert.alert(t('common.ok'), e?.message || String(e));
    }
  };

  const inspectorLines = [
    `devDateOverride: ${state.devDateOverride || 'null'}`,
    `installDate: ${state.installDate || 'null'}`,
    `isPlus: ${state.userProfile.isPlus ? 'true' : 'false'}`,
    `masterNotificationsEnabled: ${state.masterNotificationsEnabled ? 'true' : 'false'}`,
    `onboarded: ${state.onboarded ? 'true' : 'false'}`,
    `habits.length: ${state.habits.length}`,
    `habitLogs.length: ${state.habitLogs.length}`,
  ];

  return (
    <View>
      <Group title="TIME TRAVEL">
        <Text style={[typography.caption, styles.help]}>{t('devTools.dateHelp')}</Text>
        <Input
          label={t('devTools.overrideLabel')}
          value={devDate}
          onChangeText={setDevDate}
          placeholder={t('devTools.overridePh')}
        />
        <View style={styles.rowBtns}>
          <Button title={t('devTools.apply')} onPress={applyDevDate} style={styles.rowBtn} />
          <Button title={t('devTools.clear')} variant="secondary" onPress={clearDevDate} style={styles.rowBtn} />
        </View>
      </Group>

      <Group title="HABIT STATE">
        <Button title={t('devTools.completeAllToday')} onPress={completeAllToday} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.missAllToday')} variant="secondary" onPress={missAllToday} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.inject7')} onPress={() => injectCompletions(7)} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.inject30')} variant="secondary" onPress={() => injectCompletions(30)} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.missYesterdayAll')} variant="ghost" onPress={missYesterdayAll} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.clearAllLogs')} variant="ghost" onPress={clearAllLogs} />
      </Group>

      <Group title="PURCHASE / PLUS">
        <Button title={t('devTools.grantPlus')} onPress={grantPlus} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.revokePlus')} variant="secondary" onPress={revokePlus} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.resetInstallDate')} variant="ghost" onPress={() => void resetInstallDateToday()} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.installDate91')} variant="ghost" onPress={() => void setInstallDate91DaysAgo()} />
      </Group>

      <Group title="NOTIFICATIONS">
        <Button title={t('devTools.fireMorning')} onPress={() => void fireMorningNow()} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.fireEvening')} variant="secondary" onPress={() => void fireEveningNow()} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.fireWeekly')} variant="secondary" onPress={() => void fireWeeklyNow()} />
        <View style={{ height: spacing.sm }} />
        <Button title={t('devTools.cancelAllNotifs')} variant="danger" onPress={() => void cancelAllNotifs()} />
      </Group>

      <View style={[styles.card, shadows.card]}>
        <Pressable
          onPress={() => {
            inspectorAnimRef.current += 1;
            setInspectorOpen((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('devTools.stateInspector')}
          style={styles.inspectorHdr}
        >
          <Text style={[typography.subheading, styles.cardTitle]}>{t('devTools.stateInspector')}</Text>
          <Text style={[typography.caption, styles.inspectorChev]}>{inspectorOpen ? '–' : '+'}</Text>
        </Pressable>
        {inspectorOpen ? (
          <View style={styles.inspectorBody}>
            {inspectorLines.map((line) => (
              <Text key={line} style={[typography.caption, styles.mono, { fontFamily: monoFont() }]}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Group({ title, children }) {
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ colors, radii, spacing }), [colors, radii, spacing]);
  return (
    <View style={[styles.card, shadows.card]}>
      <Text style={[typography.subheading, styles.cardTitle]}>{title}</Text>
      {children}
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
    rowBtns: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    rowBtn: {
      flex: 1,
    },
    inspectorHdr: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inspectorChev: {
      color: colors.textMuted,
      fontWeight: '700',
    },
    inspectorBody: {
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: spacing.sm,
      gap: 2,
    },
    mono: {
      color: colors.textSecondary,
    },
  });
}

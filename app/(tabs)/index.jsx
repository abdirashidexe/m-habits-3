import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitCard } from '../../components/HabitCard';
import { HabitCompletionRitual } from '../../components/HabitCompletionRitual';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { generateDailyInsight } from '../../utils/insights';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { formatDateDisplay, formatHijriDisplay, toLocalDateString } from '../../utils/dates';
import { now, nowIso } from '../../utils/now';
import { isHabitDueOnDate } from '../../utils/streak';

function greetingPeriod(date) {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, radii, spacing, typography, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, radii, spacing });
  const isDarkMode = Boolean(state.userProfile.darkMode);
  const [today, setToday] = useState(() => now());
  useFocusEffect(
    useCallback(() => {
      setToday(now());
    }, [])
  );
  const todayStr = toLocalDateString(today);
  const isEvening = greetingPeriod(today) === 'evening';
  const [timeLeftLabel, setTimeLeftLabel] = useState('');

  const dateLocale = useMemo(
    () => getDateFnsLocale(state.userProfile.language || 'en'),
    [state.userProfile.language]
  );

  useEffect(() => {
    const pad2 = (n) => String(n).padStart(2, '0');
    const update = () => {
      const d = now();
      const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
      const ms = Math.max(0, nextMidnight.getTime() - d.getTime());
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setTimeLeftLabel(`${h}:${pad2(m)}:${pad2(s)} ${t('home.leftToday')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [t, i18n.language]);

  const customHabits = useMemo(
    () => state.habits.filter((h) => h.type === 'custom'),
    [state.habits]
  );

  const dueTodayList = useMemo(
    () => customHabits.filter((h) => isHabitDueOnDate(h, today)),
    [customHabits, today]
  );

  const glowPulse = useRef(new Animated.Value(0)).current;
  const glowOpacity = useMemo(
    () => glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.78] }),
    [glowPulse]
  );
  const glowScale = useMemo(
    () => glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }),
    [glowPulse]
  );

  useEffect(() => {
    if (customHabits.length > 0 || isDarkMode) {
      glowPulse.stopAnimation();
      glowPulse.setValue(0);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [customHabits.length, glowPulse, isDarkMode]);

  const initial = (state.userProfile.name || '?').trim().charAt(0).toUpperCase();
  const [ritualOn, setRitualOn] = useState(false);

  const toggleHabit = (habitId, completed) => {
    dispatch({
      type: ActionTypes.TOGGLE_HABIT_LOG,
      payload: { habitId, date: todayStr, completed: !completed, nowIso: nowIso() },
    });
  };

  const allDueDone = useMemo(() => {
    if (dueTodayList.length === 0) return false;
    return dueTodayList.every((h) => {
      const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === todayStr);
      return Boolean(log?.completed);
    });
  }, [dueTodayList, state.habitLogs, todayStr]);

  const [prevAllDueDone, setPrevAllDueDone] = useState(false);
  useEffect(() => {
    if (!prevAllDueDone && allDueDone) {
      setRitualOn(true);
    }
    if (prevAllDueDone !== allDueDone) setPrevAllDueDone(allDueDone);
  }, [allDueDone, prevAllDueDone]);

  const insight = useMemo(
    () => generateDailyInsight(state.habits, state.habitLogs, today),
    [state.habits, state.habitLogs, today]
  );
  const greetKey =
    greetingPeriod(today) === 'morning'
      ? 'home.greetMorning'
      : greetingPeriod(today) === 'afternoon'
        ? 'home.greetAfternoon'
        : 'home.greetEvening';
  const displayName = state.userProfile.name || t('home.friend');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <HabitCompletionRitual visible={ritualOn} onFinished={() => setRitualOn(false)} />
      <ScrollView
        contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.main}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[typography.subheading, styles.salam]}>{t('home.salam')}</Text>
              <Text style={[typography.body, styles.greet]}>{t(greetKey, { name: displayName })}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel={t('home.openProfile')}
            >
              <Text style={[typography.heading, styles.avatarTxt]}>{initial}</Text>
            </Pressable>
          </View>

          <View style={styles.dates}>
            <Text style={[typography.subheading, styles.dateGreg]}>
              {formatDateDisplay(today, dateLocale)}
            </Text>
            <Text style={[typography.bodySmall, styles.dateHij]}>{formatHijriDisplay(today, t)}</Text>
            <Text style={[typography.caption, styles.countdown]}>{timeLeftLabel}</Text>
          </View>

          <View style={[styles.card, shadows.card]}>
            <Text style={[typography.heading, styles.sectionTitle]}>{t('home.todaysHabits')}</Text>
            {dueTodayList.length === 0 ? (
              <>
                <Text style={[typography.body, styles.emptyH]}>{t('home.noHabitsDue')}</Text>
                <View style={styles.addHabitBtnWrap}>
                  {customHabits.length === 0 && !isDarkMode ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.addHabitBtnGlow,
                        { backgroundColor: colors.primary },
                        { opacity: glowOpacity, transform: [{ scale: glowScale }] },
                      ]}
                    />
                  ) : null}
                  <Pressable
                    onPress={() => router.push('/(tabs)/habits')}
                    style={({ pressed }) => [styles.addHabitBtn, pressed && styles.addHabitBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.a11yAddHabit')}
                  >
                    <Text style={[typography.subheading, styles.addHabitBtnTxt]}>{t('home.addHabit')}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            {dueTodayList.map((h) => {
              const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === todayStr);
              const done = Boolean(log?.completed);
              const willCompleteAll =
                !done &&
                dueTodayList.every((x) => {
                  if (x.id === h.id) return true;
                  const lx = state.habitLogs.find((l) => l.habitId === x.id && l.date === todayStr);
                  return Boolean(lx?.completed);
                });
              return (
                <HabitCard
                  key={h.id}
                  habit={h}
                  logs={state.habitLogs}
                  referenceDate={today}
                  isEvening={isEvening}
                  completed={done}
                  suppressConfettiOnComplete={willCompleteAll}
                  onToggle={() => toggleHabit(h.id, done)}
                />
              );
            })}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.insightCard}>
            {!state.userProfile.isPlus ? (
              <View style={styles.plusPill} accessibilityElementsHidden>
                <Text style={[typography.caption, styles.plusPillTxt]}>✦ Fajr+</Text>
              </View>
            ) : null}
            <Text style={[typography.heading, styles.insightArabic]}>{insight.arabic}</Text>
            <Text style={[typography.bodySmall, styles.insightTranslation]}>{insight.translation}</Text>
            {state.userProfile.isPlus && insight.message ? (
              <Text style={[typography.caption, styles.insightMsg]}>{insight.message}</Text>
            ) : null}
          </View>
          {/* Keep static quote data in codebase for later reuse */}
          {/* <Text style={[typography.bodySmall, styles.quote]}>{quote.text}</Text>
          <Text style={[typography.caption, styles.quoteSrc]}>{quote.source}</Text> */}
        </View>
      </ScrollView>
    </View>
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
    },
    main: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    headerLeft: {
      flex: 1,
      paddingRight: spacing.md,
    },
    salam: {
      color: colors.accent,
      marginBottom: spacing.xs,
      textAlign: 'center',
      marginLeft: 60,
    },
    greet: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginLeft: 60,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: {
      color: colors.primary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    dates: {
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
    },
    dateGreg: {
      color: colors.textPrimary,
      textAlign: 'center',
    },
    dateHij: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    countdown: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    emptyH: {
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    addHabitBtnWrap: {
      alignSelf: 'center',
      position: 'relative',
    },
    addHabitBtnGlow: {
      position: 'absolute',
      top: -8,
      left: -14,
      right: -14,
      bottom: -8,
      borderRadius: radii.lg + 6,
    },
    addHabitBtn: {
      zIndex: 1,
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignSelf: 'center',
    },
    addHabitBtnPressed: {
      opacity: 0.85,
    },
    addHabitBtnTxt: {
      color: colors.background,
    },
    footer: {
      marginTop: spacing.md,
      paddingTop: spacing.sm,
    },
    insightCard: {
      paddingVertical: spacing.xs,
      paddingHorizontal: 0,
      position: 'relative',
    },
    plusPill: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    plusPillTxt: {
      color: colors.plusGold,
      fontWeight: '700',
    },
    insightArabic: {
      color: colors.textPrimary,
      textAlign: 'center',
      writingDirection: 'rtl',
      marginBottom: spacing.sm,
      lineHeight: 28,
    },
    insightTranslation: {
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    insightMsg: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    quote: {
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 20,
    },
    quoteSrc: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}

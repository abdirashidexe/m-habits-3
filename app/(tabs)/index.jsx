import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitCard } from '../../components/HabitCard';
import { HabitCompletionRitual } from '../../components/HabitCompletionRitual';
import { MOTIVATION_QUOTE_COUNT } from '../../constants/motivation';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { formatDateDisplay, formatHijriDisplay, getDayOfYear, toLocalDateString } from '../../utils/dates';
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

  const completedCount = dueTodayList.filter((h) => {
    const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === todayStr);
    return Boolean(log?.completed);
  }).length;
  const totalCount = dueTodayList.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const prevDueCountRef = useRef(dueTodayList.length);
  useEffect(() => {
    prevDueCountRef.current = dueTodayList.length;
  }, [dueTodayList.length]);

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
    const isCompleting = completed === false;
    const dueCountShrank = dueTodayList.length < prevDueCountRef.current;
    if (isCompleting && !dueCountShrank) {
      const willCompleteAll =
        dueTodayList.length > 0 &&
        dueTodayList.some((h) => h.id === habitId) &&
        dueTodayList.every((h) => {
          if (h.id === habitId) return true;
          const log = state.habitLogs.find((l) => l.habitId === h.id && l.date === todayStr);
          return Boolean(log?.completed);
        });
      if (willCompleteAll) setRitualOn(true);
    }
    dispatch({
      type: ActionTypes.TOGGLE_HABIT_LOG,
      payload: { habitId, date: todayStr, completed: !completed, nowIso: nowIso() },
    });
  };

  const quoteIdx = Math.abs(getDayOfYear(today)) % MOTIVATION_QUOTE_COUNT;
  const quote = {
    text: t(`motivation.${quoteIdx}.text`),
    source: t(`motivation.${quoteIdx}.source`),
  };
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
        contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: 0 }]}
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
            <Text style={[typography.caption, styles.hijriDisclaimer]}>
              {t('home.hijriDisclaimer')}
            </Text>
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

          {dueTodayList.length > 0 ? (
            <View style={styles.arcWrap}>
              <DailyArc
                completedCount={completedCount}
                totalCount={totalCount}
                progress={progress}
                colors={colors}
                spacing={spacing}
                typography={typography}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <Text style={[typography.bodySmall, styles.quote]}>{quote.text}</Text>
          <Text style={[typography.caption, styles.quoteSrc]}>{quote.source}</Text>
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
    arcWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
    },
    arcContainer: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arcFraction: {
      position: 'absolute',
      textAlign: 'center',
    },
    arcLabel: {
      marginTop: spacing.sm,
      textAlign: 'center',
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
    hijriDisclaimer: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
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
      borderTopWidth: 1,
      borderTopColor: colors.divider,
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

function DailyArc({ completedCount, totalCount, progress, colors, spacing, typography }) {
  const radius = 54;
  const strokeWidth = 8;
  const size = 120;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  const label =
    completedCount === 0
      ? 'Your day is waiting.'
      : completedCount > 0 && completedCount < totalCount
        ? 'Keep going.'
        : 'Well done. Come back tomorrow.';

  const AnimatedCircle = useMemo(() => Animated.createAnimatedComponent(Circle), []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.divider}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin="60, 60"
          />
        </Svg>

        <Text style={[typography.subheading, { color: colors.textPrimary, position: 'absolute', textAlign: 'center' }]}>
          {completedCount}/{totalCount}
        </Text>
      </View>

      <Text
        style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}
      >
        {label}
      </Text>
    </View>
  );
}

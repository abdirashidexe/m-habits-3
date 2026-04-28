import { format, startOfDay, subDays } from 'date-fns';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { PlusBadge } from '../../components/PlusBadge';
import { useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { toLocalDateString } from '../../utils/dates';
import { generateDailyInsight } from '../../utils/insights';
import { now } from '../../utils/now';
import { isHabitDueOnDate } from '../../utils/streak';

function calcWeekData(habits, habitLogs, endDate) {
  const end = startOfDay(endDate);
  const days = [];
  for (let i = 6; i >= 0; i -= 1) days.push(startOfDay(subDays(end, i)));
  const dayStrs = days.map((d) => toLocalDateString(d));
  const daySet = new Set(dayStrs);
  const logsInWeek = Array.isArray(habitLogs) ? habitLogs.filter((l) => l && daySet.has(l.date)) : [];
  const completedIndex = new Set(
    logsInWeek.filter((l) => l.completed === true).map((l) => `${l.habitId}_${l.date}`)
  );

  const customHabits = Array.isArray(habits) ? habits.filter((h) => h?.type === 'custom') : [];

  let totalDue = 0;
  let totalDone = 0;

  const rows = customHabits.map((h) => {
    const dots = [];
    let due = 0;
    let done = 0;
    for (let i = 0; i < days.length; i += 1) {
      const day = days[i];
      const ds = dayStrs[i];
      const dueToday = isHabitDueOnDate(h, day);
      if (!dueToday) {
        dots.push('nodue');
        continue;
      }
      due += 1;
      const ok = completedIndex.has(`${h.id}_${ds}`);
      if (ok) done += 1;
      dots.push(ok ? 'done' : 'missed');
    }
    totalDue += due;
    totalDone += done;
    const pct = due > 0 ? Math.round((done / due) * 100) : 0;
    return { id: h.id, name: h.name, dots, due, done, pct };
  });

  const overallPct = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0;
  return { days, rows, overallPct, rangeStart: days[0], rangeEnd: days[6] };
}

export default function WeeklyReportModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useApp();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ colors, spacing, radii }), [colors, spacing, radii]);

  const today = useMemo(() => now(), []);
  const dateLocale = useMemo(
    () => getDateFnsLocale(state.userProfile.language || 'en'),
    [state.userProfile.language]
  );
  const week = useMemo(() => calcWeekData(state.habits, state.habitLogs, today), [state.habits, state.habitLogs, today]);
  const rangeLabel = useMemo(() => {
    const a = format(week.rangeStart, 'MMM d', { locale: dateLocale });
    const b = format(week.rangeEnd, 'MMM d', { locale: dateLocale });
    return `${a} – ${b}`;
  }, [week.rangeStart, week.rangeEnd, dateLocale]);

  const insight = useMemo(() => generateDailyInsight(state.habits, state.habitLogs, today), [state.habits, state.habitLogs, today]);
  const plus = Boolean(state.userProfile.isPlus);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <View style={styles.titleWrap}>
          <Text style={[typography.subheading, styles.title]}>{t('weeklyReport.title')}</Text>
          <Text style={[typography.caption, styles.subTitle]}>{rangeLabel}</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8} accessibilityLabel={t('common.close')}>
          <Text style={[typography.heading, styles.closeTxt]}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={[typography.heading, styles.cardTitle]}>{t('weeklyReport.overall')}</Text>
          <Text style={[typography.displayMedium, styles.overallPct]}>{week.overallPct}%</Text>
          <Text style={[typography.caption, styles.overallHint]}>{t('weeklyReport.overallHint')}</Text>
        </View>

        {!plus ? (
          <Pressable
            onPress={() => router.push('/modals/paywall')}
            style={({ pressed }) => [styles.upsellCard, shadows.card, pressed && styles.upsellPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('weeklyReport.upsellTitle')}
          >
            <PlusBadge />
            <Text style={[typography.subheading, styles.upsellTitle]}>{t('weeklyReport.upsellTitle')}</Text>
            <Text style={[typography.bodySmall, styles.upsellBody]}>{t('weeklyReport.upsellBody')}</Text>
            <Button compact title={t('weeklyReport.unlock')} onPress={() => router.push('/modals/paywall')} style={styles.upsellBtn} />
          </Pressable>
        ) : (
          <View style={styles.habitList}>
            {week.rows.map((row) => (
              <View key={row.id} style={[styles.habitRow, shadows.card]}>
                <View style={styles.habitHdr}>
                  <Text style={[typography.subheading, styles.habitName]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={[typography.caption, styles.habitPct]}>
                    {row.done}/{row.due} · {row.pct}%
                  </Text>
                </View>
                <View style={styles.dotsRow}>
                  {row.dots.map((d, i) => (
                    <View
                      key={`${row.id}-d-${i}`}
                      style={[
                        styles.dot,
                        d === 'done' && styles.dotDone,
                        d === 'missed' && styles.dotMissed,
                        d === 'nodue' && styles.dotNoDue,
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {plus && insight.message ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={[typography.caption, styles.closeMsg]}>{insight.message}</Text>
          </View>
        ) : null}

        <View style={[styles.card, shadows.card]}>
          <Text style={[typography.heading, styles.ayahArabic]}>{insight.arabic}</Text>
          <Text style={[typography.bodySmall, styles.ayahTranslation]}>{insight.translation}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles({ colors, spacing, radii }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    topSpacer: { width: 40 },
    titleWrap: { flex: 1, alignItems: 'center' },
    title: { color: colors.textPrimary, textAlign: 'center' },
    subTitle: { color: colors.textMuted, textAlign: 'center', marginTop: 2 },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: { color: colors.textSecondary, marginBottom: 0, lineHeight: 28 },
    content: { gap: spacing.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    cardTitle: { color: colors.textPrimary, textAlign: 'center' },
    overallPct: { color: colors.primary, textAlign: 'center', marginBottom: 0 },
    overallHint: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
    upsellCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.plusGold,
    },
    upsellPressed: { opacity: 0.92 },
    upsellTitle: { color: colors.textPrimary, marginTop: spacing.sm, textAlign: 'center' },
    upsellBody: { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', lineHeight: 20 },
    upsellBtn: { marginTop: spacing.md },
    habitList: { gap: spacing.sm },
    habitRow: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    habitHdr: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
    habitName: { flex: 1, color: colors.textPrimary },
    habitPct: { color: colors.textMuted, fontWeight: '700' },
    dotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.background,
    },
    dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotMissed: { backgroundColor: 'transparent', borderColor: colors.divider },
    dotNoDue: { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceElevated, opacity: 0.7 },
    closeMsg: { color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    ayahArabic: {
      color: colors.textPrimary,
      textAlign: 'center',
      writingDirection: 'rtl',
      lineHeight: 28,
      marginBottom: spacing.sm,
    },
    ayahTranslation: { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  });
}


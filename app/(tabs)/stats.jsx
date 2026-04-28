import { addDays, addMonths, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { toLocalDateString } from '../../utils/dates';
import { now } from '../../utils/now';
import { calculateMonthlyConsistency } from '../../utils/streak';

export default function StatsScreen() {
  // Rewritten per spec: ranking rows with emojis, remove week glance entirely,
  // and provide a per-habit month dot grid with free vs Fajr+ history.
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = makeStyles({ colors, radii, spacing });
  const plus = Boolean(state.userProfile.isPlus);
  const today = now();

  const dateLocale = useMemo(
    () => getDateFnsLocale(state.userProfile.language || 'en'),
    [state.userProfile.language]
  );

  const customHabits = useMemo(
    () => (Array.isArray(state.habits) ? state.habits.filter((h) => h.type === 'custom') : []),
    [state.habits]
  );

  const ranked = useMemo(() => {
    const rows = customHabits.map((h) => {
      const r = calculateMonthlyConsistency(h.id, state.habitLogs, h, today);
      return { id: h.id, name: h.name, pct: r.percentage };
    });
    rows.sort((a, b) => b.pct - a.pct);
    return rows;
  }, [customHabits, state.habitLogs, today]);

  const months = useMemo(() => {
    const cur = startOfMonth(today);
    if (!plus) return [cur];
    const joinedIso = state.userProfile.joinedAt;
    const joined = joinedIso ? new Date(joinedIso) : null;
    const start = joined && !Number.isNaN(joined.getTime()) ? startOfMonth(joined) : cur;
    const out = [];
    for (let m = cur; m >= start; m = startOfMonth(addMonths(m, -1))) {
      out.push(m);
      if (out.length > 240) break;
    }
    return out;
  }, [plus, state.userProfile.joinedAt, today]);

  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);
  const activeMonthIndex = plus ? Math.min(visibleMonthIndex, Math.max(months.length - 1, 0)) : 0;
  const activeMonth = months[activeMonthIndex] || startOfMonth(today);

  const openPaywall = () => router.push('/modals/paywall');

  const iconForRank = (i) => {
    if (i === 0) return 'trophy';
    if (i === 1) return 'medal';
    return 'award';
  };

  return (
    <>
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleBlock}>
        <Text style={[typography.displayMedium, styles.screenTitle]}>{t('stats.analyticsTitle')}</Text>
        <Text style={[typography.subtext2, typography.caption, styles.subUnderTitle]}>
          {t('stats.analyticsSubtitle')}
        </Text>
      </View>

      <Text style={[typography.heading, styles.rankSectionHeaderHidden]}>{t('stats.yourStreaks')}</Text>
      <View style={[styles.card, shadows.card]}>
        {ranked.length > 0 ? (
          ranked.map((row, i) => (
            <View key={row.id} style={[styles.rankRow, i === ranked.length - 1 && styles.rankRowLast]}>
              <View style={styles.medal}>
                <FontAwesome6 name={iconForRank(i)} size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.rankMain}>
                <Text style={[typography.body, styles.rankName]} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={[typography.caption, styles.rankVal]}>
                  {t('stats.thisMonthPct', { count: row.pct })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[typography.body, styles.emptyStreaks]}>{t('stats.noStreaks')}</Text>
        )}
      </View>

      <View style={styles.sectionSpacer} />
      <Text style={[typography.heading, styles.section]}>{t('stats.historyTitle')}</Text>
      <View>
        <View style={styles.monthHeader}>
          {plus ? (
            <Pressable
              onPress={() => setVisibleMonthIndex((prev) => Math.min(prev + 1, months.length - 1))}
              disabled={activeMonthIndex >= months.length - 1}
              style={({ pressed }) => [
                styles.monthArrow,
                activeMonthIndex >= months.length - 1 && styles.monthArrowDisabled,
                pressed && activeMonthIndex < months.length - 1 && styles.monthArrowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('stats.prevMonthA11y')}
            >
              <Text style={[typography.subheading, styles.monthArrowText]}>{'‹'}</Text>
            </Pressable>
          ) : (
            <View style={styles.monthArrowSpacer} />
          )}

          <Text style={[typography.subheading, styles.monthLabel]}>
            {format(activeMonth, 'MMMM yyyy', { locale: dateLocale })}
          </Text>

          {plus ? (
            <Pressable
              onPress={() => setVisibleMonthIndex((prev) => Math.max(prev - 1, 0))}
              disabled={activeMonthIndex <= 0}
              style={({ pressed }) => [
                styles.monthArrow,
                activeMonthIndex <= 0 && styles.monthArrowDisabled,
                pressed && activeMonthIndex > 0 && styles.monthArrowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('stats.nextMonthA11y')}
            >
              <Text style={[typography.subheading, styles.monthArrowText]}>{'›'}</Text>
            </Pressable>
          ) : (
            <View style={styles.monthArrowSpacer} />
          )}
        </View>

        <MonthGrid
          monthStart={activeMonth}
          today={today}
          habits={customHabits}
          habitLogs={state.habitLogs}
          colors={colors}
          spacing={spacing}
          radii={radii}
          typography={typography}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.primary, borderColor: colors.primary }]} />
            <Text style={[typography.caption, styles.legendLabel]}>{t('stats.legendAllDone')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.primary + '55', borderColor: colors.primary + '55' },
              ]}
            />
            <Text style={[typography.caption, styles.legendLabel]}>{t('stats.legendPartial')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.surface, borderColor: colors.divider }]} />
            <Text style={[typography.caption, styles.legendLabel]}>{t('stats.legendMissed')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendSwatch}>
              <View style={styles.legendSlash} />
            </View>
            <Text style={[typography.caption, styles.legendLabel]}>{t('stats.legendNoHabits')}</Text>
          </View>
        </View>
      </View>

      {!plus ? (
        <Pressable
          onPress={openPaywall}
          style={({ pressed }) => [styles.upsellCard, shadows.card, pressed && styles.upsellPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.unlockPlus')}
        >
          <View style={styles.upsellTop}>
            <Text style={[typography.subheading, styles.upsellTitle]}>
              {t('stats.fullHistoryUpsell')}
            </Text>
          </View>
          <Button compact title={t('profile.unlockPlus')} onPress={openPaywall} style={styles.upsellBtn} />
        </Pressable>
      ) : null}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
    </>
  );
}

function MonthGrid({ monthStart, today, habits, habitLogs, colors, spacing, radii, typography }) {
  const month0 = startOfMonth(monthStart);
  const end = endOfMonth(month0);
  const days = [];
  for (let d = new Date(month0); d <= end; d = addDays(d, 1)) {
    days.push(startOfDay(d));
  }

  const dayStrs = days.map((d) => toLocalDateString(d));
  const daySet = new Set(dayStrs);
  const logsInMonth = Array.isArray(habitLogs)
    ? habitLogs.filter((l) => l && daySet.has(l.date))
    : [];

  const completedIndex = new Set(
    logsInMonth.filter((l) => l.completed === true).map((l) => `${l.habitId}_${l.date}`)
  );

  const totalHabits = habits.length;

  // pad start so day 1 lands on correct weekday (0=Sun)
  const startPad = month0.getDay();
  const cells = [...Array(startPad).fill(null), ...days];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={{ marginVertical: spacing.sm }}>
      <View style={stylesMonthGrid({ colors, spacing, radii }).weekdayRow}>
        {weekdays.map((label) => (
          <Text
            key={label}
            style={[typography.caption, stylesMonthGrid({ colors, spacing, radii }).weekdayLabel]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={stylesMonthGrid({ colors, spacing, radii }).grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`pad-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;

          const dateStr = toLocalDateString(day);
          const dueCount = habits.filter((h) => {
            const ds = day.getDay();
            if (h.frequency === 'specific_days') {
              return Array.isArray(h.specificDays) && h.specificDays.includes(ds);
            }
            return true;
          }).length;
          const completedCount = habits.filter((h) =>
            completedIndex.has(`${h.id}_${dateStr}`)
          ).length;
          const isFuture = day > today;
          const isToday = toLocalDateString(day) === toLocalDateString(today);
          const isPast = !isFuture && !isToday;

          const allDone = totalHabits > 0 && completedCount === totalHabits;
          const someDone = completedCount > 0 && !allDone;
          const showNoHabitsSlash = isPast && (totalHabits === 0 || dueCount === 0);

          const bgColor = isFuture
            ? 'transparent'
            : allDone
              ? colors.primary
              : someDone
                ? colors.primary + '55'
                : colors.surface;
          const numberColor = allDone || someDone ? colors.background : colors.textSecondary;

          return (
            <View
              key={dateStr}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                padding: 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: '80%',
                  aspectRatio: 1,
                  borderRadius: radii.sm,
                  backgroundColor: bgColor,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showNoHabitsSlash ? (
                  <View
                    style={{
                      position: 'absolute',
                      width: '70%',
                      height: 1,
                      backgroundColor: colors.divider,
                      transform: [{ rotate: '-45deg' }],
                    }}
                  />
                ) : null}
                <Text style={[typography.caption, { color: numberColor }]}>
                  {format(day, 'd')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function stylesMonthGrid({ colors, spacing }) {
  return StyleSheet.create({
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    weekdayLabel: {
      width: '14.28%',
      textAlign: 'center',
      color: colors.textSecondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
  });
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
      textAlign: 'center',
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
    rankSectionHeaderHidden: {
      display: 'none',
    },
    monthLabel: {
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      textAlign: 'center',
      flex: 1,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    monthArrow: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthArrowText: {
      color: colors.textPrimary,
    },
    monthArrowPressed: {
      opacity: 0.7,
    },
    monthArrowDisabled: {
      opacity: 0.3,
    },
    monthArrowSpacer: {
      width: 32,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      rowGap: spacing.sm,
      columnGap: spacing.md,
      marginTop: 0,
      marginBottom: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    legendSwatch: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legendSlash: {
      width: '70%',
      height: 1,
      backgroundColor: colors.divider,
      transform: [{ rotate: '-45deg' }],
    },
    legendLabel: {
      color: colors.textSecondary,
    },
    upsellCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.plusGold,
      marginTop: spacing.md,
    },
    upsellPressed: {
      opacity: 0.92,
    },
    upsellTop: {
      alignItems: 'center',
    },
    upsellTitle: {
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 22,
    },
    upsellBtn: {
      marginTop: spacing.md,
    },
  });
}

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { PlusBadge } from '../../components/PlusBadge';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { cancelHabitReminder } from '../../utils/notifications';
import { now } from '../../utils/now';
import { calculateStreak } from '../../utils/streak';

export default function HabitsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });
  const plus = state.userProfile.isPlus;
  const [reorderMode, setReorderMode] = React.useState(false);
  const glowPulse = useRef(new Animated.Value(0)).current;
  const glowOpacity = useMemo(
    () => glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.78] }),
    [glowPulse]
  );
  const glowScale = useMemo(
    () => glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }),
    [glowPulse]
  );

  const customHabits = useMemo(
    () => state.habits.filter((h) => h.type === 'custom'),
    [state.habits]
  );

  const dayShortLabels = useMemo(
    () => [
      t('habits.dayShortSun'),
      t('habits.dayShortMon'),
      t('habits.dayShortTue'),
      t('habits.dayShortWed'),
      t('habits.dayShortThu'),
      t('habits.dayShortFri'),
      t('habits.dayShortSat'),
    ],
    [t]
  );

  const freqLabel = (h) => {
    if (h.frequency === 'daily') return t('habits.daily');
    const parts = (h.specificDays || []).map((i) => dayShortLabels[i]).filter(Boolean);
    return parts.length ? parts.join(', ') : t('habits.specificDays');
  };

  const moveHabit = (habitId, dir) => {
    const all = state.habits;
    const customIds = new Set(customHabits.map((h) => h.id));
    const ordered = all.filter((h) => customIds.has(h.id));
    const idx = ordered.findIndex((h) => h.id === habitId);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= ordered.length) return;
    const swapped = [...ordered];
    const tmp = swapped[idx];
    swapped[idx] = swapped[nextIdx];
    swapped[nextIdx] = tmp;

    let ci = 0;
    const nextAll = all.map((h) => (customIds.has(h.id) ? swapped[ci++] : h));
    dispatch({ type: ActionTypes.SET_HABITS, payload: nextAll });
  };

  const openAdd = () => {
    if (!plus && customHabits.length >= 3) {
      Alert.alert(t('habits.plusTitle'), t('habits.plusLimitBody'), [{ text: t('common.ok') }]);
      return;
    }
    router.push('/modals/add-habit');
  };

  const confirmDelete = (h) => {
    Alert.alert(t('habits.deleteTitle'), t('habits.deleteMsg', { name: h.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await cancelHabitReminder(h.id);
          dispatch({ type: ActionTypes.DELETE_HABIT, payload: h.id });
        },
      },
    ]);
  };

  const openEdit = (h, locked) => {
    if (locked) {
      router.push('/modals/paywall');
      return;
    }
    router.push({ pathname: '/modals/add-habit', params: { id: h.id } });
  };

  useEffect(() => {
    if (customHabits.length > 0) {
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
  }, [customHabits.length, glowPulse]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleArea}>
          <Text style={[typography.displayMedium, styles.screenTitle]}>{t('habits.title')}</Text>
          <Text style={[typography.subtext2, typography.caption, styles.subUnderTitle]}>
            {t('habits.subtitle')}
          </Text>
        </View>
        {customHabits.length > 1 ? (
          <Pressable
            onPress={() => setReorderMode((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={reorderMode ? t('habits.a11yReorderDone') : t('habits.a11yReorder')}
            style={styles.reorderBtnFloating}
          >
            <Text style={[typography.caption, styles.reorderBtnTxt]}>
              {reorderMode ? t('habits.done') : t('habits.reorder')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, customHabits.length === 0 && styles.listWhenEmpty]}
        showsVerticalScrollIndicator={false}
      >
        {customHabits.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState title={t('habits.emptyTitle')} message={t('habits.emptyMsg')} />
            <Text style={[typography.caption, styles.arrow]}>↓</Text>
          </View>
        ) : null}

        {customHabits.map((h, index) => {
            const locked = !plus && index >= 3;
            const streak = calculateStreak(h.id, state.habitLogs, h, now());
            const RowWrap = locked ? Pressable : View;
            const rowWrapProps = locked
              ? { onPress: () => openEdit(h, true), accessibilityRole: 'button' }
              : {};
            return (
              <RowWrap
                key={h.id}
                {...rowWrapProps}
                style={[styles.row, shadows.card, locked && styles.rowLocked]}
              >
                <View style={styles.rowMain}>
                  <View style={styles.rowTop}>
                    <Text style={[typography.subheading, styles.name]}>{h.name}</Text>
                    {locked ? <PlusBadge compact /> : null}
                  </View>
                  <Text style={[typography.caption, styles.meta]}>{freqLabel(h)}</Text>
                  <Text style={[typography.caption, styles.streak]}>
                    {t('habits.streak', { count: streak.currentStreak })}
                  </Text>
                </View>
                {!locked ? (
                  <View style={styles.actions}>
                    {reorderMode ? (
                      <View style={styles.reorderArrows}>
                        <Pressable
                          onPress={() => moveHabit(h.id, -1)}
                          style={styles.reorderIconBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t('habits.a11yMoveUp')}
                        >
                          <FontAwesome6 name="chevron-up" size={14} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => moveHabit(h.id, 1)}
                          style={styles.reorderIconBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t('habits.a11yMoveDown')}
                        >
                          <FontAwesome6 name="chevron-down" size={14} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => openEdit(h, false)}
                      disabled={reorderMode}
                      style={styles.iconBtn}
                      accessibilityLabel={t('habits.a11yEdit')}
                    >
                      <FontAwesome6
                        name="pen-to-square"
                        size={20}
                        color={reorderMode ? colors.textMuted : colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(h)}
                      disabled={reorderMode}
                      style={styles.iconBtn}
                      accessibilityLabel={t('habits.a11yDelete')}
                    >
                      <FontAwesome6
                        name="trash"
                        size={20}
                        color={reorderMode ? colors.textMuted : colors.danger}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[typography.caption, styles.lock]}>🔒</Text>
                )}
              </RowWrap>
            );
          })}
      </ScrollView>

      <View style={styles.fabWrap}>
        {customHabits.length === 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fabGlow,
              { backgroundColor: colors.primary },
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
        ) : null}
        <Pressable style={[styles.fab, shadows.modal]} onPress={openAdd} accessibilityLabel={t('habits.a11yFab')}>
          <Text style={[typography.displayMedium, styles.fabPlus]}>+</Text>
        </Pressable>
      </View>
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
  headerRow: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitleArea: {
    width: '100%',
    alignItems: 'center',
  },
  reorderBtnFloating: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  reorderBtnTxt: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  // emptyWrap: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   paddingBottom: 120,
  // },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  arrow: {
    textAlign: 'center',
    color: colors.accent,
    marginTop: spacing.md,
    fontSize: 28,
  },
  list: {
    paddingBottom: 120,
  },
  listWhenEmpty: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  fabWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  rowLocked: {
    borderColor: colors.plusGold,
    opacity: 0.85,
  },
  rowMain: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  streak: {
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  reorderArrows: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 2,
  },
  reorderIconBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  iconBtn: {
    padding: spacing.sm,
  },
  lock: {
    color: colors.plusGold,
    fontSize: 22,
  },
  fab: {
    zIndex: 1,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: {
    color: colors.background,
    marginBottom: 0,
    lineHeight: 28,
  },
  });
}

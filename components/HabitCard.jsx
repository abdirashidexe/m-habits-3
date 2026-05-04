import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';
import { calculateStreak } from '../utils/streak';
import { ConfettiBurst } from './ConfettiBurst';

/**
 * @param {{
 *   habit: { id: string, name: string, createdAt: string },
 *   logs: { habitId: string, date: string, completed: boolean }[],
 *   referenceDate?: Date,
 *   isEvening?: boolean,
 *   completed: boolean,
 *   suppressConfettiOnComplete?: boolean,
 *   onToggle: () => void,
 * }} props
 */
export function HabitCard({
  habit,
  logs,
  referenceDate,
  isEvening = false,
  completed,
  suppressConfettiOnComplete = false,
  onToggle,
}) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, typography, spacing, radii });
  const [confettiOn, setConfettiOn] = useState(false);

  const streakInfo = calculateStreak(habit.id, logs, habit, referenceDate);
  const atRisk = isEvening ? streakInfo.atRisk : false;
  const showRisk = atRisk && !completed;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!completed && !suppressConfettiOnComplete) setConfettiOn(true);
    onToggle();
  };

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        completed && styles.cardDone,
        atRisk && !completed && styles.cardRisk,
      ]}
    >
      <ConfettiBurst
        active={confettiOn}
        colors={[colors.primary, colors.accent, colors.plusGold, colors.success]}
        onDone={() => setConfettiOn(false)}
        durationMs={820}
        style={styles.confettiSmallOrigin}
      />
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={styles.textBlock}>
            <Text style={[typography.subheading, styles.name]}>{habit.name}</Text>
            <View style={styles.metaSlot}>
              <Text
                style={[
                  typography.caption,
                  styles.risk,
                  !showRisk && styles.riskHidden,
                ]}
              >
                {t('habitCard.atRisk')}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.check,
            completed && styles.checkOn,
            pressed && styles.checkPressed,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
        >
          <Text style={[typography.heading, completed ? styles.checkMark : styles.checkEmpty]}>
            {completed ? '✓' : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles({ colors, typography, spacing, radii }) {
  const captionLineHeight = typography?.caption?.lineHeight ?? 16;
  const controlSize = 46;
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardDone: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primaryLight,
  },
  cardRisk: {
    borderColor: colors.accent,
  },
  row: {
    position: 'relative',
    minHeight: controlSize,
    justifyContent: 'center',
  },
  info: {
    position: 'relative',
    paddingLeft: 0,
    paddingRight: controlSize + spacing.sm,
  },
  textBlock: {
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  name: {
    color: colors.textPrimary,
    textAlign: 'left',
  },
  metaSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -20,
    minHeight: captionLineHeight,
    justifyContent: 'center',
  },
  risk: {
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'left',
  },
  riskHidden: {
    opacity: 0,
  },
  check: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -controlSize / 2 }],
    width: controlSize,
    height: controlSize,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkPressed: {
    opacity: 0.85,
  },
  checkMark: {
    color: colors.background,
  },
  checkEmpty: {
    color: 'transparent',
  },
  confettiSmallOrigin: {
    right: 23,
    top: 23,
  },
  });
}

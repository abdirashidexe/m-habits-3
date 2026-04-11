import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';
import { ConfettiBurst } from './ConfettiBurst';

/**
 * @param {{
 *   name: string,
 *   streak: number,
 *   atRisk: boolean,
 *   completed: boolean,
 *   suppressConfettiOnComplete?: boolean,
 *   onToggle: () => void,
 * }} props
 */
export function HabitCard({ name, streak, atRisk, completed, suppressConfettiOnComplete = false, onToggle }) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, typography, spacing, radii });
  const fire = streak > 2;
  const [confettiOn, setConfettiOn] = useState(false);

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
          <Text style={[typography.subheading, styles.name]}>{name}</Text>
          <View style={styles.meta}>
            <Text style={[typography.caption, styles.streak]}>
              {t('habitCard.streak', { fire: fire ? '🔥 ' : '', count: streak })}
            </Text>
            {atRisk && !completed ? (
              <Text style={[typography.caption, styles.risk]}>{t('habitCard.atRisk')}</Text>
            ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  streak: {
    color: colors.textSecondary,
  },
  risk: {
    color: colors.accent,
    fontWeight: '600',
  },
  check: {
    width: 46,
    height: 46,
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

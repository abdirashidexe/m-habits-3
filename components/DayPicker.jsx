import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * @param {{
 *   value: number[],
 *   onChange: (days: number[]) => void,
 * }} props
 * value: 0=Sun .. 6=Sat
 */
export function DayPicker({ value, onChange }) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ colors, spacing, radii }), [colors, spacing, radii]);

  const LABELS = useMemo(
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

  const toggle = (idx) => {
    const has = value.includes(idx);
    if (has) onChange(value.filter((d) => d !== idx));
    else onChange([...value, idx].sort((a, b) => a - b));
  };

  return (
    <View style={styles.row}>
      {LABELS.map((label, idx) => {
        const on = value.includes(idx);
        return (
          <Pressable
            key={label + idx}
            onPress={() => toggle(idx)}
            style={({ pressed }) => [
              styles.pill,
              on && styles.pillOn,
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[typography.caption, on ? styles.txtOn : styles.txt]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles({ colors, spacing, radii }) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    pill: {
      flex: 1,
      minWidth: 36,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: 'center',
    },
    pillOn: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    pillPressed: {
      opacity: 0.85,
    },
    txt: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    txtOn: {
      color: colors.background,
      fontWeight: '700',
    },
  });
}

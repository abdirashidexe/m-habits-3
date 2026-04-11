import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * @param {{ compact?: boolean, style?: object }} props
 */
export function PlusBadge({ compact = false, style }) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });
  return (
    <View style={[styles.wrap, compact && styles.compact, style]}>
      <Text style={[typography.caption, styles.text]}>{t('plus.badge')}</Text>
    </View>
  );
}

function makeStyles({ colors, spacing, radii }) {
  return StyleSheet.create({
    wrap: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.plusGold,
      backgroundColor: colors.surfaceElevated,
    },
    compact: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    text: {
      color: colors.plusGold,
      fontWeight: '700',
    },
  });
}

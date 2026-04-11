import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * @param {{ title: string, message: string, style?: object }} props
 */
export function EmptyState({ title, message, style }) {
  const { colors, typography, spacing } = useFajrTheme();
  const styles = makeStyles({ colors, typography, spacing });
  return (
    <View style={[styles.wrap, style]}>
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      <Text style={[typography.body, styles.msg]}>{message}</Text>
    </View>
  );
}

function makeStyles({ colors, typography, spacing }) {
  return StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  msg: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  });
}

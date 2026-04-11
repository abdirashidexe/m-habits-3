import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * @param {{
 *   title: string,
 *   onPress: () => void,
 *   variant?: 'primary' | 'secondary' | 'ghost',
 *   disabled?: boolean,
 *   loading?: boolean,
 *   style?: object,
 *   compact?: boolean,
 * }} props
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  compact = false,
}) {
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, typography, spacing, radii });
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? colors.background : colors.primary} />
        ) : (
          <Text
            style={[
              styles.text,
              typography.body,
              isPrimary && styles.textOnPrimary,
              variant === 'secondary' && styles.textPrimary,
              isGhost && styles.textGhost,
            ]}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function makeStyles({ colors, typography, spacing, radii }) {
  return StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  compact: {
    alignSelf: 'center',
    width: 240,
    maxWidth: '88%',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
  },
  text: {
    textAlign: 'center',
  },
  textOnPrimary: {
    color: colors.background,
    fontWeight: '600',
  },
  textPrimary: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  textGhost: {
    color: colors.primary,
    fontWeight: '600',
  },
  });
}

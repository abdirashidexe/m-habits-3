import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * @param {{
 *   label?: string,
 *   value: string,
 *   onChangeText: (t: string) => void,
 *   placeholder?: string,
 *   multiline?: boolean,
 *   maxLength?: number,
 *   keyboardType?: import('react-native').TextInputProps['keyboardType'],
 *   style?: object,
 *   inputStyle?: object,
 * }} props
 */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  keyboardType = 'default',
  style,
  inputStyle,
}) {
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, typography, spacing, radii });
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[typography.caption, styles.label]}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        style={[
          styles.input,
          typography.body,
          multiline && styles.inputMulti,
          inputStyle,
        ]}
      />
    </View>
  );
}

function makeStyles({ colors, typography, spacing, radii }) {
  return StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    minHeight: 44,
  },
  inputMulti: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  });
}

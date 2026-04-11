import React from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * Switch with a visible outline so the off state reads clearly on light cream surfaces.
 * @param {import('react-native').SwitchProps} props
 */
export function ThemedSwitch(props) {
  const { colors } = useFajrTheme();
  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.textSecondary },
        Platform.OS === 'android' && styles.wrapAndroid,
      ]}
    >
      <Switch
        {...props}
        trackColor={{ false: colors.divider, true: colors.primaryLight }}
        thumbColor={colors.background}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 2,
    alignSelf: 'center',
  },
  wrapAndroid: {
    borderRadius: 22,
  },
});

import React from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { useFajrTheme } from '../hooks/useFajrTheme';

/**
 * Switch with a card-like border so the off state reads clearly on light cream surfaces.
 * @param {import('react-native').SwitchProps} props
 */
export function ThemedSwitch(props) {
  const { colors } = useFajrTheme();
  const isOn = Boolean(props.value);
  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.divider },
        Platform.OS === 'android' && styles.wrapAndroid,
      ]}
    >
      <Switch
        {...props}
        trackColor={{ false: colors.textMuted, true: colors.primaryLight }}
        thumbColor={isOn ? colors.background : colors.primaryLight}
        ios_thumbColor={isOn ? colors.background : colors.primaryLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 2,
    alignSelf: 'center',
  },
  wrapAndroid: {
    borderRadius: 22,
  },
});

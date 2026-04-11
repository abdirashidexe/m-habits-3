import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { COLOR_THEME_IDS, getColors } from '../../theme';

export default function AppColorsModal() {
  const { t } = useTranslation();
  const OPTIONS = COLOR_THEME_IDS.map((id) => ({
    id,
    label: t(`appColors.${id}`),
    defaultNote: id === 'main',
  }));
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });
  const mode = state.userProfile.darkMode ? 'dark' : 'light';
  const selected = state.userProfile.colorTheme || 'main';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Text style={[typography.body, styles.closeTxt]}>✕</Text>
        </Pressable>
        <Text style={[typography.subheading, styles.title]}>{t('appColors.title')}</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.cardsRow}>
        {OPTIONS.map(({ id, label, defaultNote }) => {
          const preview = getColors(mode, id);
          const isOn = selected === id;
          return (
            <Pressable
              key={id}
              onPress={() => dispatch({ type: ActionTypes.SET_COLOR_THEME, payload: id })}
              style={[
                styles.card,
                isOn && styles.cardSelected,
                { borderColor: isOn ? colors.primary : colors.divider },
              ]}
            >
              <View style={styles.swatchRow}>
                <View style={[styles.swatch, { backgroundColor: preview.primary }]} />
                <View style={[styles.swatch, { backgroundColor: preview.primaryLight }]} />
              </View>
              <Text style={[typography.subheading, styles.cardTitle, { color: colors.textPrimary }]}>
                {label}
              </Text>
              {defaultNote ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t('appColors.default')}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    topSpacer: {
      width: 40,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: {
      color: colors.textSecondary,
    },
    cardsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    card: {
      flexGrow: 1,
      flexBasis: '30%',
      minWidth: 100,
      maxWidth: 140,
      minHeight: 132,
      borderRadius: radii.lg,
      borderWidth: 2,
      backgroundColor: colors.surface,
      padding: spacing.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardSelected: {
      backgroundColor: colors.surfaceElevated,
    },
    swatchRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: spacing.sm,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
    },
    cardTitle: {
      textAlign: 'center',
    },
  });
}

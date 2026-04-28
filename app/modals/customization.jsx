import { FontAwesome6 } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedSwitch } from '../../components/ThemedSwitch';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { COLOR_THEME_IDS, getColors } from '../../theme';
import { isThemeGracePeriodActive } from '../../utils/launch';

export default function CustomizationModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });

  const darkMode = Boolean(state.userProfile.darkMode);
  const mode = darkMode ? 'dark' : 'light';
  const selected = state.userProfile.colorTheme || 'main';
  const themesAreFree = isThemeGracePeriodActive(state.installDate) || state.userProfile.isPlus;

  const options = useMemo(
    () =>
      COLOR_THEME_IDS.map((id) => ({
        id,
        label: t(`appColors.${id}`),
        preview: getColors(mode, id),
        isOn: selected === id,
        locked: !themesAreFree && id !== 'main',
      })),
    [mode, selected, t, themesAreFree]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Text style={[typography.body, styles.closeTxt]}>✕</Text>
        </Pressable>
        <Text style={[typography.subheading, styles.title]}>{t('profile.customization')}</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.heading, styles.section]}>{t('profile.darkMode')}</Text>
        <View style={[styles.row, styles.cardRow, shadows.card]}>
          <Text style={[typography.body, styles.rowLbl]}>
            <FontAwesome6 name="moon" size={16} color={colors.textPrimary} /> {t('profile.darkMode')}
          </Text>
          <ThemedSwitch
            value={darkMode}
            onValueChange={(v) => dispatch({ type: ActionTypes.SET_DARK_MODE, payload: v })}
          />
        </View>

        <View style={styles.sectionSpacer} />
        <Text style={[typography.heading, styles.section]}>{t('profile.appColors')}</Text>
        {!themesAreFree ? (
          <View style={styles.lockBanner}>
            <Text style={[typography.caption, styles.lockBannerTxt]}>
              {t('appColors.themesPlusAfterGrace')}
            </Text>
          </View>
        ) : null}
        <View style={styles.swatchGrid}>
          {options.map(({ id, label, preview, isOn, locked }) => (
            <Pressable
              key={id}
              onPress={() => {
                if (locked) {
                  router.push('/modals/paywall');
                  return;
                }
                dispatch({ type: ActionTypes.SET_COLOR_THEME, payload: id });
              }}
              style={({ pressed }) => [
                styles.swatchItem,
                shadows.card,
                isOn && styles.swatchItemOn,
                pressed && styles.swatchItemPressed,
                locked && styles.swatchLocked,
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              {locked ? (
                <View style={styles.lockIcon} accessibilityElementsHidden>
                  <FontAwesome6 name="lock" size={14} color={colors.textMuted} />
                </View>
              ) : null}
              <View
                style={[
                  styles.halfCircleWrap,
                  { borderColor: isOn ? colors.primary : colors.divider, backgroundColor: colors.surface },
                ]}
              >
                <View style={[styles.half, { backgroundColor: preview.primary }]} />
                <View style={[styles.half, { backgroundColor: preview.primaryLight }]} />
              </View>
              <Text style={[typography.caption, styles.swatchLbl]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
    content: {
      paddingBottom: spacing.xl,
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
    section: {
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionSpacer: {
      marginTop: spacing.md,
    },
    lockBanner: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.plusGold,
      borderRadius: radii.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    lockBannerTxt: {
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 18,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    cardRow: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.divider,
      marginBottom: spacing.sm,
    },
    rowLbl: {
      color: colors.textPrimary,
    },
    swatchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    swatchItem: {
      width: 110,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.divider,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      position: 'relative',
    },
    swatchItemOn: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.primary,
    },
    swatchItemPressed: {
      opacity: 0.92,
    },
    swatchLocked: {
      opacity: 0.75,
    },
    lockIcon: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 2,
    },
    halfCircleWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      overflow: 'hidden',
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    half: {
      flex: 1,
    },
    swatchLbl: {
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: '100%',
    },
  });
}


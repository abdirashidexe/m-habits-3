import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LANGUAGES } from '../../constants/languages';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';

export default function LanguageModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, typography, spacing, radii } = useFajrTheme();
  const styles = makeStyles({ colors, spacing, radii });
  const selected = state.userProfile.language || 'en';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Text style={[typography.body, styles.closeTxt]}>✕</Text>
        </Pressable>
        <Text style={[typography.subheading, styles.title]}>{t('languageModal.title')}</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {LANGUAGES.map(({ id, native }) => {
          const isOn = selected === id;
          return (
            <Pressable
              key={id}
              onPress={() => dispatch({ type: ActionTypes.SET_LANGUAGE, payload: id })}
              style={[
                styles.row,
                { borderColor: isOn ? colors.primary : colors.divider },
                isOn && { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>{native}</Text>
            </Pressable>
          );
        })}
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
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    topSpacer: { width: 40 },
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
    closeTxt: { color: colors.textSecondary },
    list: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    row: {
      borderRadius: radii.lg,
      borderWidth: 2,
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });
}

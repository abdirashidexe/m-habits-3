import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevToolsSection } from '../../components/DevToolsSection';
import { useFajrTheme } from '../../hooks/useFajrTheme';

export default function DevToolsModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography, spacing } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ spacing }), [spacing]);

  const close = () => router.back();

  if (!__DEV__) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: colors.danger }]}>
        <Text style={[typography.caption, styles.bannerTxt, { color: colors.background }]}>
          ⚠ DEV MODE — not visible in production
        </Text>
      </View>

      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Text style={[typography.heading, styles.title, { color: colors.textPrimary }]}>{t('devTools.title')}</Text>
        <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel={t('common.close')}>
          <Text style={[typography.heading, styles.closeTxt, { color: colors.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DevToolsSection />
      </ScrollView>
    </View>
  );
}

function makeStyles({ spacing }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    banner: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    bannerTxt: {
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    spacer: { width: 40 },
    title: {
      flex: 1,
      textAlign: 'center',
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: {
      fontSize: 28,
      lineHeight: 32,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
  });
}


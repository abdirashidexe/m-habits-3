import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevToolsSection } from '../../components/DevToolsSection';
import { colors, typography, spacing } from '../../theme';

export default function DevToolsModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const close = () => router.back();

  if (!__DEV__) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Text style={[typography.heading, styles.title]}>{t('devTools.title')}</Text>
        <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel={t('common.close')}>
          <Text style={[typography.heading, styles.closeTxt]}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DevToolsSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 28,
    lineHeight: 32,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
});


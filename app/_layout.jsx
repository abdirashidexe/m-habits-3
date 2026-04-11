import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../i18n';

import { useTranslation } from 'react-i18next';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { AppProvider, useApp } from '../context/AppContext';
import { useFajrTheme } from '../hooks/useFajrTheme';

export default function RootLayout() {
  // useEffect(() => {
  //   Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  //   // Platform-specific API keys
  //   const iosApiKey = process.env.REVENUE_CAT_IOS_API_KEY;
  //   const androidApiKey = process.env.REVENUE_CAT_ANDROID_API_KEY;

  //   if (Platform.OS === 'ios') {
  //      Purchases.configure({ apiKey: iosApiKey });
  //   } else if (Platform.OS === 'android') {
  //      Purchases.configure({ apiKey: androidApiKey });
  //   }
  // }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootLayoutInner />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutInner() {
  const { mode, colors, spacing } = useFajrTheme();
  const styles = makeStyles({ colors, spacing });
  const navigationTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: mode === 'dark',
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.divider,
        primary: colors.primary,
      },
    };
  }, [mode, colors.background, colors.surface, colors.textPrimary, colors.divider, colors.primary]);
  return (
    <View style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modals"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              gestureEnabled: true,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </ThemeProvider>
      <DevModeBanner />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

function DevModeBanner() {
  const { state } = useApp();
  const { t } = useTranslation();
  const { colors, typography, spacing } = useFajrTheme();
  const styles = makeStyles({ colors, spacing });
  const insets = useSafeAreaInsets();
  if (!state.devDateOverride) return null;
  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Text style={[typography.label, styles.bannerTxt]}>
        {t('devBanner', { date: state.devDateOverride })}
      </Text>
    </View>
  );
}

function makeStyles({ colors, spacing }) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.danger,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    bannerTxt: {
      color: colors.background,
    },
  });
}

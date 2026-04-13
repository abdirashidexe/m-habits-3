import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from 'react-native-ico-flags';
import { Button } from '../../components/Button';
import { LANGUAGES } from '../../constants/languages';
import { ActionTypes, runPostOnboardingNotificationSetup, useApp } from '../../context/AppContext';
import { colors, radii, spacing, typography } from '../../theme';
import { nowIso } from '../../utils/now';

function MoonIllustration() {
  return (
    <View style={styles.moonWrap}>
      <View style={styles.moonCircle} />
      <View style={styles.moonMask} />
      <View style={styles.star} />
      <View style={[styles.star, styles.star2]} />
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef(null);
  const nameInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const stepRef = useRef(0);
  const prevStepForHapticRef = useRef(null);
  stepRef.current = step;

  const goToStep = useCallback(
    (i) => {
      const clamped = Math.max(0, Math.min(3, i));
      setStep(clamped);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: clamped * windowWidth, animated: true });
      });
    },
    [windowWidth]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: stepRef.current * windowWidth, animated: false });
  }, [windowWidth]);

  useEffect(() => {
    const prev = prevStepForHapticRef.current;
    if (prev !== null && prev !== step && Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    prevStepForHapticRef.current = step;
  }, [step]);

  useEffect(() => {
    if (step !== 3) {
      nameInputRef.current?.blur();
      return;
    }
    const id = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / Math.max(1, windowWidth));
      if (i < 0 || i > 3) return;
      const current = stepRef.current;
      if (i > current) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: current * windowWidth, animated: true });
        });
        return;
      }
      if (i !== current) setStep(i);
    },
    [windowWidth]
  );

  const finish = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: ActionTypes.SET_LANGUAGE, payload: language });
    dispatch({ type: ActionTypes.SET_USER_NAME, payload: trimmed });
    dispatch({ type: ActionTypes.SET_ONBOARDED, payload: { onboarded: true, nowIso: nowIso() } });
    await runPostOnboardingNotificationSetup();
    router.replace('/(tabs)');
  };

  const pageStyle = [styles.page, { width: windowWidth }];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={12}
            onPress={() => goToStep(step - 1)}
            style={[
              styles.backBtn,
              { top: insets.top + spacing.sm, start: spacing.md + insets.left },
            ]}
          >
            <FontAwesome6 name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={pageStyle}>
            <View style={styles.slideInner}>
              <Text style={[typography.heading, styles.q]}>{t('onboarding.chooseLanguage')}</Text>
              <Text style={[typography.bodySmall, styles.hint]}>{t('onboarding.languageHint')}</Text>
              <View style={styles.langList}>
                {LANGUAGES.map(({ id, native, iconName }) => (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setLanguage(id);
                      dispatch({ type: ActionTypes.SET_LANGUAGE, payload: id });
                    }}
                    style={[
                      styles.langRow,
                      language === id ? styles.langRowOn : styles.langRowOff,
                    ]}
                  >
                    <Icon name={iconName} size={24} />
                    <Text
                      style={[
                        typography.body,
                        language === id ? styles.langTxtOn : styles.langTxtOff,
                      ]}
                    >
                      {native}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button compact title={t('onboarding.continue')} onPress={() => goToStep(1)} style={styles.btn} />
            </View>
          </View>

          <View style={pageStyle}>
            <View style={styles.slideInner}>
              <Text style={[typography.displayLarge, styles.title]}>{t('onboarding.title')}</Text>
              <Text style={styles.credit}>{t('onboarding.credit')}</Text>
              <MoonIllustration />
              <Button compact title={t('onboarding.continue')} onPress={() => goToStep(2)} style={styles.btn} />
            </View>
          </View>

          <View style={pageStyle}>
            <View style={styles.slideInner}>
              <Text style={[typography.displayMedium, styles.heading]}>{t('onboarding.trackTitle')}</Text>
              <Text style={[typography.body, styles.body, { paddingHorizontal: spacing.sm }]}>{t('onboarding.trackBody')}</Text>
              <Button compact title={t('onboarding.continue')} onPress={() => goToStep(3)} style={styles.btn} />
            </View>
          </View>

          <View style={pageStyle}>
            <View style={styles.slideInner}>
              <Text style={[typography.heading, styles.q]}>{t('onboarding.nameQuestion')}</Text>
              <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                placeholder={t('onboarding.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[typography.body, styles.input]}
                maxLength={40}
              />
              <Button
                compact
                title={t('onboarding.getStarted')}
                onPress={finish}
                disabled={!name.trim()}
                style={styles.btn}
              />
              <Text style={[typography.bodySmall, styles.dataDisclaimer]}>
                {t('onboarding.dataDisclaimer')}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.dotsRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  backBtn: {
    position: 'absolute',
    zIndex: 2,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.15 }],
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
    opacity: 0.45,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  credit: {
    fontFamily: 'Lexend',
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 6,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  moonWrap: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    marginVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moonCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  moonMask: {
    position: 'absolute',
    width: 100,
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 60,
    left: 58,
    top: 20,
  },
  star: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: colors.accent,
    borderRadius: 2,
    top: 24,
    right: 20,
    transform: [{ rotate: '45deg' }],
  },
  star2: {
    width: 6,
    height: 6,
    top: 48,
    right: 40,
  },
  heading: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  q: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  dataDisclaimer: {
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  btn: {
    marginTop: spacing.md,
  },
  langList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  langRowOff: {
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  langRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  langTxtOff: {
    color: colors.textPrimary,
  },
  langTxtOn: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

import { format, isValid, parseISO } from 'date-fns';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontAwesome6 } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { PlusBadge } from '../../components/PlusBadge';
import { ThemedMessageModal } from '../../components/ThemedMessageModal';
import { ThemedSwitch } from '../../components/ThemedSwitch';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import { getDateFnsLocale } from '../../utils/dateLocale';
import { cancelAllLocalNotifications } from '../../utils/notifications';
import * as storage from '../../utils/storage';
import { maxLongestStreakAcrossHabits } from '../../utils/streak';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { colors, radii, shadows, spacing, typography } = useFajrTheme();
  const styles = makeStyles({ colors, radii, spacing });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.userProfile.name);
  const [dialog, setDialog] = useState(null);
  const nameOpacity = useRef(new Animated.Value(1)).current;
  const devTapCountRef = useRef(0);
  const devTapResetRef = useRef(/** @type {null | ReturnType<typeof setTimeout>} */ (null));

  const nameFadeMs = 150;
  const nameFadeEasing = Easing.in(Easing.linear);

  const beginNameEdit = () => {
    setNameDraft(state.userProfile.name);
    Animated.timing(nameOpacity, {
      toValue: 0,
      duration: nameFadeMs,
      easing: nameFadeEasing,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setEditingName(true);
      nameOpacity.setValue(0);
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: nameFadeMs,
        easing: nameFadeEasing,
        useNativeDriver: true,
      }).start();
    });
  };

  const finishNameEdit = () => {
    Animated.timing(nameOpacity, {
      toValue: 0,
      duration: nameFadeMs,
      easing: nameFadeEasing,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      dispatch({ type: ActionTypes.SET_USER_NAME, payload: nameDraft.trim() });
      setEditingName(false);
      nameOpacity.setValue(0);
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: nameFadeMs,
        easing: nameFadeEasing,
        useNativeDriver: true,
      }).start();
    });
  };

  const version = Constants.expoConfig?.version || '1.0.0';
  const plus = state.userProfile.isPlus;
  const dateLocale = useMemo(
    () => getDateFnsLocale(state.userProfile.language || 'en'),
    [state.userProfile.language]
  );

  const joined = state.userProfile.joinedAt;
  const joinedLabel =
    joined && isValid(parseISO(joined))
      ? format(parseISO(joined), 'MMMM d, yyyy', { locale: dateLocale })
      : t('common.dash');

  const overallLongest = maxLongestStreakAcrossHabits(
    state.habits.filter((h) => h.type === 'custom'),
    state.habitLogs
  );

  const initial = (state.userProfile.name || '?').trim().charAt(0).toUpperCase();

  const unlockPlus = () => {
    router.push('/modals/paywall');
  };

  const resetData = () => {
    setDialog({
      title: t('profile.resetTitle'),
      message: t('profile.resetMsg'),
      actions: [
        { label: t('common.cancel'), variant: 'secondary' },
        {
          label: t('profile.resetContinue'),
          variant: 'primary',
          dismiss: false,
          onPress: () => {
            setDialog({
              title: t('profile.resetSureTitle'),
              message: t('profile.resetSureMsg'),
              actions: [
                { label: t('common.cancel'), variant: 'secondary' },
                {
                  label: t('profile.eraseAll'),
                  variant: 'danger',
                  onPress: async () => {
                    await cancelAllLocalNotifications();
                    await storage.clearAllFajrKeys();
                    dispatch({ type: ActionTypes.RESET_ALL });
                    router.replace('/onboarding');
                  },
                },
              ],
            });
          },
        },
      ],
    });
  };

  const onVersionTap = () => {
    if (!__DEV__) return;
    devTapCountRef.current += 1;
    if (devTapResetRef.current) clearTimeout(devTapResetRef.current);
    devTapResetRef.current = setTimeout(() => {
      devTapCountRef.current = 0;
      devTapResetRef.current = null;
    }, 3000);
    if (devTapCountRef.current >= 7) {
      devTapCountRef.current = 0;
      if (devTapResetRef.current) clearTimeout(devTapResetRef.current);
      devTapResetRef.current = null;
      router.push('/modals/dev-tools');
    }
  };

  return (
    <>
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={[typography.displayMedium, styles.title]}>{t('profile.title')}</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={[typography.displayMedium, styles.avatarTxt]}>{initial}</Text>
          </View>
          <Animated.View style={[styles.nameBlock, { opacity: nameOpacity }]}>
            {editingName ? (
              <View style={styles.nameEdit}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  style={[typography.heading, styles.nameInput]}
                  placeholder={t('profile.yourName')}
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                />
                <Pressable onPress={finishNameEdit} style={styles.saveName}>
                  <Text style={[typography.caption, styles.saveNameTxt]}>{t('common.save')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={beginNameEdit}>
                <Text style={[typography.heading, styles.name]}>
                  {state.userProfile.name || t('profile.yourName')}
                </Text>
                <Text style={[typography.caption, styles.tapHint]}>{t('profile.tapToEdit')}</Text>
              </Pressable>
            )}
          </Animated.View>
          <Text style={[typography.bodySmall, styles.meta]}>
            {t('profile.memberSince', { date: joinedLabel })}
          </Text>
          <Text style={[typography.bodySmall, styles.meta]}>
            {t('profile.longestStreak', { count: overallLongest })}
          </Text>
        </View>

        {!plus ? (
          <View style={[styles.plusCard, shadows.card]}>
            <PlusBadge />
            <Text style={[typography.subheading, styles.premTitle]}>{t('stats.plusTitle')}</Text>
            {[1, 2, 3, 4].map((i) => (
              <Text key={i} style={[typography.bodySmall, styles.benefit]}>
                • {t(`profile.benefit${i}`)}
              </Text>
            ))}
            <Button compact title={t('profile.unlockPlus')} onPress={unlockPlus} style={styles.premBtn} />
          </View>
        ) : (
          <View style={[styles.plusOn, shadows.card]}>
            <Text style={[typography.subheading, styles.premOnTxt]}>{t('profile.plusStar')}</Text>
            {state.userProfile.plusSince && isValid(parseISO(state.userProfile.plusSince)) ? (
              <Text style={[typography.caption, styles.premSince]}>
                {t('profile.plusSince', {
                  date: format(parseISO(state.userProfile.plusSince), 'MMMM d, yyyy', {
                    locale: dateLocale,
                  }),
                })}
              </Text>
            ) : null}
          </View>
        )}

        <Text style={[typography.heading, styles.section]}>{t('profile.settings')}</Text>
        <Pressable
          style={[styles.row, styles.cardRow, !plus && styles.rowLocked]}
          onPress={() => {
            if (plus) router.push('/modals/backup-restore');
            else router.push('/modals/paywall');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.backupRestore')}
        >
          <Text style={[typography.body, styles.rowLbl]}>
            <FontAwesome6 name="cloud-arrow-up" size={16} color={colors.textPrimary} /> {t('profile.backupRestore')}
          </Text>
          <View style={styles.rowRight}>
            {!plus ? <PlusBadge compact /> : null}
            <Text style={[typography.caption, styles.chev]}>›</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.row, styles.cardRow]}
          onPress={() => router.push('/modals/customization')}
        >
          <Text style={[typography.body, styles.rowLbl]}><FontAwesome6 name="palette" size={16} color={colors.textPrimary} /> {t('profile.customization')}</Text>
          <Text style={[typography.caption, styles.chev]}>›</Text>
        </Pressable>
        <Pressable
          style={[styles.row, styles.cardRow]}
          onPress={() => router.push('/modals/language')}
        >
          <Text style={[typography.body, styles.rowLbl]}><FontAwesome6 name="language" size={16} color={colors.textPrimary} /> {t('profile.language')}</Text>
          <Text style={[typography.caption, styles.chev]}>›</Text>
        </Pressable>
        <View style={[styles.row, styles.cardRow]}>
          <Text style={[typography.body, styles.rowLbl]}><FontAwesome6 name="bell" size={16} color={colors.textPrimary} /> {t('profile.notifications')}</Text>
          <ThemedSwitch
            value={state.masterNotificationsEnabled}
            onValueChange={(v) => dispatch({ type: ActionTypes.SET_MASTER_NOTIFICATIONS, payload: v })}
          />
        </View>
        <Text style={[typography.bodySmall, styles.localDataDisclaimer]}>
          {t('profile.localDataDisclaimer')}
        </Text>

        <Text style={[typography.heading, styles.section]}>{t('profile.about')}</Text>
        <View style={[styles.aboutCard, shadows.card]}>
          <Pressable onPress={onVersionTap} accessibilityRole="button" accessibilityLabel={t('common.version', { v: version })}>
            <Text style={[typography.subheading, styles.aboutTitle]}>Fajr · v{version}</Text>
          </Pressable>
          <Text style={[typography.bodySmall, styles.aboutTxt]}>{t('profile.aboutCardBody')}</Text>
          <Pressable
            onPress={() => void Linking.openURL('https://abdirashidexe.github.io/m-habits-3/')}
            style={styles.aboutRow}
            accessibilityRole="button"
            accessibilityLabel={t('profile.privacyLink')}
          >
            <Text style={[typography.body, styles.aboutRowTxt]}>{t('profile.privacyLink')}</Text>
            <Text style={[typography.caption, styles.chev]}>›</Text>
          </Pressable>
          <View style={styles.aboutRow}>
            <Text style={[typography.body, styles.aboutRowTxt]}>{t('profile.attribution')}</Text>
            <View style={{ width: 20 }} />
          </View>
        </View>

        <Pressable style={[styles.row, styles.cardRow, { marginTop: spacing.xl }]} onPress={resetData}>
          <Text style={[typography.body, styles.danger]}>{t('profile.resetAll')}</Text>
        </Pressable>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

    </View>
    <ThemedMessageModal dialog={dialog} onDismiss={() => setDialog(null)} />
    </>
  );
}

function makeStyles({ colors, radii, spacing }) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    titleBlock: {
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      color: colors.textPrimary,
      textAlign: 'center',
      width: '100%',
      marginBottom: 0,
    },
    hero: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    avatarTxt: {
      color: colors.primary,
      marginBottom: 0,
      lineHeight: 28,
    },
    nameBlock: {
      width: '100%',
      minHeight: 76,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      color: colors.textPrimary,
      textAlign: 'center',
    },
    tapHint: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 2,
    },
    nameEdit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      width: '100%',
    },
    nameInput: {
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 200,
      backgroundColor: colors.surface,
    },
    saveName: {
      padding: spacing.sm,
    },
    saveNameTxt: {
      color: colors.primary,
      fontWeight: '700',
    },
    meta: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    plusCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.plusGold,
      marginBottom: spacing.lg,
    },
    premTitle: {
      color: colors.textPrimary,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    benefit: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 20,
    },
    premBtn: {
      marginTop: spacing.md,
    },
    plusOn: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.plusGold,
      marginBottom: spacing.lg,
    },
    premOnTxt: {
      color: colors.plusGold,
    },
    premSince: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
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
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    chev: {
      color: colors.textMuted,
      fontSize: 22,
    },
    rowLocked: {
      opacity: 0.6,
    },
    danger: {
      color: colors.danger,
      fontWeight: '600',
    },
    localDataDisclaimer: {
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      textAlign: 'center',
      lineHeight: 20,
    },
    aboutCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    aboutTitle: {
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    aboutTxt: {
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    aboutRowTxt: {
      color: colors.textPrimary,
      flex: 1,
    },
  });
}

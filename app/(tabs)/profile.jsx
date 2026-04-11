import { format, isValid, parseISO } from 'date-fns';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Easing,
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
  const nameOpacity = useRef(new Animated.Value(1)).current;
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

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
  const darkMode = Boolean(state.userProfile.darkMode);
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

  const onVersionPress = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 900);
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      router.push('/modals/dev-tools');
    }
  };

  const unlockPlus = () => {
    router.push('/modals/paywall');
  };

  const reminderDefaults = () => {
    Alert.alert(t('profile.reminderDefaultsTitle'), t('profile.reminderDefaultsMsg'), [
      { text: t('common.ok') },
    ]);
  };

  const privacy = () => {
    Alert.alert(t('profile.privacyTitle'), t('profile.privacyMsg'), [{ text: t('common.ok') }]);
  };

  const resetData = () => {
    Alert.alert(t('profile.resetTitle'), t('profile.resetMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.resetContinue'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('profile.resetSureTitle'), t('profile.resetSureMsg'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('profile.eraseAll'),
              style: 'destructive',
              onPress: async () => {
                  await cancelAllLocalNotifications();
                  await storage.clearAllFajrKeys();
                  dispatch({ type: ActionTypes.RESET_ALL });
                  router.replace('/onboarding');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
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
        <View style={[styles.row, styles.cardRow]}>
          <Text style={[typography.body, styles.rowLbl]}><FontAwesome6 name="moon" size={16} color={colors.textPrimary} /> {t('profile.darkMode')}</Text>
          <ThemedSwitch
            value={darkMode}
            onValueChange={(v) => dispatch({ type: ActionTypes.SET_DARK_MODE, payload: v })}
          />
        </View>
        <Pressable
          style={[styles.row, styles.cardRow]}
          onPress={() => router.push('/modals/app-colors')}
        >
          <Text style={[typography.body, styles.rowLbl]}><FontAwesome6 name="palette" size={16} color={colors.textPrimary} /> {t('profile.appColors')}</Text>
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
        <Pressable style={[styles.row, styles.cardRow]} onPress={reminderDefaults}>
          <Text style={[typography.body, styles.rowLbl]}>{t('profile.reminderDefaults')}</Text>
          <Text style={[typography.caption, styles.chev]}>›</Text>
        </Pressable>
        <Pressable style={[styles.row, styles.cardRow]} onPress={resetData}>
          <Text style={[typography.body, styles.danger]}>{t('profile.resetAll')}</Text>
        </Pressable>

        <Text style={[typography.heading, styles.section]}>{t('profile.about')}</Text>
        <View style={[styles.about, shadows.card]}>
          <Pressable onPress={onVersionPress}>
            <Text style={[typography.caption, styles.ver]}>{t('common.version', { v: version })}</Text>
          </Pressable>
          <Text style={[typography.bodySmall, styles.aboutTxt]}>{t('profile.aboutBody')}</Text>
          <Pressable onPress={privacy}>
            <Text style={[typography.caption, styles.link]}>{t('profile.privacyLink')}</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

    </View>
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
    chev: {
      color: colors.textMuted,
      fontSize: 22,
    },
    danger: {
      color: colors.danger,
      fontWeight: '600',
    },
    about: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    ver: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    aboutTxt: {
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });
}

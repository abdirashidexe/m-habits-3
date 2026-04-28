import * as DocumentPicker from 'expo-document-picker';
import {
  cacheDirectory,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { ActionTypes, useApp } from '../../context/AppContext';
import { useFajrTheme } from '../../hooks/useFajrTheme';
import * as storage from '../../utils/storage';

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {any} parsed
 * @returns {null | { habits: any[], habitLogs: any[], userProfile: any, onboarded: boolean, masterNotificationsEnabled: boolean, installDate: string | null }}
 */
function parseBackupFile(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.fajrBackup !== true) return null;
  const data = parsed.data;
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.habits)) return null;
  return {
    habits: Array.isArray(data.habits) ? data.habits : [],
    habitLogs: Array.isArray(data.habitLogs) ? data.habitLogs : [],
    userProfile: data.userProfile ?? null,
    onboarded: data.onboarded === true || data.onboarded === 'true',
    masterNotificationsEnabled: data.masterNotificationsEnabled !== false && data.masterNotificationsEnabled !== 'false',
    installDate: typeof data.installDate === 'string' ? data.installDate : null,
  };
}

export default function BackupRestoreModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dispatch } = useApp();
  const { colors, typography, spacing, radii, shadows } = useFajrTheme();
  const styles = useMemo(() => makeStyles({ colors, spacing, radii }), [colors, spacing, radii]);
  const [busy, setBusy] = useState(false);

  const close = () => router.back();

  const backUp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const [habits, habitLogs, userProfile, onboardedRaw, masterRaw, installDate] = await Promise.all([
        storage.readJson(storage.KEYS.habits, []),
        storage.readJson(storage.KEYS.habitLogs, []),
        storage.readJson(storage.KEYS.userProfile, null),
        storage.readJson(storage.KEYS.onboarded, 'false'),
        storage.readJson(storage.KEYS.masterNotifications, 'true'),
        storage.readJson(storage.KEYS.installDate, null),
      ]);

      const payload = {
        fajrBackup: true,
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          habits,
          habitLogs,
          userProfile,
          onboarded: onboardedRaw === 'true',
          masterNotificationsEnabled: masterRaw !== 'false',
          installDate,
        },
      };

      const filename = `fajr-backup-${ymd(new Date())}.json`;
      const path = `${cacheDirectory}${filename}`;
      await writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
        encoding: EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path);
      } else {
        Alert.alert(t('common.ok'), `${t('backupRestore.savedAt')}\n\n${path}`);
      }
    } catch (e) {
      Alert.alert(t('backupRestore.backupFailed'), e?.message || t('backupRestore.backupFailedMsg'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) {
        setBusy(false);
        return;
      }
      const file = res.assets?.[0];
      const uri = file?.uri;
      if (!uri) {
        Alert.alert(t('backupRestore.invalid'), t('backupRestore.invalidMsg'));
        return;
      }
      const raw = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      const restored = parseBackupFile(parsed);
      if (!restored) {
        Alert.alert(t('backupRestore.notFajr'), t('backupRestore.notFajrMsg'));
        return;
      }

      Alert.alert(
        t('backupRestore.confirmTitle'),
        t('backupRestore.confirmMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backupRestore.confirmContinue'),
            style: 'destructive',
            onPress: async () => {
              await Promise.all([
                storage.writeJson(storage.KEYS.habits, restored.habits),
                storage.writeJson(storage.KEYS.habitLogs, restored.habitLogs),
                storage.writeJson(storage.KEYS.userProfile, restored.userProfile),
                storage.writeJson(storage.KEYS.onboarded, restored.onboarded ? 'true' : 'false'),
                storage.writeJson(
                  storage.KEYS.masterNotifications,
                  restored.masterNotificationsEnabled ? 'true' : 'false'
                ),
                storage.writeJson(storage.KEYS.installDate, restored.installDate),
              ]);

              dispatch({
                type: ActionTypes.HYDRATE,
                payload: {
                  habits: restored.habits,
                  habitLogs: restored.habitLogs,
                  userProfile: restored.userProfile,
                  onboarded: restored.onboarded,
                  masterNotificationsEnabled: restored.masterNotificationsEnabled,
                  installDate: restored.installDate,
                },
              });

              Alert.alert(t('backupRestore.restoredTitle'), t('backupRestore.restoredMsg'), [
                { text: t('common.ok') },
              ]);
            },
          },
        ],
        { cancelable: true }
      );
    } catch (e) {
      Alert.alert(t('backupRestore.restoreFailed'), e?.message || t('backupRestore.restoreFailedMsg'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <Text style={[typography.subheading, styles.title]}>{t('backupRestore.title')}</Text>
        <Pressable onPress={close} style={styles.closeBtn} hitSlop={8} accessibilityLabel={t('common.close')}>
          <Text style={[typography.heading, styles.closeTxt]}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadows.card]}>
          <Text style={[typography.heading, styles.sectionTitle]}>{t('backupRestore.backupTitle')}</Text>
          <Text style={[typography.bodySmall, styles.sectionHelp]}>{t('backupRestore.backupHelp')}</Text>
          <Button title={t('backupRestore.backupBtn')} onPress={backUp} disabled={busy} />
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[typography.caption, styles.busyTxt]}>{t('backupRestore.working')}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={[typography.heading, styles.sectionTitle]}>{t('backupRestore.restoreTitle')}</Text>
          <Text style={[typography.bodySmall, styles.sectionHelp]}>{t('backupRestore.restoreHelp')}</Text>
          <Button title={t('backupRestore.restoreBtn')} variant="secondary" onPress={restore} disabled={busy} />
        </View>
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
    closeTxt: {
      color: colors.textSecondary,
      marginBottom: 0,
      lineHeight: 28,
    },
    content: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    sectionTitle: {
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    sectionHelp: {
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    busyRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    busyTxt: {
      color: colors.textMuted,
    },
  });
}


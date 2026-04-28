import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '../i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * @typedef {{ id: string, name: string, frequency: string, specificDays: number[], reminderEnabled: boolean, reminderTime: string | null }} Habit
 */

/**
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Map 0=Sun..6=Sat to Expo weekday 1=Sun..7=Sat
 * @param {number} dayIndex
 * @returns {number}
 */
function toExpoWeekday(dayIndex) {
  return dayIndex + 1;
}

/**
 * @param {string} timeStr HH:MM
 * @returns {{ hour: number, minute: number } | null}
 */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * @param {Habit} habit
 * @returns {Promise<void>}
 */
export async function scheduleHabitReminder(habit) {
  try {
    await cancelHabitReminder(habit.id);
    if (!habit.reminderEnabled || !habit.reminderTime) return;

    const t = parseTime(habit.reminderTime);
    if (!t) return;

    const title = habit.name;
    const body = i18n.t('notifications.reminderBody');

    const content = { title, body };

    if (habit.frequency === 'daily') {
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: Platform.OS === 'android' ? 'fajr-default' : undefined,
        hour: t.hour,
        minute: t.minute,
      };
      await Notifications.scheduleNotificationAsync({
        identifier: habit.id,
        content,
        trigger,
      });
      if (__DEV__) {
        console.log('[Notifications] scheduled:', habit.name, 'trigger:', JSON.stringify(trigger));
      }
      return;
    }

    const days = Array.isArray(habit.specificDays) ? habit.specificDays : [];
    for (const d of days) {
      const id = `${habit.id}_${d}`;
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: Platform.OS === 'android' ? 'fajr-default' : undefined,
        weekday: toExpoWeekday(d),
        hour: t.hour,
        minute: t.minute,
      };
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger,
      });
      if (__DEV__) {
        console.log('[Notifications] scheduled:', habit.name, 'trigger:', JSON.stringify(trigger));
      }
    }
  } catch {
    // OS scheduler / permissions edge cases — do not break app startup or sync loops.
  }
}

/**
 * @param {string} habitId
 * @returns {Promise<void>}
 */
export async function cancelHabitReminder(habitId) {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const id = n.identifier;
      if (id === habitId || id.startsWith(`${habitId}_`)) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
  } catch {
    // Best-effort cancel.
  }
}

/**
 * @param {Habit[]} habits
 * @returns {Promise<void>}
 */
export async function rescheduleAllHabitReminders(habits) {
  for (const h of habits) {
    await scheduleHabitReminder(h);
  }
}

/**
 * @returns {Promise<void>}
 */
export async function cancelAllLocalNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Best-effort when notifications module unavailable.
  }
}

/**
 * Ensure Android channel exists.
 * @returns {Promise<void>}
 */
export async function setupAndroidNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('fajr-default', {
        name: i18n.t('notifications.channelName'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch {
      // Channel setup is best-effort during cold start.
    }
  }
}

/**
 * Cancel one scheduled notification by identifier.
 * @param {string} identifier
 * @returns {Promise<void>}
 */
export async function cancelScheduledNotification(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Best-effort cancel.
  }
}

/**
 * @returns {Promise<void>}
 */
export async function cancelDailySmartNotifications() {
  await cancelScheduledNotification('daily-morning-check');
  await cancelScheduledNotification('daily-evening-check');
}

/**
 * @returns {Promise<void>}
 */
export async function scheduleDailySmartNotifications() {
  await cancelDailySmartNotifications();
  try {
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: Platform.OS === 'android' ? 'fajr-default' : undefined,
      hour: 7,
      minute: 0,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-morning-check',
      content: {
        title: i18n.t('notifications.morningTitle'),
        body: i18n.t('notifications.morningBody'),
      },
      trigger,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[Notifications] morning schedule failed', e?.message ?? e);
    }
  }

  try {
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: Platform.OS === 'android' ? 'fajr-default' : undefined,
      hour: 21,
      minute: 0,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-evening-check',
      content: {
        title: i18n.t('notifications.eveningTitle'),
        body: i18n.t('notifications.eveningBody'),
      },
      trigger,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[Notifications] evening schedule failed', e?.message ?? e);
    }
  }
}

/**
 * @returns {Promise<void>}
 */
export async function scheduleWeeklyReportNotification() {
  try {
    await cancelScheduledNotification('weekly-report-sunday');
  } catch {
    // best-effort cancel
  }
  try {
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      channelId: Platform.OS === 'android' ? 'fajr-default' : undefined,
      weekday: 1, // Sunday (Expo: 1=Sun..7=Sat)
      hour: 8,
      minute: 0,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-report-sunday',
      content: {
        title: i18n.t('notifications.weeklyReportTitle'),
        body: i18n.t('notifications.weeklyReportBody'),
      },
      trigger,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[Notifications] weekly report schedule failed', e?.message ?? e);
    }
  }
}

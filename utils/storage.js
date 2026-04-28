import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  habits: 'fajr_habits',
  habitLogs: 'fajr_habit_logs',
  userProfile: 'fajr_user_profile',
  onboarded: 'fajr_onboarded',
  masterNotifications: 'fajr_master_notifications',
  installDate: 'fajr_install_date',
  devDate: 'fajr_dev_date',
};

/**
 * @template T
 * @param {string} key
 * @param {T} defaultValue
 * @returns {Promise<T>}
 */
export async function readJson(key, defaultValue) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Disk full, permission, or native bridge failure — avoid crashing the app.
  }
}

/**
 * @returns {Promise<void>}
 */
export async function clearAllFajrKeys() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {
    // Best-effort clear; callers may retry or continue reset flow.
  }
}

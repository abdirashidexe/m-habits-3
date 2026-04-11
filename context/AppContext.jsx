import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  appReducer,
  initialState,
  ActionTypes,
  defaultUserProfile,
} from './AppReducer';
import * as storage from '../utils/storage';
import { LANGUAGE_IDS } from '../constants/languages';
import { COLOR_THEME_IDS } from '../theme';
import i18n from '../i18n';
import { syncRtlForLanguage } from '../utils/rtl';
import { setDevDateOverride } from '../utils/now';
import {
  cancelHabitReminder,
  requestNotificationPermissions,
  rescheduleAllHabitReminders,
  setupAndroidNotificationChannel,
  cancelAllLocalNotifications,
} from '../utils/notifications';

/**
 * @param {unknown} h
 * @returns {import('./AppReducer').Habit}
 */
function migrateHabitFromStorage(h) {
  if (!h || typeof h !== 'object') return /** @type {import('./AppReducer').Habit} */ (h);
  const out = { ...h };
  if ('isPremium' in out && !('isPlus' in out)) {
    out.isPlus = Boolean(out.isPremium);
    delete out.isPremium;
  }
  return /** @type {import('./AppReducer').Habit} */ (out);
}

/**
 * @param {unknown} p
 * @returns {import('./AppReducer').UserProfile}
 */
function normalizeUserProfile(p) {
  const raw = p && typeof p === 'object' ? { ...p } : {};
  if ('isPremium' in raw && !('isPlus' in raw)) {
    raw.isPlus = Boolean(raw.isPremium);
    delete raw.isPremium;
  }
  if ('premiumSince' in raw && !('plusSince' in raw)) {
    raw.plusSince = raw.premiumSince;
    delete raw.premiumSince;
  }
  const merged = { ...defaultUserProfile, ...raw };
  merged.colorTheme = COLOR_THEME_IDS.includes(merged.colorTheme)
    ? merged.colorTheme
    : defaultUserProfile.colorTheme;
  merged.language = LANGUAGE_IDS.includes(merged.language)
    ? merged.language
    : defaultUserProfile.language;
  return merged;
}

/** @type {React.Context<null | ReturnType<typeof buildContextValue>>} */
const AppContext = createContext(null);

function buildContextValue(state, dispatch) {
  return { state, dispatch };
}

/**
 * @returns {{ state: import('./AppReducer').AppState, dispatch: React.Dispatch<any> }}
 */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function FajrI18nSync() {
  const { state } = useApp();
  const prevLangRef = useRef(null);

  useEffect(() => {
    if (!state.hydrated) return;
    const lang = state.userProfile.language || 'en';
    void i18n.changeLanguage(lang);
    syncRtlForLanguage(lang);
  }, [state.hydrated, state.userProfile.language]);

  useEffect(() => {
    if (!state.hydrated) return;
    const lang = state.userProfile.language || 'en';
    if (prevLangRef.current !== null && prevLangRef.current !== lang) {
      void rescheduleAllHabitReminders(state.habits.filter((h) => h.type === 'custom'));
    }
    prevLangRef.current = lang;
  }, [state.hydrated, state.userProfile.language, state.habits]);

  return null;
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [habits, habitLogs, userProfileRaw, onboardedRaw, masterRaw, devDateRaw] =
        await Promise.all([
          storage.readJson(storage.KEYS.habits, []),
          storage.readJson(storage.KEYS.habitLogs, []),
          storage.readJson(storage.KEYS.userProfile, null),
          storage.readJson(storage.KEYS.onboarded, 'false'),
          storage.readJson(storage.KEYS.masterNotifications, 'true'),
          storage.readJson(storage.KEYS.devDate, null),
        ]);
      if (cancelled) return;
      const userProfile = normalizeUserProfile(userProfileRaw);
      const habitsNorm = Array.isArray(habits) ? habits.map(migrateHabitFromStorage) : [];
      const devDateOverride = typeof devDateRaw === 'string' ? devDateRaw : null;
      setDevDateOverride(devDateOverride);
      dispatch({
        type: ActionTypes.HYDRATE,
        payload: {
          habits: habitsNorm,
          habitLogs,
          userProfile,
          onboarded: onboardedRaw === 'true',
          masterNotificationsEnabled: masterRaw !== 'false',
          devDateOverride,
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    storage.writeJson(storage.KEYS.habits, state.habits);
  }, [state.habits, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    storage.writeJson(storage.KEYS.habitLogs, state.habitLogs);
  }, [state.habitLogs, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    storage.writeJson(storage.KEYS.userProfile, state.userProfile);
  }, [state.userProfile, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    storage.writeJson(storage.KEYS.onboarded, state.onboarded ? 'true' : 'false');
  }, [state.onboarded, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    storage.writeJson(
      storage.KEYS.masterNotifications,
      state.masterNotificationsEnabled ? 'true' : 'false'
    );
  }, [state.masterNotificationsEnabled, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    setDevDateOverride(state.devDateOverride);
    storage.writeJson(storage.KEYS.devDate, state.devDateOverride);
  }, [state.devDateOverride, state.hydrated]);

  const syncReminders = useCallback(async () => {
    await setupAndroidNotificationChannel();
    if (!state.masterNotificationsEnabled || !state.onboarded) {
      await cancelAllLocalNotifications();
      return;
    }
    await rescheduleAllHabitReminders(state.habits);
  }, [state.habits, state.masterNotificationsEnabled, state.onboarded]);

  useEffect(() => {
    if (!state.hydrated) return;
    syncReminders();
  }, [state.hydrated, syncReminders]);

  const value = useMemo(() => buildContextValue(state, dispatch), [state]);

  return (
    <AppContext.Provider value={value}>
      <FajrI18nSync />
      {children}
    </AppContext.Provider>
  );
}

/**
 * Call after onboarding completes.
 * @returns {Promise<void>}
 */
export async function runPostOnboardingNotificationSetup() {
  await setupAndroidNotificationChannel();
  await requestNotificationPermissions();
}

export { ActionTypes, cancelHabitReminder };

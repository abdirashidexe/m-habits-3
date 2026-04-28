import { coerceLanguageId } from '../constants/languages';
import { COLOR_THEME_IDS } from '../theme';
import { nowIso } from '../utils/now';

/**
 * @typedef {Object} Habit
 * @property {string} id
 * @property {string} name
 * @property {'custom'} type
 * @property {'daily' | 'specific_days'} frequency
 * @property {number[]} specificDays
 * @property {boolean} reminderEnabled
 * @property {string | null} reminderTime
 * @property {string} createdAt
 * @property {boolean} isPlus
 */

/**
 * @typedef {Object} HabitLog
 * @property {string} habitId
 * @property {string} date
 * @property {boolean} completed
 * @property {string | null} completedAt
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {boolean} isPlus
 * @property {string | null} plusSince
 * @property {string} joinedAt
 * @property {string} timezone
 * @property {boolean} darkMode
 * @property {'main' | 'pink' | 'blue' | 'red' | 'orange' | 'purple' | 'brown' | 'gray'} colorTheme
 * @property {'en' | 'ar' | 'ur' | 'so' | 'id'} language
 */

/**
 * @typedef {Object} AppState
 * @property {Habit[]} habits
 * @property {HabitLog[]} habitLogs
 * @property {UserProfile} userProfile
 * @property {boolean} onboarded
 * @property {boolean} masterNotificationsEnabled
 * @property {string | null} installDate
 * @property {string | null} devDateOverride
 * @property {boolean} devUiModeActive
 * @property {boolean} hydrated
 */

/** @type {UserProfile} */
export const defaultUserProfile = {
  name: '',
  isPlus: false,
  plusSince: null,
  joinedAt: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  darkMode: false,
  colorTheme: 'main',
  language: 'en',
};

/** @type {AppState} */
export const initialState = {
  habits: [],
  habitLogs: [],
  userProfile: { ...defaultUserProfile },
  onboarded: false,
  masterNotificationsEnabled: true,
  installDate: null,
  devDateOverride: null,
  devUiModeActive: false,
  hydrated: false,
};

export const ActionTypes = {
  HYDRATE: 'HYDRATE',
  SET_ONBOARDED: 'SET_ONBOARDED',
  SET_USER_NAME: 'SET_USER_NAME',
  SET_DARK_MODE: 'SET_DARK_MODE',
  SET_COLOR_THEME: 'SET_COLOR_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_PLUS: 'SET_PLUS',
  SET_MASTER_NOTIFICATIONS: 'SET_MASTER_NOTIFICATIONS',
  SET_INSTALL_DATE: 'SET_INSTALL_DATE',
  SET_DEV_DATE_OVERRIDE: 'SET_DEV_DATE_OVERRIDE',
  SET_DEV_UI_MODE_ACTIVE: 'SET_DEV_UI_MODE_ACTIVE',
  SET_HABITS: 'SET_HABITS',
  ADD_HABIT: 'ADD_HABIT',
  UPDATE_HABIT: 'UPDATE_HABIT',
  DELETE_HABIT: 'DELETE_HABIT',
  SET_HABIT_LOGS: 'SET_HABIT_LOGS',
  TOGGLE_HABIT_LOG: 'TOGGLE_HABIT_LOG',
  RESET_ALL: 'RESET_ALL',
};

/**
 * @param {AppState} state
 * @param {{ type: string, payload?: unknown }} action
 * @returns {AppState}
 */
export function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.HYDRATE: {
      /** @type {Partial<AppState>} */
      const p = action.payload || {};
      return {
        ...state,
        ...p,
        userProfile: p.userProfile
          ? { ...defaultUserProfile, ...p.userProfile }
          : state.userProfile,
        hydrated: true,
      };
    }
    case ActionTypes.SET_ONBOARDED: {
      const ob =
        typeof action.payload === 'object' && action.payload
          ? Boolean(action.payload.onboarded)
          : Boolean(action.payload);
      const iso =
        typeof action.payload === 'object' && action.payload && typeof action.payload.nowIso === 'string'
          ? action.payload.nowIso
          : nowIso();
      return {
        ...state,
        onboarded: ob,
        userProfile:
          ob && !state.userProfile.joinedAt
            ? { ...state.userProfile, joinedAt: iso }
            : state.userProfile,
      };
    }
    case ActionTypes.SET_USER_NAME:
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          name: String(action.payload || ''),
        },
      };
    case ActionTypes.SET_DARK_MODE:
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          darkMode: Boolean(action.payload),
        },
      };
    case ActionTypes.SET_COLOR_THEME: {
      const v = action.payload;
      const colorTheme = COLOR_THEME_IDS.includes(v) ? v : 'main';
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          colorTheme,
        },
      };
    }
    case ActionTypes.SET_LANGUAGE:
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          language: coerceLanguageId(action.payload),
        },
      };
    case ActionTypes.SET_PLUS: {
      const on = Boolean(action.payload);
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          isPlus: on,
          plusSince: on
            ? state.userProfile.plusSince || nowIso()
            : null,
        },
      };
    }
    case ActionTypes.SET_MASTER_NOTIFICATIONS:
      return { ...state, masterNotificationsEnabled: Boolean(action.payload) };
    case ActionTypes.SET_INSTALL_DATE:
      return { ...state, installDate: action.payload ? String(action.payload) : null };
    case ActionTypes.SET_DEV_DATE_OVERRIDE:
      return { ...state, devDateOverride: action.payload ? String(action.payload) : null };
    case ActionTypes.SET_DEV_UI_MODE_ACTIVE:
      return { ...state, devUiModeActive: Boolean(action.payload) };
    case ActionTypes.SET_HABITS:
      return { ...state, habits: Array.isArray(action.payload) ? action.payload : [] };
    case ActionTypes.ADD_HABIT:
      return { ...state, habits: [...state.habits, action.payload] };
    case ActionTypes.UPDATE_HABIT: {
      /** @type {Habit} */
      const h = action.payload;
      return {
        ...state,
        habits: state.habits.map((x) => (x.id === h.id ? h : x)),
      };
    }
    case ActionTypes.DELETE_HABIT:
      return {
        ...state,
        habits: state.habits.filter((x) => x.id !== action.payload),
        // Keep habitLogs to preserve history (deleted habits show as "Deleted habit" in history views)
        habitLogs: state.habitLogs,
      };
    case ActionTypes.SET_HABIT_LOGS:
      return { ...state, habitLogs: Array.isArray(action.payload) ? action.payload : [] };
    case ActionTypes.TOGGLE_HABIT_LOG: {
      /** @type {{ habitId: string, date: string, completed: boolean, nowIso?: string }} */
      const { habitId, date, completed, nowIso: isoRaw } = action.payload;
      const iso = typeof isoRaw === 'string' ? isoRaw : nowIso();
      const idx = state.habitLogs.findIndex((l) => l.habitId === habitId && l.date === date);
      const next = [...state.habitLogs];
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          completed,
          completedAt: completed ? iso : null,
        };
      } else {
        next.push({
          habitId,
          date,
          completed,
          completedAt: completed ? iso : null,
        });
      }
      return { ...state, habitLogs: next };
    }
    case ActionTypes.RESET_ALL:
      return {
        ...initialState,
        userProfile: {
          ...defaultUserProfile,
        },
        hydrated: true,
      };
    default:
      return state;
  }
}

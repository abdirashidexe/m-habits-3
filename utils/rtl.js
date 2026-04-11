import { I18nManager, Platform } from 'react-native';

const RTL_LANGS = new Set(['ar', 'ur']);

/**
 * Apply RTL for Arabic and Urdu.
 * Do not call DevSettings.reload() here: on Expo Go, isRTL often stays false until a full
 * native restart, so reload → effect runs again → infinite reload and crash.
 * forceRTL takes effect on the next cold start; in-session layout may stay LTR until then.
 * @param {string} lang
 */
export function syncRtlForLanguage(lang) {
  if (Platform.OS === 'web') return;
  const wantRtl = RTL_LANGS.has(lang);
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === wantRtl) return;
  I18nManager.forceRTL(wantRtl);
}

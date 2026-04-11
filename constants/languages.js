/** @typedef {'en' | 'ar' | 'ur' | 'so' | 'id'} LanguageId */

/** @type {readonly LanguageId[]} */
export const LANGUAGE_IDS = ['en', 'ar', 'ur', 'so', 'id'];

/** @type {{ id: LanguageId; native: string; iconName: string }[]} */
export const LANGUAGES = [
  { id: 'en', native: 'English', iconName: 'united-states-of-america' },
  { id: 'ar', native: 'العربية', iconName: 'saudi-arabia' },
  { id: 'ur', native: 'اردو', iconName: 'pakistan' },
  { id: 'so', native: 'Soomaali', iconName: 'somalia' },
  { id: 'id', native: 'Bahasa Indonesia', iconName: 'indonesia' },
];

/**
 * @param {unknown} id
 * @returns {LanguageId}
 */
export function coerceLanguageId(id) {
  return LANGUAGE_IDS.includes(id) ? id : 'en';
}

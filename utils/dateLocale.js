import { ar, enUS, id, ur } from 'date-fns/locale';

/**
 * @param {string} lang en | ar | ur | so | id
 */
export function getDateFnsLocale(lang) {
  switch (lang) {
    case 'ar':
      return ar;
    case 'ur':
      return ur;
    case 'id':
      return id;
    case 'so':
    case 'en':
    default:
      return enUS;
  }
}

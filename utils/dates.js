import {
  format,
  isToday as dfnsIsToday,
  isYesterday as dfnsIsYesterday,
  startOfDay,
  addDays,
  getDay,
  parseISO,
  isValid,
} from 'date-fns';

/**
 * @param {Date | string} date
 * @returns {boolean}
 */
export function isToday(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) && dfnsIsToday(d);
}

/**
 * @param {Date | string} date
 * @returns {boolean}
 */
export function isYesterday(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) && dfnsIsYesterday(d);
}

/**
 * @param {Date} date
 * @returns {string} YYYY-MM-DD in local calendar
 */
export function toLocalDateString(date) {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

/**
 * @param {Date | string} date
 * @returns {string}
 */
/**
 * @param {Date | string} date
 * @param {import('date-fns').Locale} [locale]
 */
export function formatDateDisplay(date, locale) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'EEEE, MMMM d, yyyy', locale ? { locale } : undefined);
}

/**
 * @param {Date | string} date
 * @returns {number} 0 = Sunday ... 6 = Saturday
 */
export function getDayIndex(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return getDay(d);
}

/**
 * @param {Date} date
 * @returns {number} 1-366 day of year
 */
export function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = startOfDay(date).getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const HIJRI_MONTH_NAMES = [
  'Muharram',
  'Safar',
  "Rabi' al-awwal",
  "Rabi' al-thani",
  'Jumada al-awwal',
  'Jumada al-thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

/**
 * Pure JS approximate conversion from Gregorian date to Hijri (tabular / astronomical).
 * Suitable for display; may differ by ±1 day from official moon sighting calendars.
 * @param {Date} gDate
 * @returns {{ year: number, month: number, day: number, monthName: string }}
 */
export function gregorianToHijri(gDate) {
  const y = gDate.getFullYear();
  const m = gDate.getMonth() + 1;
  const d = gDate.getDate();

  const jd =
    Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    d -
    32075;

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  let l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  l2 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const m2 = Math.floor((24 * l2) / 709);
  const d2 = l2 - Math.floor((709 * m2) / 24);
  const y2 = 30 * n + j - 30;

  const monthIndex = Math.min(Math.max(m2 - 1, 0), 11);
  return {
    year: y2,
    month: m2,
    day: d2,
    monthName: HIJRI_MONTH_NAMES[monthIndex],
  };
}

/**
 * @param {Date} date
 * @param {(key: string, opts?: object) => string} t i18n translate
 */
export function formatHijriDisplay(date, t) {
  const h = gregorianToHijri(date);
  const month = t(`hijriMonths.${h.month}`);
  return t('dates.hijri', {
    day: h.day,
    month,
    year: h.year,
    ah: t('dates.ah'),
  });
}

/**
 * @param {string} ymd
 * @returns {Date}
 */
export function parseYmd(ymd) {
  const [yy, mm, dd] = ymd.split('-').map(Number);
  return new Date(yy, mm - 1, dd);
}

/**
 * @param {Date} from
 * @param {Date} to
 * @returns {Date[]}
 */
export function eachDayInclusive(from, to) {
  const out = [];
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

import { parseYmd } from './dates';

let devDateOverride = null;

/**
 * @param {string | null} ymd
 */
export function setDevDateOverride(ymd) {
  devDateOverride = typeof ymd === 'string' && ymd ? ymd : null;
}

/**
 * @returns {string | null}
 */
export function getDevDateOverride() {
  return devDateOverride;
}

/**
 * Centralized \"now\" for the app. When dev date override is set, this replaces `new Date()`.
 * @returns {Date}
 */
export function now() {
  if (devDateOverride) {
    const d = parseYmd(devDateOverride);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return new Date();
}

/**
 * @returns {string} ISO timestamp from `now()`
 */
export function nowIso() {
  return now().toISOString();
}


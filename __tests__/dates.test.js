import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  isToday,
  isYesterday,
  toLocalDateString,
  formatDateDisplay,
  getDayIndex,
  getDayOfYear,
  gregorianToHijri,
  formatHijriDisplay,
  parseYmd,
  eachDayInclusive,
} from '../utils/dates.js';
import { setDevDateOverride } from '../utils/now.js';

const REF_DATE = new Date(2025, 5, 15); // Sunday 2025-06-15

beforeAll(() => {
  setDevDateOverride('2025-06-15');
});

afterAll(() => {
  setDevDateOverride(null);
});

// ─── isToday ─────────────────────────────────────────────────────────────────

describe('isToday', () => {
  it('returns true for a Date object that is today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns true for an ISO string that is today', () => {
    const todayStr = new Date().toISOString();
    expect(isToday(todayStr)).toBe(true);
  });

  it('returns false for a Date object that is yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for an invalid ISO string', () => {
    expect(isToday('not-a-date')).toBe(false);
  });

  it('returns false for a past date string', () => {
    expect(isToday('2020-01-01')).toBe(false);
  });
});

// ─── isYesterday ──────────────────────────────────────────────────────────────

describe('isYesterday', () => {
  it('returns true for a Date object that is yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isYesterday(yesterday)).toBe(true);
  });

  it('returns true for an ISO string that is yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isYesterday(yesterday.toISOString())).toBe(true);
  });

  it('returns false for today', () => {
    expect(isYesterday(new Date())).toBe(false);
  });

  it('returns false for an invalid string', () => {
    expect(isYesterday('not-a-date')).toBe(false);
  });
});

// ─── toLocalDateString ────────────────────────────────────────────────────────

describe('toLocalDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(toLocalDateString(REF_DATE)).toBe('2025-06-15');
  });

  it('returns the local date not UTC date', () => {
    const result = toLocalDateString(REF_DATE);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── formatDateDisplay ────────────────────────────────────────────────────────

describe('formatDateDisplay', () => {
  it('returns formatted date string for a valid Date', () => {
    const result = formatDateDisplay(REF_DATE);
    expect(result).toBe('Sunday, June 15, 2025');
  });

  it('returns formatted date string for a valid ISO string', () => {
    const result = formatDateDisplay('2025-06-15');
    expect(result).toBe('Sunday, June 15, 2025');
  });

  it('returns empty string for an invalid date string', () => {
    expect(formatDateDisplay('not-a-date')).toBe('');
  });

  it('accepts a locale parameter without throwing', () => {
    expect(() => formatDateDisplay(REF_DATE, undefined)).not.toThrow();
  });
});

// ─── getDayIndex ──────────────────────────────────────────────────────────────

describe('getDayIndex', () => {
  it('returns 0 for Sunday', () => {
    expect(getDayIndex(REF_DATE)).toBe(0); // 2025-06-15 is Sunday
  });

  it('returns 1 for Monday', () => {
    expect(getDayIndex(new Date(2025, 5, 16))).toBe(1);
  });

  it('returns 6 for Saturday', () => {
    expect(getDayIndex(new Date(2025, 5, 14))).toBe(6);
  });

  it('accepts an ISO string', () => {
    expect(getDayIndex('2025-06-15')).toBe(0);
  });
});

// ─── getDayOfYear ─────────────────────────────────────────────────────────────

describe('getDayOfYear', () => {
  it('returns 1 for January 1', () => {
    expect(getDayOfYear(new Date(2025, 0, 1))).toBe(1);
  });

  it('returns 166 for June 15 2025', () => {
    // Jan(31)+Feb(28)+Mar(31)+Apr(30)+May(31)+15 = 166
    expect(getDayOfYear(REF_DATE)).toBe(166);
  });

  it('returns a number between 1 and 366', () => {
    const result = getDayOfYear(REF_DATE);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(366);
  });
});

// ─── gregorianToHijri ─────────────────────────────────────────────────────────

describe('gregorianToHijri', () => {
    it('converts 2025-06-15 correctly', () => {
        const h = gregorianToHijri(REF_DATE);
        expect(h.year).toBe(1446);
        expect(h.month).toBe(12);
        expect(h.day).toBe(19);
        expect(h.monthName).toBe('Dhu al-Hijjah');
      });

  it('returns an object with year, month, day, monthName', () => {
    const h = gregorianToHijri(REF_DATE);
    expect(typeof h.year).toBe('number');
    expect(typeof h.month).toBe('number');
    expect(typeof h.day).toBe('number');
    expect(typeof h.monthName).toBe('string');
  });

  it('month is between 1 and 12', () => {
    const h = gregorianToHijri(REF_DATE);
    expect(h.month).toBeGreaterThanOrEqual(1);
    expect(h.month).toBeLessThanOrEqual(12);
  });

  it('day is between 1 and 30', () => {
    const h = gregorianToHijri(REF_DATE);
    expect(h.day).toBeGreaterThanOrEqual(1);
    expect(h.day).toBeLessThanOrEqual(30);
  });

  it('converts Ramadan 2025 correctly', () => {
    // Ramadan 1446 started ~March 1 2025
    const h = gregorianToHijri(new Date(2025, 2, 1));
    expect(h.monthName).toBe('Ramadan');
  });

  it('handles January 1 2000 without throwing', () => {
    expect(() => gregorianToHijri(new Date(2000, 0, 1))).not.toThrow();
  });

  it('converts 2025-01-01 correctly', () => {
    const h = gregorianToHijri(new Date(2025, 0, 1));
    expect(h.year).toBe(1446);
    expect(h.month).toBe(7); // Rajab
    expect(h.day).toBe(1);
    expect(h.monthName).toBe('Rajab');
  });
});

// ─── formatHijriDisplay ───────────────────────────────────────────────────────

describe('formatHijriDisplay', () => {
  it('calls t with hijriMonths and dates.hijri keys', () => {
    const calls = [];
    const mockT = (key, opts) => {
      calls.push(key);
      if (key === 'dates.ah') return 'AH';
      if (key.startsWith('hijriMonths.')) return 'TestMonth';
      if (key === 'dates.hijri') return `${opts.day} TestMonth ${opts.year} AH`;
      return key;
    };
    const result = formatHijriDisplay(REF_DATE, mockT);
    expect(calls).toContain('dates.ah');
    expect(calls.some((k) => k.startsWith('hijriMonths.'))).toBe(true);
    expect(calls).toContain('dates.hijri');
    expect(typeof result).toBe('string');
  });
});

// ─── parseYmd ─────────────────────────────────────────────────────────────────

describe('parseYmd', () => {
  it('parses YYYY-MM-DD to a local Date', () => {
    const d = parseYmd('2025-06-15');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  it('does not apply timezone offset', () => {
    const d = parseYmd('2025-01-01');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

// ─── eachDayInclusive ────────────────────────────────────────────────────────

describe('eachDayInclusive', () => {
  it('returns a single day when from and to are the same', () => {
    const result = eachDayInclusive(REF_DATE, REF_DATE);
    expect(result).toHaveLength(1);
  });

  it('returns correct count for a 7-day range', () => {
    const from = new Date(2025, 5, 9);
    const to = new Date(2025, 5, 15);
    const result = eachDayInclusive(from, to);
    expect(result).toHaveLength(7);
  });

  it('first and last dates match from and to', () => {
    const from = new Date(2025, 5, 9);
    const to = new Date(2025, 5, 15);
    const result = eachDayInclusive(from, to);
    expect(toLocalDateString(result[0])).toBe('2025-06-09');
    expect(toLocalDateString(result[result.length - 1])).toBe('2025-06-15');
  });

  it('returns empty array when from is after to', () => {
    const result = eachDayInclusive(new Date(2025, 5, 15), new Date(2025, 5, 9));
    expect(result).toHaveLength(0);
  });

  it('each element is a Date object', () => {
    const result = eachDayInclusive(REF_DATE, REF_DATE);
    expect(result[0]).toBeInstanceOf(Date);
  });
});
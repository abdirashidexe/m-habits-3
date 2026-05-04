import { describe, it, expect, afterEach } from '@jest/globals';
import { now, nowIso, setDevDateOverride, getDevDateOverride } from '../utils/now.js';

afterEach(() => {
  setDevDateOverride(null);
});

describe('setDevDateOverride / getDevDateOverride', () => {
  it('returns null by default', () => {
    expect(getDevDateOverride()).toBeNull();
  });

  it('returns the override after setting it', () => {
    setDevDateOverride('2025-06-15');
    expect(getDevDateOverride()).toBe('2025-06-15');
  });

  it('clears the override when set to null', () => {
    setDevDateOverride('2025-06-15');
    setDevDateOverride(null);
    expect(getDevDateOverride()).toBeNull();
  });

  it('clears the override when set to an empty string', () => {
    setDevDateOverride('2025-06-15');
    setDevDateOverride('');
    expect(getDevDateOverride()).toBeNull();
  });
});

describe('now', () => {
  it('returns a Date object', () => {
    expect(now()).toBeInstanceOf(Date);
  });

  it('returns the overridden date when override is set', () => {
    setDevDateOverride('2025-06-15');
    const d = now();
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  it('sets time to noon when override is active', () => {
    setDevDateOverride('2025-06-15');
    const d = now();
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('returns current real date when no override is set', () => {
    const before = Date.now();
    const d = now();
    const after = Date.now();
    expect(d.getTime()).toBeGreaterThanOrEqual(before);
    expect(d.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('nowIso', () => {
  it('returns a valid ISO string', () => {
    const iso = nowIso();
    expect(typeof iso).toBe('string');
    expect(new Date(iso).toISOString()).toBe(iso);
  });

  it('returns ISO string matching the override date when set', () => {
    setDevDateOverride('2025-06-15');
    const iso = nowIso();
    expect(iso.startsWith('2025-06-15')).toBe(true);
  });

  it('reflects real time when no override is set', () => {
    const before = new Date().toISOString();
    const iso = nowIso();
    const after = new Date().toISOString();
    expect(iso >= before).toBe(true);
    expect(iso <= after).toBe(true);
  });
});
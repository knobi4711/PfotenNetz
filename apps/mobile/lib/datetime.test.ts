import { describe, expect, it } from 'vitest';
import { formatGermanDateTime, parseGermanDateTime } from './datetime';

describe('parseGermanDateTime', () => {
  it('parses a valid date and time', () => {
    const iso = parseGermanDateTime('01.10.2026', '10:30');
    expect(iso).not.toBeNull();
    const parsed = new Date(iso as string);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(10);
    expect(parsed.getMinutes()).toBe(30);
  });

  it('rejects malformed input', () => {
    expect(parseGermanDateTime('2026-10-01', '10:30')).toBeNull();
    expect(parseGermanDateTime('01.10.2026', '10')).toBeNull();
    expect(parseGermanDateTime('', '')).toBeNull();
  });

  it('rejects impossible dates', () => {
    expect(parseGermanDateTime('31.02.2026', '10:00')).toBeNull();
    expect(parseGermanDateTime('32.01.2026', '10:00')).toBeNull();
    expect(parseGermanDateTime('01.13.2026', '10:00')).toBeNull();
    expect(parseGermanDateTime('01.10.2026', '24:00')).toBeNull();
  });
});

describe('formatGermanDateTime', () => {
  it('round-trips a parsed value', () => {
    const iso = parseGermanDateTime('05.11.2026', '08:05') as string;
    expect(formatGermanDateTime(iso)).toEqual({ date: '05.11.2026', time: '08:05' });
  });

  it('rejects invalid timestamps', () => {
    expect(formatGermanDateTime('not-a-date')).toBeNull();
  });
});

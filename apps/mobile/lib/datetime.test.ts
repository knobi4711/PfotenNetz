import { describe, expect, it } from 'vitest';
import {
  completeTimeInput,
  formatGermanDateTime,
  formatTimeInput,
  parseGermanDateTime,
} from './datetime';

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

describe('formatTimeInput', () => {
  it('turns four typed digits into a time', () => {
    expect(formatTimeInput('0930')).toBe('09:30');
    expect(formatTimeInput('1234')).toBe('12:34');
    expect(formatTimeInput('0000')).toBe('00:00');
  });

  it('keeps the caret behaviour predictable while typing', () => {
    expect(formatTimeInput('')).toBe('');
    expect(formatTimeInput('9')).toBe('9');
    expect(formatTimeInput('09')).toBe('09');
    expect(formatTimeInput('930')).toBe('930');
    expect(formatTimeInput('12345')).toBe('12:34');
  });

  it('leaves manual input with a colon untouched', () => {
    expect(formatTimeInput('9:30')).toBe('9:30');
    expect(formatTimeInput('09:3')).toBe('09:3');
    expect(formatTimeInput('12:345')).toBe('12:34');
  });
});

describe('completeTimeInput', () => {
  it('completes short input on blur', () => {
    expect(completeTimeInput('930')).toBe('09:30');
    expect(completeTimeInput('9:5')).toBe('09:05');
    expect(completeTimeInput('0930')).toBe('09:30');
    expect(completeTimeInput('12:')).toBe('12');
  });

  it('keeps invalid input for the form validation', () => {
    expect(completeTimeInput('')).toBe('');
    expect(completeTimeInput('24:00')).toBe('24:00');
    expect(completeTimeInput('12')).toBe('12');
  });

  it('produces a value the booking form can parse', () => {
    const typed = formatTimeInput('0930');
    expect(parseGermanDateTime('01.10.2026', completeTimeInput(typed))).not.toBeNull();
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

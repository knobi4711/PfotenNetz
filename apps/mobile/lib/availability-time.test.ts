import { describe, expect, it } from 'vitest';
import { clockToPickerDate, pickerDateToClock } from './availability-time';

describe('availability time picker helpers', () => {
  const base = new Date(2026, 10, 6, 12, 34, 56, 789);

  it('converts a clock string into a picker date', () => {
    const date = clockToPickerDate('06:30', base);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(6);
    expect(date.getHours()).toBe(6);
    expect(date.getMinutes()).toBe(30);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('formats a picker date back to HH:MM', () => {
    expect(pickerDateToClock(new Date(2026, 10, 6, 20, 5))).toBe('20:05');
    expect(pickerDateToClock(new Date(2026, 10, 6, 0, 0))).toBe('00:00');
  });

  it('round-trips a regular clock time', () => {
    expect(pickerDateToClock(clockToPickerDate('18:45', base))).toBe('18:45');
  });

  it('clamps 24:00 and invalid values to an editable time', () => {
    expect(pickerDateToClock(clockToPickerDate('24:00', base))).toBe('23:00');
    expect(pickerDateToClock(clockToPickerDate('kaputt', base))).toBe('00:00');
  });
});

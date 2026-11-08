import { describe, expect, it } from 'vitest';
import { formatRadiusKm, formatTimebankHours, formatTimebankHoursMagnitude } from './formatters';

describe('formatTimebankHours', () => {
  it('formats positive balances with a plus sign', () => {
    expect(formatTimebankHours(2)).toBe('+2,0 h');
  });

  it('formats negative balances with a minus sign', () => {
    expect(formatTimebankHours(-2)).toBe('-2,0 h');
  });

  it('formats zero with a plus sign', () => {
    expect(formatTimebankHours(0)).toBe('+0,0 h');
  });
});

describe('formatTimebankHoursMagnitude', () => {
  it('formats positive amounts without a sign', () => {
    expect(formatTimebankHoursMagnitude(2)).toBe('2,0 h');
  });

  it('formats negative amounts without a sign', () => {
    expect(formatTimebankHoursMagnitude(-2)).toBe('2,0 h');
  });

  it('formats zero without a sign', () => {
    expect(formatTimebankHoursMagnitude(0)).toBe('0,0 h');
  });
});

describe('formatRadiusKm', () => {
  it('uses metres below one kilometre', () => {
    expect(formatRadiusKm(0.5)).toBe('500 m');
  });

  it('uses a German decimal comma above one kilometre', () => {
    expect(formatRadiusKm(1.5)).toBe('1,5 km');
    expect(formatRadiusKm(3)).toBe('3 km');
  });

  it('falls back for invalid values', () => {
    expect(formatRadiusKm(Number.NaN)).toBe('–');
  });
});

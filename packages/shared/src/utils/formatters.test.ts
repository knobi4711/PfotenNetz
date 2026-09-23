import { describe, expect, it } from 'vitest';
import { formatTimebankHours, formatTimebankHoursMagnitude } from './formatters';

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

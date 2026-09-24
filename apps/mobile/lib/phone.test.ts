import { describe, expect, it } from 'vitest';
import { phoneUrl } from './phone';

describe('phoneUrl', () => {
  it('normalizes a valid phone number for direct dialing', () => {
    expect(phoneUrl('+49 30 123-456')).toBe('tel:+4930123456');
  });

  it('rejects missing or unsafe values', () => {
    expect(phoneUrl(null)).toBeNull();
    expect(phoneUrl('javascript:alert(1)')).toBeNull();
  });
});

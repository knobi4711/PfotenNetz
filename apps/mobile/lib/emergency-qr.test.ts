import { describe, expect, it } from 'vitest';
import { parseEmergencyCardUrl } from './emergency-qr';

describe('parseEmergencyCardUrl', () => {
  it('accepts a PfotenNetz emergency-card URL', () => {
    expect(parseEmergencyCardUrl('https://pfotennetz.app/emergency/abc12345')).toBe(
      'https://pfotennetz.app/emergency/abc12345'
    );
  });

  it('rejects unrelated hosts, paths and URL modifiers', () => {
    expect(parseEmergencyCardUrl('https://example.com/emergency/abc12345')).toBeNull();
    expect(parseEmergencyCardUrl('https://pfotennetz.app/profile/abc12345')).toBeNull();
    expect(
      parseEmergencyCardUrl('https://pfotennetz.app/emergency/abc12345?redirect=1')
    ).toBeNull();
    expect(parseEmergencyCardUrl('https://pfotennetz.app/emergency/short')).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { PRODUCTION_WEB_URL, webBaseUrl } from './web-url';

const ORIGINAL = process.env.EXPO_PUBLIC_WEB_URL;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.EXPO_PUBLIC_WEB_URL;
  } else {
    process.env.EXPO_PUBLIC_WEB_URL = ORIGINAL;
  }
});

describe('webBaseUrl', () => {
  it('nutzt die konfigurierte URL ohne abschließenden Slash', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://staging.example.org/';
    expect(webBaseUrl()).toBe('https://staging.example.org');
  });

  it('fällt ohne Konfiguration auf die Produktionsdomain zurück', () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    expect(webBaseUrl()).toBe(PRODUCTION_WEB_URL);
  });

  it('behandelt eine leere Konfiguration wie "nicht gesetzt"', () => {
    process.env.EXPO_PUBLIC_WEB_URL = '   ';
    expect(webBaseUrl()).toBe(PRODUCTION_WEB_URL);
  });
});

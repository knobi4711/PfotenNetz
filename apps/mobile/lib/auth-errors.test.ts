import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from './auth-errors';

/** Baut einen Fehler, wie ihn supabase-js aus der Auth-API weitergibt. */
function authError(message: string, code?: string, status?: number) {
  return Object.assign(new Error(message), { code, status });
}

describe('friendlyAuthError', () => {
  it('erklärt das Supabase-E-Mail-Limit statt den englischen Rohtext zu zeigen', () => {
    const message = friendlyAuthError(
      authError('email rate limit exceeded', 'over_email_send_rate_limit', 429),
      'signup'
    );

    expect(message).toContain('zu viele E-Mails');
    expect(message).toContain('Postfach');
    expect(message).not.toContain('rate limit');
  });

  it('erkennt das Limit auch ohne Fehlercode an der Meldung', () => {
    expect(friendlyAuthError(authError('Email rate limit exceeded'), 'signup')).toContain(
      'zu viele E-Mails'
    );
  });

  it('unterscheidet allgemeine Anfrage-Limits von E-Mail-Limits', () => {
    const message = friendlyAuthError(
      authError('Request rate limit reached', 'over_request_rate_limit', 429),
      'signup'
    );

    expect(message).toContain('Zu viele Versuche');
    expect(message).not.toContain('Postfach');
  });

  it('weist auf ein bestehendes Konto hin', () => {
    expect(friendlyAuthError(authError('User already registered'), 'signup')).toContain(
      'besteht bereits ein Konto'
    );
    expect(friendlyAuthError(authError('User exists', 'user_already_exists'), 'signup')).toContain(
      'besteht bereits ein Konto'
    );
  });

  it('erkennt ein zu schwaches Passwort', () => {
    expect(
      friendlyAuthError(
        authError('Password should be at least 8 characters', 'weak_password'),
        'signup'
      )
    ).toContain('Sicherheitsanforderungen');
  });

  it('nennt falsche Zugangsdaten beim Anmelden', () => {
    expect(friendlyAuthError(authError('Invalid login credentials'), 'signin')).toBe(
      'E-Mail oder Passwort ist falsch. Bitte versuche es erneut.'
    );
  });

  it('erinnert an die noch fehlende E-Mail-Bestätigung', () => {
    expect(friendlyAuthError(authError('Email not confirmed'), 'signin')).toContain(
      'noch nicht bestätigt'
    );
  });

  it('meldet fehlende Netzwerkverbindung', () => {
    expect(friendlyAuthError(authError('Failed to fetch'), 'signup')).toContain(
      'Keine Verbindung zum Server'
    );
  });

  it('fällt je Aktion auf eine neutrale deutsche Meldung zurück', () => {
    expect(friendlyAuthError(authError('unexpected_failure'), 'signup')).toBe(
      'Registrierung fehlgeschlagen. Bitte versuche es erneut.'
    );
    expect(friendlyAuthError(null, 'reset')).toBe(
      'Die E-Mail zum Zurücksetzen des Passworts konnte nicht gesendet werden.'
    );
  });
});

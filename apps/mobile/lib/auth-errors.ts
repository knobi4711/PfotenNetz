/**
 * Übersetzt Supabase-Auth-Fehler in kurze deutsche Meldungen.
 *
 * Die Rohtexte der API ("email rate limit exceeded", "Invalid login
 * credentials", ...) sind englisch, technisch und für Nutzer:innen nicht
 * handlungsleitend. Sie werden deshalb nie direkt angezeigt.
 */

export type AuthAction = 'signup' | 'signin' | 'reset';

interface NormalizedAuthError {
  message: string;
  code: string | null;
  status: number | null;
}

const FALLBACK_MESSAGE: Record<AuthAction, string> = {
  signup: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.',
  signin: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
  reset: 'Die E-Mail zum Zurücksetzen des Passworts konnte nicht gesendet werden.',
};

function normalize(error: unknown): NormalizedAuthError {
  if (typeof error === 'string') {
    return { message: error, code: null, status: null };
  }
  if (error instanceof Error) {
    const record = error as Error & { code?: unknown; status?: unknown };
    return {
      message: error.message,
      code: typeof record.code === 'string' ? record.code : null,
      status: typeof record.status === 'number' ? record.status : null,
    };
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    return {
      message: typeof record.message === 'string' ? record.message : '',
      code: typeof record.code === 'string' ? record.code : null,
      status: typeof record.status === 'number' ? record.status : null,
    };
  }
  return { message: String(error ?? ''), code: null, status: null };
}

function messageIncludes(error: NormalizedAuthError, ...needles: string[]): boolean {
  const haystack = error.message.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

/**
 * Supabase drosselt den Versand von Auth-E-Mails pro Projekt (Standard: wenige
 * Mails pro Stunde) und liefert dafür HTTP 429. Nach dem ersten Versand ist die
 * Bestätigungs-Mail häufig schon unterwegs – deshalb der Hinweis aufs Postfach.
 */
function isEmailRateLimit(error: NormalizedAuthError): boolean {
  return (
    error.code === 'over_email_send_rate_limit' ||
    error.status === 429 ||
    messageIncludes(error, 'email rate limit', 'over_email_send_rate_limit')
  );
}

function isRequestRateLimit(error: NormalizedAuthError): boolean {
  return (
    error.code === 'over_request_rate_limit' ||
    messageIncludes(error, 'too many requests', 'request rate limit')
  );
}

export function friendlyAuthError(error: unknown, action: AuthAction): string {
  const normalized = normalize(error);

  if (isRequestRateLimit(normalized)) {
    return 'Zu viele Versuche in kurzer Zeit. Bitte warte einen Moment und versuche es dann erneut.';
  }

  if (isEmailRateLimit(normalized)) {
    return [
      'Es wurden zu viele E-Mails in kurzer Zeit angefordert.',
      'Bitte warte bis zu einer Stunde und versuche es dann erneut.',
      'Falls du bereits eine E-Mail erhalten hast, prüfe bitte dein Postfach (auch den Spam-Ordner).',
    ].join(' ');
  }

  if (
    normalized.code === 'user_already_exists' ||
    normalized.code === 'email_exists' ||
    messageIncludes(
      normalized,
      'already registered',
      'already been registered',
      'user already exists'
    )
  ) {
    return 'Für diese E-Mail-Adresse besteht bereits ein Konto. Melde dich stattdessen an.';
  }

  if (
    normalized.code === 'weak_password' ||
    messageIncludes(normalized, 'password should be', 'password is too short', 'weak password')
  ) {
    return 'Das Passwort erfüllt die Sicherheitsanforderungen noch nicht.';
  }

  if (
    normalized.code === 'email_address_invalid' ||
    messageIncludes(normalized, 'invalid email', 'email address is invalid')
  ) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (normalized.code === 'signup_disabled' || messageIncludes(normalized, 'signups not allowed')) {
    return 'Die Registrierung ist derzeit deaktiviert. Bitte versuche es später erneut.';
  }

  if (
    normalized.code === 'email_not_confirmed' ||
    messageIncludes(normalized, 'email not confirmed')
  ) {
    return 'Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte öffne zuerst den Link in der Bestätigungs-E-Mail.';
  }

  if (
    normalized.code === 'invalid_credentials' ||
    messageIncludes(normalized, 'invalid login credentials')
  ) {
    return 'E-Mail oder Passwort ist falsch. Bitte versuche es erneut.';
  }

  if (normalized.code === 'captcha_failed' || messageIncludes(normalized, 'captcha')) {
    return 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuche es erneut.';
  }

  if (
    messageIncludes(
      normalized,
      'failed to fetch',
      'network request failed',
      'network error',
      'load failed'
    )
  ) {
    return 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.';
  }

  return FALLBACK_MESSAGE[action];
}

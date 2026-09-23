// Helpers to distinguish auth states.
// A missing session (signed out) is a normal state, NOT an error.

/**
 * True when the error only signals "no active session"
 * (e.g. signed out, expired/removed session). Name-based check so UI code
 * does not need to import error classes from the Supabase SDK.
 */
export function isSessionMissingError(error: unknown): boolean {
  if (error === null || error === undefined) return false;
  if (typeof error === 'object' && 'name' in error && error.name === 'AuthSessionMissingError') {
    return true;
  }
  return false;
}

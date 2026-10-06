import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type UserReport = Database['public']['Tables']['user_reports']['Row'];
export type UserReportReason = UserReport['reason'];
export type UserReportStatus = UserReport['status'];

export const USER_REPORT_REASON_LABELS: Record<UserReportReason, string> = {
  fake_profile: 'Fake-Profil / falsche Identität',
  spam: 'Spam oder unerwünschte Werbung',
  harassment: 'Belästigung oder beleidigendes Verhalten',
  other: 'Sonstiger Verstoß',
};

export interface CreateUserReportInput {
  reportedUserId: string;
  reason: UserReportReason;
  details?: string;
}

export interface ModerationUserReport extends UserReport {
  reporter_name: string;
  reported_user_name: string;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Nicht angemeldet.');
  return data.user.id;
}

export function validateUserReport(input: CreateUserReportInput): string | null {
  if (!input.reportedUserId.trim()) return 'Die gemeldete Nutzer-ID fehlt.';
  if (!Object.hasOwn(USER_REPORT_REASON_LABELS, input.reason))
    return 'Bitte wähle einen Meldegrund.';
  if ((input.details?.trim().length ?? 0) > 2000)
    return 'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.';
  return null;
}

export function userReportErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
    return 'Du hast diese Person bereits gemeldet. Die Meldung wird geprüft.';
  return error instanceof Error ? error.message : 'Meldung konnte nicht gesendet werden.';
}

export async function createUserReport(
  client: SupabaseClient<Database>,
  input: CreateUserReportInput
): Promise<UserReport> {
  const validationError = validateUserReport(input);
  if (validationError) throw new Error(validationError);
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('user_reports')
    .insert({
      reporter_id: reporterId,
      reported_user_id: input.reportedUserId,
      reason: input.reason,
      details: input.details?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUserReportModeration(
  client: SupabaseClient<Database>
): Promise<ModerationUserReport[]> {
  const { data, error } = await client
    .from('user_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const reports = data ?? [];
  const ids = [
    ...new Set(reports.flatMap((report) => [report.reporter_id, report.reported_user_id])),
  ];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  if (profileError) throw profileError;
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  return reports.map((report) => ({
    ...report,
    reporter_name: names.get(report.reporter_id) ?? 'Unbekannt',
    reported_user_name: names.get(report.reported_user_id) ?? 'Unbekannt',
  }));
}

export async function updateUserReportStatus(
  client: SupabaseClient<Database>,
  reportId: string,
  status: Exclude<UserReportStatus, 'pending'>
): Promise<UserReport> {
  const reviewerId = await requireUserId(client);
  const { data, error } = await client
    .from('user_reports')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

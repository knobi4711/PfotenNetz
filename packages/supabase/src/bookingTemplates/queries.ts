import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type BookingTemplate = Database['public']['Tables']['booking_templates']['Row'];

export const MAX_BOOKING_TEMPLATE_NAME_LENGTH = 60;
/** Keeps the template picker compact; matches the database array limit. */
export const MAX_BOOKING_TEMPLATE_PETS = 20;

/**
 * Everything a template reuses for a new request. The care period is
 * intentionally missing: it must be chosen for every booking.
 */
export interface SaveBookingTemplateInput {
  name: string;
  petIds: string[];
  type: Database['public']['Enums']['booking_type'];
  careLocation: string;
  currency: Database['public']['Enums']['currency'];
  priceEurCents: number;
  priceKiezHours: number;
  meetingAddress: string | null;
  careNotes: string | null;
  isUrgent: boolean;
  trackingRadiusM: number;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

function trimOrNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function validateBookingTemplateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Bitte gib der Vorlage einen Namen.';
  if (trimmed.length > MAX_BOOKING_TEMPLATE_NAME_LENGTH) {
    return `Der Name darf höchstens ${MAX_BOOKING_TEMPLATE_NAME_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

/** Loads the caller's booking templates, most recently used first (RLS: owner only). */
export async function fetchBookingTemplates(
  client: SupabaseClient<Database>
): Promise<BookingTemplate[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('booking_templates')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Saves the current form values as a named template. Saving under an existing
 * name updates that template, so a user can refresh a template in place.
 */
export async function saveBookingTemplate(
  client: SupabaseClient<Database>,
  input: SaveBookingTemplateInput
): Promise<BookingTemplate> {
  const validationError = validateBookingTemplateName(input.name);
  if (validationError !== null) throw new Error(validationError);
  if (input.petIds.length === 0) {
    throw new Error('Bitte wähle mindestens ein Tier für die Vorlage aus.');
  }
  if (input.petIds.length > MAX_BOOKING_TEMPLATE_PETS) {
    throw new Error(`Eine Vorlage kann höchstens ${MAX_BOOKING_TEMPLATE_PETS} Tiere enthalten.`);
  }

  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('booking_templates')
    .upsert(
      {
        owner_id: userId,
        name: input.name.trim(),
        pet_ids: input.petIds,
        type: input.type,
        care_location: input.careLocation,
        currency: input.currency,
        price_eur_cents: Math.max(0, Math.round(input.priceEurCents)),
        price_kiez_hours: Math.max(0, input.priceKiezHours),
        meeting_address: trimOrNull(input.meetingAddress),
        care_notes: trimOrNull(input.careNotes),
        is_urgent: input.isUrgent,
        tracking_radius_m: input.trackingRadiusM,
      },
      { onConflict: 'owner_id,name' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Deletes one of the caller's own templates. */
export async function deleteBookingTemplate(
  client: SupabaseClient<Database>,
  templateId: string
): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client
    .from('booking_templates')
    .delete()
    .eq('id', templateId)
    .eq('owner_id', userId);

  if (error) throw error;
}

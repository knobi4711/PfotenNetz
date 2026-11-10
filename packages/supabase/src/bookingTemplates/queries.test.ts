import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  deleteBookingTemplate,
  fetchBookingTemplates,
  saveBookingTemplate,
  validateBookingTemplateName,
} from './queries';

interface StubCall {
  table: string;
  method: 'select' | 'upsert' | 'delete';
  values?: unknown;
  options?: unknown;
  filters: string[];
}

function clientWithStubs(stubs: { userId: string | null; result: unknown }) {
  const calls: StubCall[] = [];
  const builder = (table: string) => {
    const filters: string[] = [];
    const chain = {
      select: () => {
        calls.push({ table, method: 'select', filters });
        return chain;
      },
      upsert: (values: unknown, options: unknown) => {
        calls.push({ table, method: 'upsert', values, options, filters });
        return chain;
      },
      delete: () => {
        calls.push({ table, method: 'delete', filters });
        return chain;
      },
      eq: (column: string, value: unknown) => {
        filters.push(`${column}=${String(value)}`);
        return chain;
      },
      order: () => Promise.resolve(stubs.result),
      single: () => Promise.resolve(stubs.result),
      // Makes `await client.from(...).delete().eq(...)` resolve like PostgREST.
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(stubs.result).then(resolve),
    };
    return chain;
  };
  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: stubs.userId === null ? null : { id: stubs.userId } } }),
    },
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

const baseInput = {
  name: '  Gassi am Nachmittag  ',
  petIds: ['pet-1', 'pet-2'],
  type: 'walk' as const,
  careLocation: 'at_owner_home',
  currency: 'KIEZ_HOURS' as const,
  priceEurCents: 0,
  priceKiezHours: 2,
  meetingAddress: '  Ecke Hauptstraße  ',
  careNotes: '   ',
  isUrgent: false,
  trackingRadiusM: 1000,
};

describe('booking template queries', () => {
  it('loads only the caller templates, newest first', async () => {
    const templates = [{ id: 'template-1' }];
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      result: { data: templates, error: null },
    });

    await expect(fetchBookingTemplates(client)).resolves.toEqual(templates);
    expect(calls).toContainEqual({
      table: 'booking_templates',
      method: 'select',
      filters: ['owner_id=user-1'],
    });
  });

  it('rejects template reads without a session', async () => {
    const { client } = clientWithStubs({ userId: null, result: { data: [], error: null } });

    await expect(fetchBookingTemplates(client)).rejects.toThrow('Not authenticated');
  });

  it('saves a template for the caller and normalizes optional fields', async () => {
    const template = { id: 'template-1', name: 'Gassi am Nachmittag' };
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      result: { data: template, error: null },
    });

    const result = await saveBookingTemplate(client, baseInput);

    expect(result).toEqual(template);
    const upsertCall = calls.find((call) => call.method === 'upsert');
    expect(upsertCall?.values).toEqual({
      owner_id: 'user-1',
      name: 'Gassi am Nachmittag',
      pet_ids: ['pet-1', 'pet-2'],
      type: 'walk',
      care_location: 'at_owner_home',
      currency: 'KIEZ_HOURS',
      price_eur_cents: 0,
      price_kiez_hours: 2,
      meeting_address: 'Ecke Hauptstraße',
      care_notes: null,
      is_urgent: false,
      tracking_radius_m: 1000,
    });
    expect(upsertCall?.options).toEqual({ onConflict: 'owner_id,name' });
  });

  it('rejects an empty name and a template without pets', async () => {
    const { client } = clientWithStubs({ userId: 'user-1', result: { data: {}, error: null } });

    await expect(saveBookingTemplate(client, { ...baseInput, name: '   ' })).rejects.toThrow(
      'Bitte gib der Vorlage einen Namen.'
    );
    await expect(saveBookingTemplate(client, { ...baseInput, petIds: [] })).rejects.toThrow(
      'Bitte wähle mindestens ein Tier für die Vorlage aus.'
    );
  });

  it('deletes a template scoped to the caller', async () => {
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      result: { error: null },
    });

    await expect(deleteBookingTemplate(client, 'template-1')).resolves.toBeUndefined();
    expect(calls).toContainEqual({
      table: 'booking_templates',
      method: 'delete',
      filters: ['id=template-1', 'owner_id=user-1'],
    });
  });

  it('validates the template name length', () => {
    expect(validateBookingTemplateName('')).not.toBeNull();
    expect(validateBookingTemplateName('  ')).not.toBeNull();
    expect(validateBookingTemplateName('Gassi')).toBeNull();
    expect(validateBookingTemplateName('x'.repeat(61))).not.toBeNull();
  });
});

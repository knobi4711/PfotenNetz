import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { createCommunityEvent, EVENT_TYPE_LABELS } from './queries';

describe('community smoke flows', () => {
  it('keeps all supported event types human-readable', () => {
    expect(Object.keys(EVENT_TYPE_LABELS)).toHaveLength(6);
    expect(EVENT_TYPE_LABELS.group_walk).toBe('Rudelrunde');
    expect(EVENT_TYPE_LABELS.playdate).toBe('Playdate');
  });

  it('creates a synthetic neighbourhood event for the authenticated organizer', async () => {
    const inserted = {
      id: 'event-demo',
      title: 'Bella trifft Nachbarn',
      type: 'group_walk' as const,
      description: 'Beispieltermin für den Smoke-Test',
      organizer_id: 'person-helper',
      location: 'POINT(13.4 52.5)',
      address: 'Mauerpark',
      starts_at: '2026-10-01T10:00:00.000Z',
      ends_at: null,
      max_participants: 8,
      is_public: true,
      required_trust_level: 'basic',
      created_at: '2026-09-24T10:00:00.000Z',
      updated_at: '2026-09-24T10:00:00.000Z',
    };
    const calls: unknown[] = [];
    const chain = {
      insert: (row: unknown) => {
        calls.push(row);
        return chain;
      },
      select: () => chain,
      single: () => Promise.resolve({ data: inserted, error: null }),
    };
    const client = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: 'person-helper' } }, error: null })
        ),
      },
      from: vi.fn(() => chain),
    } as unknown as SupabaseClient<Database>;

    await expect(
      createCommunityEvent(client, {
        title: inserted.title,
        type: inserted.type,
        description: inserted.description ?? '',
        address: inserted.address ?? '',
        startsAt: inserted.starts_at,
        latitude: 52.5,
        longitude: 13.4,
        maxParticipants: inserted.max_participants ?? undefined,
      })
    ).resolves.toEqual(inserted);
    expect(calls[0]).toMatchObject({ organizer_id: 'person-helper', location: 'POINT(13.4 52.5)' });
  });
});

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { createPet, fetchOwnPets, setPetActive, validateCreatePet } from './queries';

function clientWithStubs(stubs: { userId: string | null; result: unknown }) {
  const calls: { table: string; values?: unknown; filters: string[] }[] = [];
  const builder = (table: string) => {
    const filters: string[] = [];
    const chain = {
      select: () => chain,
      insert: (values: unknown) => {
        calls.push({ table, values, filters });
        return chain;
      },
      update: (values: unknown) => {
        calls.push({ table, values, filters });
        return chain;
      },
      eq: (column: string, value: unknown) => {
        filters.push(`${column}=${String(value)}`);
        return chain;
      },
      order: () => Promise.resolve(stubs.result),
      single: () => Promise.resolve(stubs.result),
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

describe('pets queries', () => {
  it('fetches only the caller pets', async () => {
    const pets = [{ id: 'pet-1' }];
    const { client } = clientWithStubs({
      userId: 'user-1',
      result: { data: pets, error: null },
    });

    await expect(fetchOwnPets(client)).resolves.toEqual(pets);
  });

  it('rejects pet reads without a session', async () => {
    const { client } = clientWithStubs({ userId: null, result: { data: [], error: null } });

    await expect(fetchOwnPets(client)).rejects.toThrow('Not authenticated');
  });

  it('creates a pet for the caller and trims optional fields', async () => {
    const pet = { id: 'pet-1', name: 'Bella' };
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      result: { data: pet, error: null },
    });

    const result = await createPet(client, {
      name: 'Bella',
      species: 'dog',
      breed: '  Labrador  ',
      color: '',
      specialNeeds: null,
    });

    expect(result).toEqual(pet);
    const insertCall = calls.find((call) => call.values !== undefined);
    expect(insertCall?.values).toEqual({
      owner_id: 'user-1',
      name: 'Bella',
      species: 'dog',
      breed: 'Labrador',
      color: null,
      special_needs: null,
    });
  });

  it('validates the pet name before creating', async () => {
    expect(
      validateCreatePet({ name: 'B', species: 'dog', breed: null, color: null, specialNeeds: null })
    ).not.toBeNull();
  });

  it('toggles pet activity scoped to the owner', async () => {
    const pet = { id: 'pet-1', is_active: false };
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      result: { data: pet, error: null },
    });

    await expect(setPetActive(client, 'pet-1', false)).resolves.toEqual(pet);
    const updateCall = calls.find((call) => call.values !== undefined);
    expect(updateCall?.values).toEqual({ is_active: false });
  });
});

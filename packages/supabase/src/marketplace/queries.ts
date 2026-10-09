import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type MarketplaceListing = Database['public']['Tables']['marketplace_listings']['Row'];
export type MarketplaceListingKind = Database['public']['Enums']['marketplace_listing_kind'];
export type MarketplaceListingStatus = Database['public']['Enums']['marketplace_listing_status'];
export type MarketplaceInquiry = Database['public']['Tables']['marketplace_inquiries']['Row'];

export interface MarketplaceListingWithOwner extends MarketplaceListing {
  owner: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

export const MARKETPLACE_KIND_LABELS: Record<MarketplaceListingKind, string> = {
  giveaway: 'Zu verschenken',
  swap: 'Tauschen',
  sell: 'Verkaufen',
  wanted: 'Gesucht',
};

export const MARKETPLACE_CATEGORIES = [
  'Futter',
  'Spielzeug',
  'Zubehör',
  'Transport',
  'Pflege',
  'Sonstiges',
] as const;

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user === null) throw new Error('Not authenticated');
  return data.user.id;
}

async function addOwners(
  client: SupabaseClient<Database>,
  listings: MarketplaceListing[]
): Promise<MarketplaceListingWithOwner[]> {
  const ownerIds = [...new Set(listings.map((listing) => listing.owner_id))];
  if (ownerIds.length === 0) return [];
  const { data, error } = await client
    .from('public_profiles')
    .select('id,display_name,avatar_url')
    .in('id', ownerIds);
  if (error) throw error;
  const owners = new Map(
    (data ?? [])
      .filter((owner): owner is typeof owner & { id: string } => owner.id !== null)
      .map((owner) => [owner.id, owner])
  );
  return listings.map((listing) => ({ ...listing, owner: owners.get(listing.owner_id) ?? null }));
}

export async function fetchMarketplaceListings(
  client: SupabaseClient<Database>,
  filters: { kind?: MarketplaceListingKind; category?: string; search?: string } = {}
): Promise<MarketplaceListingWithOwner[]> {
  let query = client
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  if (filters.kind) query = query.eq('kind', filters.kind);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[,()]/g, ' ');
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return addOwners(client, data ?? []);
}

export async function fetchOwnMarketplaceListings(
  client: SupabaseClient<Database>
): Promise<MarketplaceListingWithOwner[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('marketplace_listings')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return addOwners(client, data ?? []);
}

export async function createMarketplaceListing(
  client: SupabaseClient<Database>,
  input: {
    kind: MarketplaceListingKind;
    category: string;
    title: string;
    description?: string;
    condition?: string;
    priceEur?: number | null;
    exchangeFor?: string;
    locationArea?: string;
  }
): Promise<MarketplaceListing> {
  const ownerId = await requireUserId(client);
  const title = input.title.trim();
  if (title.length < 3) throw new Error('Der Titel muss mindestens 3 Zeichen lang sein.');
  if (title.length > 100) throw new Error('Der Titel darf höchstens 100 Zeichen lang sein.');
  if (input.kind === 'sell' && (!input.priceEur || input.priceEur <= 0)) {
    throw new Error('Bitte gib für ein Verkaufsangebot einen Preis über 0 € an.');
  }
  const { data, error } = await client
    .from('marketplace_listings')
    .insert({
      owner_id: ownerId,
      kind: input.kind,
      category: input.category.trim(),
      title,
      description: input.description?.trim() || null,
      condition: input.condition?.trim() || null,
      price_eur_cents: input.kind === 'sell' ? Math.round((input.priceEur ?? 0) * 100) : null,
      exchange_for: input.exchangeFor?.trim() || null,
      location_area: input.locationArea?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setMarketplaceListingStatus(
  client: SupabaseClient<Database>,
  listingId: string,
  status: MarketplaceListingStatus
): Promise<MarketplaceListing> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('marketplace_listings')
    .update({ status })
    .eq('id', listingId)
    .eq('owner_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createMarketplaceInquiry(
  client: SupabaseClient<Database>,
  listingId: string,
  message: string
): Promise<MarketplaceInquiry> {
  const requesterId = await requireUserId(client);
  const trimmed = message.trim();
  if (trimmed.length < 2) throw new Error('Bitte schreibe eine kurze Nachricht.');
  const { data, error } = await client
    .from('marketplace_inquiries')
    .upsert(
      { listing_id: listingId, requester_id: requesterId, message: trimmed, status: 'pending' },
      { onConflict: 'listing_id,requester_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

import * as SecureStore from 'expo-secure-store';
import type { PublicEmergencyCard } from '@pfotennetz/supabase';

type CachedCard = { card: PublicEmergencyCard; cachedAt: string };
const key = (token: string) => `pfotennetz.public-emergency.${token}`;

export async function savePublicEmergencyCard(
  token: string,
  card: PublicEmergencyCard
): Promise<void> {
  await SecureStore.setItemAsync(
    key(token),
    JSON.stringify({ card, cachedAt: new Date().toISOString() })
  );
}

export async function loadPublicEmergencyCard(token: string): Promise<CachedCard | null> {
  const value = await SecureStore.getItemAsync(key(token));
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CachedCard;
    return parsed?.card && typeof parsed.cachedAt === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function removePublicEmergencyCard(token: string): Promise<void> {
  await SecureStore.deleteItemAsync(key(token));
}

import * as Linking from 'expo-linking';
import { buildDirectionsUrl } from './navigation-url';

export { buildDirectionsUrl } from './navigation-url';

export async function openDirections(destination: string): Promise<boolean> {
  const url = buildDirectionsUrl(destination);
  if (url === null) return false;

  await Linking.openURL(url);
  return true;
}

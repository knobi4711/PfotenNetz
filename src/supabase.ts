import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Ersetze diese Platzhalter später mit deinen Daten aus dem Supabase Dashboard:
// Settings -> API -> Project URL & anon / public Key
const supabaseUrl = 'DEINE_SUPABASE_URL';
const supabaseAnonKey = 'DEIN_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
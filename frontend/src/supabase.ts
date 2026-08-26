import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://iddgdhxvvnjhimcpydtm.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZGdkaHh2dm5qaGltY3B5ZHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDkwMTUsImV4cCI6MjA5NzIyNTAxNX0.1KPMwS3_bF2g4pUcR0uSgsmBkHJFjDS17nDM39dY9I8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, legacyKey: string) => {
  if (import.meta.env && import.meta.env[key]) return import.meta.env[key];
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.[legacyKey]) {
    return (globalThis as any).process.env[legacyKey];
  }
  return '';
};

const supabaseUrl =
  getEnv('VITE_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL') ||
  'https://iddgdhxvvnjhimcpydtm.supabase.co';

const supabaseAnonKey =
  getEnv('VITE_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZGdkaHh2dm5qaGltY3B5ZHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDkwMTUsImV4cCI6MjA5NzIyNTAxNX0.1KPMwS3_bF2g4pUcR0uSgsmBkHJFjDS17nDM39dY9I8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

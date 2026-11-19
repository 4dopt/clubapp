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
    // Bypass browser navigator.locks queue contention that can stall signInWithPassword
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      return await fn();
    },
  },
  global: {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url || '';
      const isAuthEndpoint = urlStr.includes('/auth/v1/');
      // Abort hung Supabase Auth requests at 1.4s and PostgREST requests at 3.5s so the UI never freezes
      const timeoutMs = isAuthEndpoint ? 1400 : 3500;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(input, {
          ...init,
          signal: init?.signal || controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    },
  },
});

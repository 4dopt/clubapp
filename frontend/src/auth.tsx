import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type User } from './api';
import { supabase } from './supabase';
import {
  fetchProfileFromSupabase,
  fetchCurrentUserFromSupabase,
  getCachedUser,
  setCachedUser,
  supabaseSignOut,
} from './supabaseService';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

const TOKEN_KEY = 'playgolf.token';
const ADMIN_TOKEN_KEY = 'playgolf.admin_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1. Check active Supabase Auth session first
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (session?.user) {
          const profile = await fetchProfileFromSupabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );
          if (mounted && profile) {
            localStorage.setItem(TOKEN_KEY, session.access_token);
            if (profile.role === 'admin') {
              localStorage.setItem(ADMIN_TOKEN_KEY, session.access_token);
            }
            setToken(session.access_token);
            setUserState(profile);
            setLoading(false);
            return;
          }
        }

        // 2. Check if Staff/Admin PIN session is active
        const adminTok = localStorage.getItem(ADMIN_TOKEN_KEY);
        const cached = getCachedUser();
        if (adminTok && (adminTok.includes('admin') || cached?.role === 'admin')) {
          if (mounted) {
            setToken(adminTok);
            setUserState(
              cached?.role === 'admin'
                ? cached
                : {
                    id: 'usr_admin_jay',
                    email: 'jay@gmail.com',
                    name: 'Jay (Admin)',
                    role: 'admin',
                    member_id: 'PG-000001',
                    tier: 'Platinum',
                    points: 12500,
                    points_ytd: 12500,
                    qr_token: 'QR_ADMIN_JAY',
                    created_at: '2026-01-01T00:00:00.000Z',
                  }
            );
          }
        } else {
          // Clear any stale non-Supabase tokens
          localStorage.removeItem(TOKEN_KEY);
          setCachedUser(null);
        }
      } catch (err) {
        console.warn('Auth initialization warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Listen to Supabase auth state changes (Sign In, Token Refresh, Sign Out)
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (
          session?.user &&
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
        ) {
          const profile = await fetchProfileFromSupabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );
          localStorage.setItem(TOKEN_KEY, session.access_token);
          if (profile?.role === 'admin') {
            localStorage.setItem(ADMIN_TOKEN_KEY, session.access_token);
          }
          if (mounted) {
            setToken(session.access_token);
            if (profile) setUserState(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setCachedUser(null);
          if (mounted) {
            setToken(null);
            setUserState(null);
          }
        }
      } catch (err) {
        console.warn('onAuthStateChange error handled:', err);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t);
    if (u?.role === 'admin') {
      localStorage.setItem(ADMIN_TOKEN_KEY, t);
    }
    setCachedUser(u);
    setToken(t);
    setUserState(u);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setCachedUser(null);
    setToken(null);
    setUserState(null);
    try {
      await supabaseSignOut();
    } catch {
      /* ignore signOut error */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const sbUser = await fetchCurrentUserFromSupabase();
      if (sbUser) {
        setUserState(sbUser);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  const setUser = useCallback((u: User) => {
    setCachedUser(u);
    setUserState(u);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, signIn, signOut, refresh, setUser }),
    [token, user, loading, signIn, signOut, refresh, setUser]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

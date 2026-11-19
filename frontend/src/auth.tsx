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
  buildMemberQrToken,
  deriveMemberIdFromUuid,
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

function buildInstantUserFromSession(sessionUser: any, cached: User | null): User {
  if (cached && cached.id === sessionUser.id) {
    return cached;
  }
  const emailStr = (sessionUser.email || '').toLowerCase();
  const memberId =
    sessionUser.user_metadata?.member_id || deriveMemberIdFromUuid(sessionUser.id);
  const isAdmin = emailStr === 'jay@gmail.com' || sessionUser.user_metadata?.role === 'admin';
  return {
    id: sessionUser.id,
    email: emailStr,
    name: sessionUser.user_metadata?.name || emailStr.split('@')[0] || 'Member',
    role: isAdmin ? 'admin' : 'member',
    member_id: memberId,
    tier: 'Silver',
    points: 250,
    points_ytd: 250,
    qr_token: buildMemberQrToken(memberId),
    created_at: sessionUser.created_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUserState] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState<boolean>(() => !getCachedUser());

  useEffect(() => {
    let mounted = true;

    const onProfileSynced = (e: Event) => {
      const synced = (e as CustomEvent<User>).detail;
      if (mounted && synced) {
        setUserState(synced);
      }
    };
    window.addEventListener('playgolf-profile-synced', onProfileSynced);

    (async () => {
      try {
        const cached = getCachedUser();
        const sessionRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: any } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 800)
          ),
        ]);
        const session = sessionRes?.data?.session;

        if (session?.user) {
          const instantUser = buildInstantUserFromSession(session.user, cached);
          localStorage.setItem(TOKEN_KEY, session.access_token);
          if (instantUser.role === 'admin') {
            localStorage.setItem(ADMIN_TOKEN_KEY, session.access_token);
          }
          if (mounted) {
            setToken(session.access_token);
            setUserState(instantUser);
            setLoading(false);
          }

          // Background sync with Supabase DB (non-blocking)
          fetchProfileFromSupabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          )
            .then((profile) => {
              if (mounted && profile) {
                if (profile.role === 'admin') {
                  localStorage.setItem(ADMIN_TOKEN_KEY, session.access_token);
                }
                setUserState(profile);
              }
            })
            .catch(() => {});
          return;
        }

        // Check if Staff/Admin PIN session or Local Fallback session is active
        const adminTok = localStorage.getItem(ADMIN_TOKEN_KEY);
        const existingTok = localStorage.getItem(TOKEN_KEY);
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
                    points: 22500,
                    points_ytd: 22500,
                    qr_token: 'QR_ADMIN_JAY',
                    created_at: '2026-01-01T00:00:00.000Z',
                  }
            );
          }
        } else if (existingTok && cached && existingTok.startsWith('local_token_')) {
          if (mounted) {
            setToken(existingTok);
            setUserState(cached);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setCachedUser(null);
          if (mounted) {
            setToken(null);
            setUserState(null);
          }
        }
      } catch (err) {
        console.warn('Auth initialization warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      ) {
        localStorage.setItem(TOKEN_KEY, session.access_token);
        const cached = getCachedUser();
        const instantUser = buildInstantUserFromSession(session.user, cached);
        if (mounted) {
          setToken(session.access_token);
          setUserState(instantUser);
          setLoading(false);
        }

        if (event === 'SIGNED_IN' && cached?.id === session.user.id) {
          return;
        }

        setTimeout(() => {
          fetchProfileFromSupabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          )
            .then((profile) => {
              if (mounted && profile) {
                if (profile.role === 'admin') {
                  localStorage.setItem(ADMIN_TOKEN_KEY, session.access_token);
                }
                setUserState(profile);
              }
            })
            .catch(() => {});
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setCachedUser(null);
        if (mounted) {
          setToken(null);
          setUserState(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener('playgolf-profile-synced', onProfileSynced);
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
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setCachedUser(null);
    setToken(null);
    setUserState(null);
    setLoading(false);
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

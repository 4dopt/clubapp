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
  USER_CACHE_KEY,
} from './supabaseService';
import { isAuthorizedAdminUser, isValidAdminSessionToken } from './utils/securityGuard';

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
  const emailStr = (sessionUser.email || '').toLowerCase();
  // SECURITY FIX: Never trust user-writable sessionUser.user_metadata.role === 'admin'
  // or a tampered localStorage cached.role === 'admin' unless email is authorized.
  const isAdmin = isAuthorizedAdminUser(emailStr, null);
  if (cached && cached.id === sessionUser.id) {
    return {
      ...cached,
      role: isAdmin ? 'admin' : 'member',
    };
  }
  const memberId =
    sessionUser.user_metadata?.member_id || deriveMemberIdFromUuid(sessionUser.id);
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
      if (!mounted || !synced) return;
      setUserState((currentUser) => {
        if (!currentUser) return currentUser;
        const matchesCurrent =
          currentUser.id === synced.id ||
          (currentUser.email && synced.email && currentUser.email.toLowerCase() === synced.email.toLowerCase()) ||
          (currentUser.member_id && synced.member_id && currentUser.member_id === synced.member_id);
        if (matchesCurrent) {
          return {
            ...currentUser,
            points: synced.points,
            points_ytd: synced.points_ytd,
            tier: synced.tier,
          };
        }
        return currentUser;
      });
    };
    window.addEventListener('playgolf-profile-synced', onProfileSynced);

    // Cross-tab broadcast channel for immediate multi-tab updates
    let syncChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        syncChannel = new BroadcastChannel('playgolf_sync_channel');
        syncChannel.onmessage = (event) => {
          if (!mounted) return;
          if (event.data?.type === 'PROFILE_UPDATED' && event.data.user) {
            const synced = event.data.user as User;
            setUserState((currentUser) => {
              if (!currentUser) return currentUser;
              const matchesCurrent =
                currentUser.id === synced.id ||
                (currentUser.email && synced.email && currentUser.email.toLowerCase() === synced.email.toLowerCase()) ||
                (currentUser.member_id && synced.member_id && currentUser.member_id === synced.member_id);
              if (matchesCurrent) {
                const updated = {
                  ...currentUser,
                  points: synced.points,
                  points_ytd: synced.points_ytd,
                  tier: synced.tier,
                };
                try {
                  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              }
              return currentUser;
            });
          }
        };
      }
    } catch {}

    const onStorageChange = (e: StorageEvent) => {
      if (!mounted) return;
      if (e.key === 'playgolf.last_sync_timestamp' || e.key === USER_CACHE_KEY) {
        fetchCurrentUserFromSupabase().then((fresh) => {
          if (mounted && fresh) setUserState(fresh);
        }).catch(() => {});
      }
    };
    window.addEventListener('storage', onStorageChange);

    const onVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCurrentUserFromSupabase().then((fresh) => {
          if (mounted && fresh) setUserState(fresh);
        }).catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

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

        // Check if a cryptographically signed Staff/Admin PIN session is active
        const adminTok = localStorage.getItem(ADMIN_TOKEN_KEY);
        const existingTok = localStorage.getItem(TOKEN_KEY);
        if (adminTok && isValidAdminSessionToken(adminTok)) {
          if (mounted) {
            setToken(adminTok);
            setUserState(
              cached?.role === 'admin' && cached?.email === 'jay@gmail.com'
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
        } else if (existingTok && cached && existingTok.startsWith('local_token_') && cached.role !== 'admin') {
          if (mounted) {
            setToken(existingTok);
            setUserState(cached);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ADMIN_TOKEN_KEY);
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
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      if (syncChannel) {
        try {
          syncChannel.close();
        } catch {}
      }
      data.subscription.unsubscribe();
    };
  }, []);

  // Supabase Realtime channel for live profile, balance, and transaction updates
  useEffect(() => {
    if (!user?.id || user.id === 'usr_admin_jay') return;
    let mounted = true;

    const channel = supabase
      .channel(`live-member-auth-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (!mounted) return;
          if (payload.new && typeof payload.new.points === 'number') {
            setUserState((prev) => {
              if (!prev || prev.id !== user.id) return prev;
              const next = {
                ...prev,
                points: payload.new.points,
                points_ytd: payload.new.points_ytd ?? prev.points_ytd,
                tier: payload.new.tier ?? prev.tier,
              };
              setCachedUser(next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (!mounted) return;
          if (payload.new && typeof payload.new.points_balance === 'number') {
            setUserState((prev) => {
              if (!prev || prev.id !== user.id) return prev;
              const next = {
                ...prev,
                points: payload.new.points_balance,
                points_ytd: payload.new.lifetime_points ?? prev.points_ytd,
                tier: payload.new.tier ?? prev.tier,
              };
              setCachedUser(next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!mounted) return;
          fetchCurrentUserFromSupabase().then((sbUser) => {
            if (mounted && sbUser) setUserState(sbUser);
          }).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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

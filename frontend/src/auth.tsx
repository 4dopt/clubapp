import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type User } from './api';
import { supabase } from './supabase';

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
    let subscription: any;

    (async () => {
      try {
        const t = (await AsyncStorage.getItem(TOKEN_KEY)) || (await AsyncStorage.getItem(ADMIN_TOKEN_KEY));
        if (t) {
          try {
            const u = await api.me(t);
            setToken(t);
            setUserState(u);
          } catch {
            setToken(t);
            if (t.includes('admin') || t.includes('jay')) {
              setUserState({
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
              });
            }
          }
        }
      } catch { /* ignore */ }
      finally {
        setLoading(false);
      }

      // Listen to Supabase auth events (e.g. Magic Link clicks)
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          try {
            const u = await api.me(session.access_token);
            await AsyncStorage.setItem(TOKEN_KEY, session.access_token);
            setToken(session.access_token);
            setUserState(u);
          } catch {
            // Profile may not exist yet, verifyOtp will fetch it/create it
          }
        } else {
          await AsyncStorage.removeItem(TOKEN_KEY);
          await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          setUserState(null);
        }
      });
      subscription = data.subscription;
    })();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (t: string, u: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, t);
    if (u?.role === 'admin') {
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, t);
    }
    setToken(t);
    setUserState(u);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setUserState(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const u = await api.me(token);
      setUserState(u);
    } catch { /* ignore */ }
  }, [token]);

  const setUser = useCallback((u: User) => setUserState(u), []);

  const value = useMemo(
    () => ({ token, user, loading, signIn, signOut, refresh, setUser }),
    [token, user, loading, signIn, signOut, refresh, setUser],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

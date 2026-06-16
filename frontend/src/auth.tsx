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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        if (t) {
          try {
            const u = await api.me(t);
            setToken(t);
            setUserState(u);
          } catch {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch { /* ignore */ }
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (t: string, u: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUserState(u);
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try { await api.logout(token); } catch { /* ignore */ }
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUserState(null);
  }, [token]);

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

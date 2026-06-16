import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from './api';

type AdminAuthState = {
  adminToken: string | null;
  loading: boolean;
  signIn: (pin: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | null>(null);
const KEY = 'playgolf.admin_token';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(KEY);
        if (t) {
          try {
            await adminApi.me(t);
            setAdminToken(t);
          } catch {
            await AsyncStorage.removeItem(KEY);
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const signIn = useCallback(async (pin: string) => {
    const r = await adminApi.login(pin);
    await AsyncStorage.setItem(KEY, r.admin_token);
    setAdminToken(r.admin_token);
  }, []);

  const signOut = useCallback(async () => {
    if (adminToken) {
      try { await adminApi.logout(adminToken); } catch { /* ignore */ }
    }
    await AsyncStorage.removeItem(KEY);
    setAdminToken(null);
  }, [adminToken]);

  const value = useMemo(() => ({ adminToken, loading, signIn, signOut }), [adminToken, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { adminApi } from './api';

type AdminAuthState = {
  adminToken: string | null;
  loading: boolean;
  signIn: (pin: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | null>(null);
const KEY = 'playgolf.admin_token';
const TOKEN_KEY = 'playgolf.token';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY) || localStorage.getItem(TOKEN_KEY);
      if (t) {
        setAdminToken(t);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const signIn = useCallback(async (pin: string) => {
    const r = await adminApi.login(pin);
    localStorage.setItem(KEY, r.admin_token);
    localStorage.setItem(TOKEN_KEY, r.admin_token);
    setAdminToken(r.admin_token);
  }, []);

  const signOut = useCallback(async () => {
    if (adminToken) {
      try { await adminApi.logout(adminToken); } catch { /* ignore */ }
    }
    localStorage.removeItem(KEY);
    localStorage.removeItem(TOKEN_KEY);
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

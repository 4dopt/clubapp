const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type User = {
  id: string;
  phone: string;
  name: string;
  member_id: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points_balance: number;
  lifetime_points: number;
  joined_at: string;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: string;
  image_url: string;
  active: boolean;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'earn' | 'redeem';
  points: number;
  title: string;
  description: string;
  reward_id?: string | null;
  redemption_code?: string | null;
  created_at: string;
};

async function request<T>(
  path: string,
  opts: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  requestOtp: (phone: string) =>
    request<{ ok: boolean; dev_otp: string; message: string }>(
      '/auth/request-otp',
      { method: 'POST', body: JSON.stringify({ phone }) },
    ),
  verifyOtp: (phone: string, otp: string, name?: string) =>
    request<{ token: string; user: User }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ phone, otp, name }) },
    ),
  me: (token: string) => request<User>('/me', {}, token),
  updateName: (token: string, name: string) =>
    request<User>('/me/name', { method: 'POST', body: JSON.stringify({ name }) }, token),
  rewards: (category?: string, token?: string) =>
    request<Reward[]>(
      `/rewards${category && category !== 'all' ? `?category=${category}` : ''}`,
      {},
      token,
    ),
  reward: (id: string, token?: string) => request<Reward>(`/rewards/${id}`, {}, token),
  redeem: (token: string, reward_id: string) =>
    request<{
      ok: boolean;
      redemption_code: string;
      new_balance: number;
      reward: Reward;
      transaction: Transaction;
    }>('/redeem', { method: 'POST', body: JSON.stringify({ reward_id }) }, token),
  transactions: (token: string) => request<Transaction[]>('/transactions', {}, token),
  addPoints: (token: string, points: number, title?: string) =>
    request<{
      ok: boolean;
      new_balance: number;
      lifetime_points: number;
      tier: string;
      transaction: Transaction;
    }>('/points/add', {
      method: 'POST',
      body: JSON.stringify({ points, title: title ?? 'Visit at PlayGolf' }),
    }, token),
  logout: (token: string) =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token),
};

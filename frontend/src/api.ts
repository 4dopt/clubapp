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
  suspended?: boolean;
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
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  title: string;
  description: string;
  reward_id?: string | null;
  redemption_code?: string | null;
  used?: boolean;
  used_at?: string | null;
  created_at: string;
  by_admin?: boolean;
  member_name?: string;
  member_id?: string;
};

export type AdminStats = {
  total_members: number;
  suspended: number;
  points_issued_today: number;
  visits_today: number;
  redemptions_today: number;
  week_earn_total: number;
  week_redeem_total: number;
  tiers: { Silver: number; Gold: number; Platinum: number };
  recent: Transaction[];
};

async function request<T>(
  path: string,
  opts: RequestInit = {},
  token?: string | null,
  adminToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (adminToken) headers['X-Admin-Token'] = adminToken;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  // Member
  requestOtp: (phone: string) =>
    request<{ ok: boolean; dev_otp: string; message: string }>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, otp: string, name?: string) =>
    request<{ token: string; user: User }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, name }) }),
  me: (token: string) => request<User>('/me', {}, token),
  updateName: (token: string, name: string) =>
    request<User>('/me/name', { method: 'POST', body: JSON.stringify({ name }) }, token),
  rewards: (category?: string, token?: string) =>
    request<Reward[]>(`/rewards${category && category !== 'all' ? `?category=${category}` : ''}`, {}, token),
  reward: (id: string, token?: string) => request<Reward>(`/rewards/${id}`, {}, token),
  redeem: (token: string, reward_id: string) =>
    request<{ ok: boolean; redemption_code: string; new_balance: number; reward: Reward; transaction: Transaction }>(
      '/redeem', { method: 'POST', body: JSON.stringify({ reward_id }) }, token,
    ),
  transactions: (token: string) => request<Transaction[]>('/transactions', {}, token),
  addPoints: (token: string, points: number, title?: string) =>
    request<{ ok: boolean; new_balance: number; lifetime_points: number; tier: string; transaction: Transaction }>(
      '/points/add', { method: 'POST', body: JSON.stringify({ points, title: title ?? 'Visit at PlayGolf' }) }, token,
    ),
  logout: (token: string) => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token),
};

export const adminApi = {
  login: (pin: string) =>
    request<{ ok: boolean; admin_token: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  logout: (adminToken: string) =>
    request<{ ok: boolean }>('/admin/logout', { method: 'POST' }, null, adminToken),
  me: (adminToken: string) => request<{ ok: boolean; role: string }>('/admin/me', {}, null, adminToken),
  stats: (adminToken: string) => request<AdminStats>('/admin/stats', {}, null, adminToken),
  creditPoints: (adminToken: string, member_id: string, points: number, title?: string) =>
    request<{ ok: boolean; user: User; transaction: Transaction }>(
      '/admin/credit-points',
      { method: 'POST', body: JSON.stringify({ member_id, points, title: title ?? 'Visit credited by staff' }) },
      null, adminToken,
    ),
  verifyRedemption: (adminToken: string, code: string) =>
    request<{ ok: boolean; already_used: boolean; transaction: Transaction; member: User }>(
      '/admin/verify-redemption',
      { method: 'POST', body: JSON.stringify({ code }) },
      null, adminToken,
    ),
  listMembers: (adminToken: string, q?: string) =>
    request<User[]>(`/admin/members${q ? `?q=${encodeURIComponent(q)}` : ''}`, {}, null, adminToken),
  getMember: (adminToken: string, id: string) =>
    request<{ user: User; transactions: Transaction[] }>(`/admin/members/${id}`, {}, null, adminToken),
  updateMember: (adminToken: string, id: string, patch: Partial<{ name: string; points_balance: number; tier: string; suspended: boolean }>) =>
    request<User>(`/admin/members/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, null, adminToken),
  listRewards: (adminToken: string) => request<Reward[]>('/admin/rewards', {}, null, adminToken),
  createReward: (adminToken: string, data: Omit<Reward, 'id'>) =>
    request<Reward>('/admin/rewards', { method: 'POST', body: JSON.stringify(data) }, null, adminToken),
  updateReward: (adminToken: string, id: string, patch: Partial<Omit<Reward, 'id'>>) =>
    request<Reward>(`/admin/rewards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, null, adminToken),
  deleteReward: (adminToken: string, id: string) =>
    request<{ ok: boolean }>(`/admin/rewards/${id}`, { method: 'DELETE' }, null, adminToken),
};

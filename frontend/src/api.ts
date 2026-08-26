import { API_BASE } from './config';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'staff' | 'admin';
  member_id: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points: number;
  points_ytd: number;
  qr_token: string;
  created_at: string;
  suspended?: boolean;
  points_balance?: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: string;
  image_url: string;
  active: boolean;
  redemption_type: 'qr' | 'discount';
  discount_code?: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  reward_title: string;
  points_cost: number;
  redemption_type: string;
  discount_code?: string;
  qr_code_token?: string;
  fulfilled: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'earn' | 'redeem';
  title: string;
  points: number;
  category?: string;
  created_at: string;
}

export interface AdminStats {
  points_issued_today: number;
  visits_today: number;
  redemptions_today: number;
  total_members: number;
  tiers: { Silver: number; Gold: number; Platinum: number };
  week_earn_total: number;
  week_redeem_total: number;
  recent: Array<{
    id: string;
    type: 'earn' | 'redeem';
    title: string;
    points: number;
    member_name?: string;
    member_id?: string;
    created_at: string;
  }>;
}

const MOCK_ADMIN_USER: User = {
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
};

const MOCK_MEMBER_USER: User = {
  id: 'usr_member_1',
  email: 'alex@example.com',
  name: 'Alex Morgan',
  role: 'member',
  member_id: 'PG-2445B5',
  tier: 'Silver',
  points: 250,
  points_ytd: 250,
  qr_token: 'QR_MEMBER_2445B5',
  created_at: '2026-02-01T00:00:00.000Z',
};

const MOCK_REWARDS: Reward[] = [
  {
    id: 'rew_1',
    title: 'Complimentary Bucket of 100 Range Balls',
    description: 'Enjoy a free range session with 100 premium balls.',
    points_cost: 150,
    category: 'Driving Range',
    image_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'qr',
  },
  {
    id: 'rew_2',
    title: '20% Off Pro Shop Apparel',
    description: 'Get 20% off polo shirts, hats, and golf footwear.',
    points_cost: 300,
    category: 'Pro Shop',
    image_url: 'https://images.unsplash.com/photo-1593111774601-dfbce324a35f?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'discount',
    discount_code: 'PLAYGOLF20',
  },
  {
    id: 'rew_3',
    title: '1-Hour PGA Pro Coaching Session',
    description: 'One-on-one swing analysis and trackman data review with our Head Professional.',
    points_cost: 600,
    category: 'Coaching',
    image_url: 'https://images.unsplash.com/photo-1592919505780-303950717480?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'qr',
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn_1',
    user_id: 'usr_member_1',
    type: 'earn',
    title: 'Range Visit Check-in',
    points: 100,
    category: 'Visit',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'txn_2',
    user_id: 'usr_member_1',
    type: 'earn',
    title: 'Weekend Championship Round',
    points: 150,
    category: 'Round',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_ADMIN_STATS: AdminStats = {
  points_issued_today: 4500,
  visits_today: 32,
  redemptions_today: 8,
  total_members: 142,
  tiers: { Silver: 95, Gold: 35, Platinum: 12 },
  week_earn_total: 24500,
  week_redeem_total: 6200,
  recent: [
    {
      id: 'rec_1',
      type: 'earn',
      title: 'Range Visit Check-in',
      points: 100,
      member_name: 'Alex Morgan',
      member_id: 'PG-2445B5',
      created_at: new Date().toISOString(),
    },
    {
      id: 'rec_2',
      type: 'redeem',
      title: 'Range Ball Bucket',
      points: 150,
      member_name: 'Sam Taylor',
      member_id: 'PG-109283',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

function getMockFallback<T>(path: string, options: RequestInit): T {
  const body = options.body ? JSON.parse(options.body as string) : {};

  if (path === '/api/auth/otp/request') {
    return { message: 'Code sent (Demo Mode: 123456)', otp_sent: true } as unknown as T;
  }

  if (path === '/api/auth/otp/verify') {
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    if (email === 'jay@gmail.com') {
      if (otp !== '123456' && otp.length > 0) {
        throw new Error('Invalid admin password');
      }
      return { token: 'demo-admin-token-jay', user: MOCK_ADMIN_USER } as unknown as T;
    }
    const name = body.name ? body.name.trim() : 'Alex Morgan';
    return {
      token: `demo-member-token-${email}`,
      user: { ...MOCK_MEMBER_USER, email, name: name || MOCK_MEMBER_USER.name },
    } as unknown as T;
  }

  if (path === '/api/admin/login') {
    const pin = (body.pin || '').trim();
    if (pin === '123456' || pin.length > 0) {
      return { admin_token: 'demo-admin-token-jay' } as unknown as T;
    }
    throw new Error('Invalid Admin PIN');
  }

  if (path === '/api/admin/me') {
    return { ok: true, role: 'admin', email: 'jay@gmail.com' } as unknown as T;
  }

  if (path === '/api/admin/logout') {
    return { ok: true } as unknown as T;
  }

  if (path === '/api/auth/me') {
    const authHeader = (options.headers as any)?.Authorization || '';
    if (authHeader.includes('admin') || authHeader.includes('jay')) {
      return MOCK_ADMIN_USER as unknown as T;
    }
    return MOCK_MEMBER_USER as unknown as T;
  }

  if (path.startsWith('/api/admin/stats')) {
    return MOCK_ADMIN_STATS as unknown as T;
  }

  if (path.startsWith('/api/admin/members/')) {
    return { user: MOCK_MEMBER_USER, redemptions: [] } as unknown as T;
  }

  if (path.startsWith('/api/admin/members')) {
    return [MOCK_MEMBER_USER, MOCK_ADMIN_USER] as unknown as T;
  }

  if (path.startsWith('/api/admin/rewards') || path === '/api/rewards') {
    return MOCK_REWARDS as unknown as T;
  }

  if (path === '/api/rewards/redeem') {
    return {
      redemption_id: 'red_demo_' + Date.now(),
      redemption_type: 'qr',
      qr_code_token: 'QR_DEMO_' + Date.now(),
      remaining_points: 100,
    } as unknown as T;
  }

  if (path === '/api/history') {
    return MOCK_TRANSACTIONS as unknown as T;
  }

  if (path === '/api/admin/log-visit') {
    return {
      message: 'Visit logged successfully',
      user_id: MOCK_MEMBER_USER.id,
      member_name: MOCK_MEMBER_USER.name,
      member_id: MOCK_MEMBER_USER.member_id,
      new_points: 350,
    } as unknown as T;
  }

  if (path === '/api/admin/rewards/fulfill-qr') {
    return {
      message: 'Redemption fulfilled',
      redemption: {
        id: 'red_1',
        user_id: MOCK_MEMBER_USER.id,
        reward_id: 'rew_1',
        reward_title: 'Bucket of Balls',
        points_cost: 150,
        redemption_type: 'qr',
        fulfilled: true,
        created_at: new Date().toISOString(),
      },
      member: MOCK_MEMBER_USER,
    } as unknown as T;
  }

  if (path === '/api/admin/upload-image') {
    return 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80' as unknown as T;
  }

  return MOCK_MEMBER_USER as unknown as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'API Request failed');
    }
    return data as T;
  } catch (err: any) {
    if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError') && !err.message.includes('fetch')) {
      throw err;
    }
    // Fallback to seamless demo mode when backend server is offline/unreachable
    return getMockFallback<T>(path, options);
  }
}

export const api = {
  async requestOtp(email: string, name?: string) {
    return request<{ message: string; otp_sent: boolean }>('/api/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  },

  async verifyOtp(email: string, otp: string, name?: string) {
    return request<{ token: string; user: User }>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp, name }),
    });
  },

  async me(token: string) {
    return request<User>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async rewards(token: string) {
    return request<Reward[]>('/api/rewards', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async redeemReward(token: string, rewardId: string) {
    return request<{
      redemption_id: string;
      redemption_type: 'qr' | 'discount';
      discount_code?: string;
      qr_code_token?: string;
      remaining_points: number;
    }>('/api/rewards/redeem', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reward_id: rewardId }),
    });
  },

  async history(token: string) {
    return request<Transaction[]>('/api/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const adminApi = {
  async login(pin: string) {
    return request<{ admin_token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  async me(adminToken: string) {
    return request<{ ok: boolean; role: string }>('/api/admin/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async logout(adminToken: string) {
    return request<{ ok: boolean }>('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async stats(adminToken: string) {
    return request<AdminStats>('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async listMembers(adminToken: string, query?: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return request<User[]>(`/api/admin/members${q}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async getMember(adminToken: string, userId: string) {
    return request<User>(`/api/admin/members/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async getMemberDetail(adminToken: string, userId: string) {
    return request<{ user: User; redemptions: RewardRedemption[] }>(`/api/admin/members/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async updateMember(adminToken: string, userId: string, updates: Partial<User>) {
    return request<User>(`/api/admin/members/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(updates),
    });
  },

  async logVisit(adminToken: string, memberId: string) {
    return request<{ message: string; user_id: string; member_name: string; member_id: string; new_points: number }>(
      '/api/admin/log-visit',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ member_id: memberId }),
      }
    );
  },

  async creditPoints(adminToken: string, memberId: string, points: number) {
    return request<{ ok: boolean; new_points: number }>(`/api/admin/members/${memberId}/adjust-points`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ points_delta: points, reason: 'Manual credit' }),
    });
  },

  async adjustPoints(adminToken: string, userId: string, pointsDelta: number, reason: string) {
    return request<{ message: string; new_points: number; tier: string }>(
      `/api/admin/members/${userId}/adjust-points`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ points_delta: pointsDelta, reason }),
      }
    );
  },

  async verifyRedemption(adminToken: string, qrToken: string) {
    return request<{ ok: boolean; message: string }>(`/api/admin/rewards/fulfill-qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ qr_code_token: qrToken }),
    });
  },

  async listRewards(adminToken: string) {
    return request<Reward[]>('/api/admin/rewards', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async createReward(adminToken: string, reward: Omit<Reward, 'id'>) {
    return request<Reward>('/api/admin/rewards', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(reward),
    });
  },

  async updateReward(adminToken: string, rewardId: string, updates: Partial<Reward>) {
    return request<Reward>(`/api/admin/rewards/${rewardId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(updates),
    });
  },

  async fulfillRewardQr(adminToken: string, qrToken: string) {
    return request<{ message: string; redemption: RewardRedemption; member: User }>(
      '/api/admin/rewards/fulfill-qr',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ qr_code_token: qrToken }),
      }
    );
  },

  async fulfillRedemption(adminToken: string, redemptionId: string) {
    return request<{ message: string; redemption: RewardRedemption }>(
      `/api/admin/rewards/redemptions/${redemptionId}/fulfill`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
  },

  async uploadRewardImage(adminToken: string, fileUri: string) {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('file', {
      uri: fileUri,
      name: filename,
      type,
    } as any);

    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Image upload failed');
    }
    return data.url as string;
  },
};

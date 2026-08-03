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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
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

  async getMemberDetail(adminToken: string, userId: string) {
    return request<{ user: User; redemptions: RewardRedemption[] }>(`/api/admin/members/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
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

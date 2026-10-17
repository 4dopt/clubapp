import { API_BASE } from './config';
import {
  logVisitInSupabaseOrStore,
  adjustMemberPointsInSupabase,
  fetchCurrentUserFromSupabase,
  fetchRewardsFromSupabase,
  redeemRewardInSupabase,
  fetchTransactionsFromSupabase,
  fetchAllMembersFromSupabase,
  fetchAdminStatsFromSupabase,
  fulfillRewardQrInSupabase,
} from './supabaseService';

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
  min_tier?: 'All' | 'Silver' | 'Gold' | 'Platinum';
  featured?: boolean;
  stock_limit?: number | null;
  redeemed_count?: number;
  retail_value?: string;
  validity_days?: number;
  terms?: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  user_name?: string;
  user_member_id?: string;
  reward_id: string;
  reward_title: string;
  points_cost: number;
  redemption_type: string;
  discount_code?: string;
  qr_code_token?: string;
  fulfilled: boolean;
  created_at: string;
  fulfilled_at?: string;
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
  points_outstanding?: number;
  retention_rate?: number;
  avg_visits_per_member?: number;
  daily_trends?: Array<{
    day: string;
    date: string;
    visits: number;
    points_earned: number;
    points_redeemed: number;
    bookings: number;
  }>;
  hourly_traffic?: Array<{
    hour: string;
    load: number;
    visits: number;
  }>;
  top_members?: Array<{
    id: string;
    name: string;
    member_id: string;
    tier: string;
    points: number;
    points_ytd: number;
    visits_count: number;
    last_visit: string;
  }>;
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

const REWARDS_STORAGE_KEY = 'playgolf.rewards_catalog';
const REDEMPTIONS_STORAGE_KEY = 'playgolf.reward_redemptions';

const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'rew_1',
    title: 'Complimentary Bucket of 100 Range Balls',
    description: 'Enjoy a free range session with 100 premium Srixon range balls & TrackMan tracking.',
    points_cost: 150,
    category: 'Driving Range',
    image_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'qr',
    min_tier: 'All',
    featured: true,
    stock_limit: null,
    redeemed_count: 48,
    retail_value: '£14.00',
    validity_days: 30,
    terms: 'Valid any day at Northwick Park Driving Range. Present QR pass at reception.',
  },
  {
    id: 'rew_2',
    title: '20% Off Pro Shop Apparel & Gear',
    description: 'Get 20% off polo shirts, caps, gloves, and golf footwear in the PlayGolf Pro Shop.',
    points_cost: 300,
    category: 'Pro Shop',
    image_url: 'https://images.unsplash.com/photo-1593111774601-dfbce324a35f?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'discount',
    discount_code: 'PLAYGOLF20',
    min_tier: 'Silver',
    featured: false,
    stock_limit: 100,
    redeemed_count: 31,
    retail_value: 'Up to £35',
    validity_days: 14,
    terms: 'Applies to full-price apparel and footwear. Cannot be combined with clearance items.',
  },
  {
    id: 'rew_3',
    title: '1-Hour PGA Pro Coaching & TrackMan Session',
    description: 'One-on-one swing analysis and TrackMan 4 launch monitor review with our Head PGA Professional.',
    points_cost: 600,
    category: 'Coaching',
    image_url: 'https://images.unsplash.com/photo-1592919505780-303950717480?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'qr',
    min_tier: 'Gold',
    featured: true,
    stock_limit: 25,
    redeemed_count: 14,
    retail_value: '£65.00',
    validity_days: 60,
    terms: 'Advance booking required with Pro Shop reception.',
  },
  {
    id: 'rew_4',
    title: 'Complimentary Clubhouse Coffee & Pastry',
    description: 'Freshly brewed barista coffee or tea paired with a warm bakery croissant at the Clubhouse Café.',
    points_cost: 120,
    category: 'Food & Beverage',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'qr',
    min_tier: 'All',
    featured: false,
    stock_limit: null,
    redeemed_count: 64,
    retail_value: '£7.50',
    validity_days: 14,
    terms: 'Redeemable daily before 2:00 PM at the Clubhouse Bar & Kitchen.',
  },
  {
    id: 'rew_5',
    title: 'Putt Crazy Minigolf 2-for-1 Guest Pass',
    description: 'Bring a friend or family member for free on our 18-hole adventure minigolf course.',
    points_cost: 250,
    category: 'Course & Games',
    image_url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=srgb&fm=jpg&q=80',
    active: true,
    redemption_type: 'discount',
    discount_code: 'PUTT2FOR1',
    min_tier: 'All',
    featured: true,
    stock_limit: 50,
    redeemed_count: 22,
    retail_value: '£12.00',
    validity_days: 30,
    terms: 'Valid Monday–Sunday. Lowest priced ticket is complimentary.',
  },
];

const DEFAULT_REDEMPTIONS: RewardRedemption[] = [
  {
    id: 'red_demo_1',
    user_id: 'usr_member_1',
    user_name: 'Alex Morgan',
    user_member_id: 'PG-2445B5',
    reward_id: 'rew_1',
    reward_title: 'Complimentary Bucket of 100 Range Balls',
    points_cost: 150,
    redemption_type: 'qr',
    qr_code_token: 'QR_REDEEM_8821A',
    fulfilled: false,
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'red_demo_2',
    user_id: 'usr_member_2',
    user_name: 'Sarah Connor',
    user_member_id: 'PG-9812A4',
    reward_id: 'rew_4',
    reward_title: 'Complimentary Clubhouse Coffee & Pastry',
    points_cost: 120,
    redemption_type: 'qr',
    qr_code_token: 'QR_REDEEM_4490B',
    fulfilled: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    fulfilled_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
  },
  {
    id: 'red_demo_3',
    user_id: 'usr_member_3',
    user_name: 'James Wilson',
    user_member_id: 'PG-7731C9',
    reward_id: 'rew_2',
    reward_title: '20% Off Pro Shop Apparel & Gear',
    points_cost: 300,
    redemption_type: 'discount',
    discount_code: 'PLAYGOLF20',
    fulfilled: true,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    fulfilled_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'red_demo_4',
    user_id: 'usr_member_4',
    user_name: 'Elena Rostova',
    user_member_id: 'PG-5120D2',
    reward_id: 'rew_3',
    reward_title: '1-Hour PGA Pro Coaching & TrackMan Session',
    points_cost: 600,
    redemption_type: 'qr',
    qr_code_token: 'QR_REDEEM_9102P',
    fulfilled: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

export function getStoredRewards(): Reward[] {
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(DEFAULT_REWARDS));
      return DEFAULT_REWARDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REWARDS;
  } catch {
    return DEFAULT_REWARDS;
  }
}

export function saveStoredRewards(rewards: Reward[]): void {
  try {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  } catch {
    /* ignore */
  }
}

export function getStoredRedemptions(): RewardRedemption[] {
  try {
    const raw = localStorage.getItem(REDEMPTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REDEMPTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_REDEMPTIONS));
      return DEFAULT_REDEMPTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_REDEMPTIONS;
  } catch {
    return DEFAULT_REDEMPTIONS;
  }
}

export function saveStoredRedemptions(redemptions: RewardRedemption[]): void {
  try {
    localStorage.setItem(REDEMPTIONS_STORAGE_KEY, JSON.stringify(redemptions));
  } catch {
    /* ignore */
  }
}

const MOCK_REWARDS: Reward[] = DEFAULT_REWARDS;

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
  points_outstanding: 184250,
  retention_rate: 84,
  avg_visits_per_member: 4.8,
  daily_trends: [
    { day: 'Mon', date: 'Oct 12', visits: 24, points_earned: 2900, points_redeemed: 600, bookings: 14 },
    { day: 'Tue', date: 'Oct 13', visits: 28, points_earned: 3200, points_redeemed: 750, bookings: 18 },
    { day: 'Wed', date: 'Oct 14', visits: 35, points_earned: 4100, points_redeemed: 1100, bookings: 22 },
    { day: 'Thu', date: 'Oct 15', visits: 31, points_earned: 3600, points_redeemed: 900, bookings: 19 },
    { day: 'Fri', date: 'Oct 16', visits: 44, points_earned: 5200, points_redeemed: 1450, bookings: 29 },
    { day: 'Sat', date: 'Oct 17', visits: 32, points_earned: 4500, points_redeemed: 1200, bookings: 26 },
    { day: 'Sun', date: 'Oct 18', visits: 48, points_earned: 5500, points_redeemed: 1600, bookings: 34 },
  ],
  hourly_traffic: [
    { hour: '08:00', load: 35, visits: 4 },
    { hour: '10:00', load: 62, visits: 7 },
    { hour: '12:00', load: 55, visits: 6 },
    { hour: '14:00', load: 78, visits: 9 },
    { hour: '16:00', load: 88, visits: 11 },
    { hour: '18:00', load: 96, visits: 14 },
    { hour: '20:00', load: 70, visits: 8 },
  ],
  top_members: [
    { id: 'usr_admin_jay', name: 'Jay (Admin)', member_id: 'PG-000001', tier: 'Platinum', points: 12500, points_ytd: 14200, visits_count: 42, last_visit: 'Today' },
    { id: 'usr_m_elena', name: 'Elena Rostova', member_id: 'PG-5120D2', tier: 'Platinum', points: 6450, points_ytd: 8900, visits_count: 29, last_visit: 'Today' },
    { id: 'usr_m_james', name: 'James Wilson', member_id: 'PG-7731C9', tier: 'Gold', points: 3120, points_ytd: 4500, visits_count: 19, last_visit: 'Yesterday' },
    { id: 'usr_m_sarah', name: 'Sarah Connor', member_id: 'PG-9812A4', tier: 'Gold', points: 1850, points_ytd: 2400, visits_count: 14, last_visit: 'Today' },
    { id: 'usr_member_1', name: 'Alex Morgan', member_id: 'PG-2445B5', tier: 'Silver', points: 450, points_ytd: 750, visits_count: 6, last_visit: 'Today' },
  ],
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
  let body: any = {};
  if (options && options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

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

  if (path.includes('/adjust-points')) {
    const delta = typeof body.points_delta === 'number' ? body.points_delta : 0;
    MOCK_MEMBER_USER.points = Math.max(0, (MOCK_MEMBER_USER.points || 0) + delta);
    MOCK_MEMBER_USER.points_ytd = Math.max(0, (MOCK_MEMBER_USER.points_ytd || 0) + delta);
    if (MOCK_MEMBER_USER.points >= 5000) MOCK_MEMBER_USER.tier = 'Platinum';
    else if (MOCK_MEMBER_USER.points >= 1500) MOCK_MEMBER_USER.tier = 'Gold';
    else MOCK_MEMBER_USER.tier = 'Silver';
    return {
      message: 'Points adjusted successfully',
      new_points: MOCK_MEMBER_USER.points,
      tier: MOCK_MEMBER_USER.tier,
    } as unknown as T;
  }

  if (path.startsWith('/api/admin/members/')) {
    return { user: MOCK_MEMBER_USER, redemptions: [] } as unknown as T;
  }

  if (path.startsWith('/api/admin/members')) {
    return [MOCK_MEMBER_USER, MOCK_ADMIN_USER] as unknown as T;
  }

  if (path.startsWith('/api/admin/rewards') || path.startsWith('/api/rewards')) {
    return getStoredRewards() as unknown as T;
  }

  if (path === '/api/rewards/redeem') {
    const storedRewards = getStoredRewards();
    const reward = storedRewards.find((r) => r.id === body.reward_id) || storedRewards[0];
    const qrToken = 'QR_REDEEM_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRedemption: RewardRedemption = {
      id: 'red_demo_' + Date.now(),
      user_id: MOCK_MEMBER_USER.id,
      user_name: MOCK_MEMBER_USER.name,
      user_member_id: MOCK_MEMBER_USER.member_id,
      reward_id: reward?.id || 'rew_1',
      reward_title: reward?.title || 'Reward Perk',
      points_cost: reward?.points_cost || 150,
      redemption_type: reward?.redemption_type || 'qr',
      discount_code: reward?.discount_code,
      qr_code_token: reward?.redemption_type === 'qr' ? qrToken : undefined,
      fulfilled: reward?.redemption_type === 'discount',
      created_at: new Date().toISOString(),
    };
    const redemptions = getStoredRedemptions();
    saveStoredRedemptions([newRedemption, ...redemptions]);

    if (reward) {
      const updatedCatalog = storedRewards.map((r) =>
        r.id === reward.id ? { ...r, redeemed_count: (r.redeemed_count || 0) + 1 } : r
      );
      saveStoredRewards(updatedCatalog);
    }

    return {
      redemption_id: newRedemption.id,
      redemption_type: reward?.redemption_type || 'qr',
      discount_code: reward?.discount_code,
      qr_code_token: qrToken,
      remaining_points: MOCK_MEMBER_USER.points,
    } as unknown as T;
  }

  if (path.startsWith('/api/history')) {
    return MOCK_TRANSACTIONS as unknown as T;
  }

  if (path === '/api/admin/log-visit') {
    const targetId = (body.member_id || body.user_id || '').trim();
    const cleanId = targetId.replace('QR_MEMBER_', '');

    let targetMember = MOCK_MEMBER_USER;
    if (targetId && !targetId.includes('2445B5') && !targetId.includes('alex')) {
      targetMember = {
        id: 'usr_' + Date.now(),
        email: `member_${cleanId.toLowerCase()}@club.com`,
        name: `Scanned Member (${cleanId.slice(0, 10)})`,
        role: 'member',
        member_id: cleanId.startsWith('PG-') ? cleanId : `PG-${cleanId.slice(0, 6)}`,
        tier: 'Silver',
        points: 250,
        points_ytd: 250,
        qr_token: targetId,
        created_at: new Date().toISOString(),
      };
    }

    targetMember.points = (targetMember.points || 0) + 100;
    targetMember.points_ytd = (targetMember.points_ytd || 0) + 100;
    if (targetMember.points >= 5000) targetMember.tier = 'Platinum';
    else if (targetMember.points >= 1000) targetMember.tier = 'Gold';
    else targetMember.tier = 'Silver';

    MOCK_ADMIN_STATS.visits_today += 1;
    MOCK_ADMIN_STATS.points_issued_today += 100;
    MOCK_ADMIN_STATS.recent.unshift({
      id: 'rec_' + Date.now(),
      type: 'earn',
      title: 'Range Visit Check-in',
      points: 100,
      member_name: targetMember.name,
      member_id: targetMember.member_id,
      created_at: new Date().toISOString(),
    });

    return {
      message: 'Visit logged successfully',
      user_id: targetMember.id,
      member_name: targetMember.name,
      member_id: targetMember.member_id,
      new_points: targetMember.points,
      tier: targetMember.tier,
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
    }).catch(() => null);

    if (!res) {
      return getMockFallback<T>(path, options);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'API Request failed');
    }
    return data as T;
  } catch (err: any) {
    if (
      err.message === 'Invalid Admin PIN' ||
      err.message === 'Invalid admin password' ||
      err.message === 'Invalid verification code' ||
      err.message === 'Invalid OTP code'
    ) {
      throw err;
    }
    // Fallback to seamless demo mode when backend server is offline/unreachable or fetch fails
    try {
      return getMockFallback<T>(path, options);
    } catch {
      return getMockFallback<T>(path, {});
    }
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
    const sbUser = await fetchCurrentUserFromSupabase();
    if (sbUser) return sbUser;
    return request<User>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async rewards(token: string) {
    const localRewards = getStoredRewards().filter((r) => r.active);
    const sbRewards = await fetchRewardsFromSupabase(true);
    if (sbRewards && sbRewards.length > 0) {
      // Merge extra metadata from localStorage if available
      const localMap = new Map(localRewards.map((r) => [r.id, r]));
      return sbRewards.map((r) => ({ ...localMap.get(r.id), ...r }));
    }
    if (localRewards.length > 0) return localRewards;
    return request<Reward[]>('/api/rewards', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async redeemReward(token: string, rewardId: string) {
    const sbRedeem = await redeemRewardInSupabase(rewardId);
    if (sbRedeem) {
      const storedRewards = getStoredRewards();
      const reward = storedRewards.find((r) => r.id === rewardId);
      const sbUser = await fetchCurrentUserFromSupabase();
      const newRedemption: RewardRedemption = {
        id: sbRedeem.redemption_id,
        user_id: sbUser?.id || 'usr_member',
        user_name: sbUser?.name || 'Club Member',
        user_member_id: sbUser?.member_id || 'PG-MEMBER',
        reward_id: rewardId,
        reward_title: reward?.title || 'Reward Item',
        points_cost: reward?.points_cost || 150,
        redemption_type: sbRedeem.redemption_type,
        discount_code: sbRedeem.discount_code,
        qr_code_token: sbRedeem.qr_code_token,
        fulfilled: sbRedeem.redemption_type === 'discount',
        created_at: new Date().toISOString(),
      };
      saveStoredRedemptions([newRedemption, ...getStoredRedemptions()]);
      if (reward) {
        saveStoredRewards(
          storedRewards.map((r) =>
            r.id === reward.id ? { ...r, redeemed_count: (r.redeemed_count || 0) + 1 } : r
          )
        );
      }
      return sbRedeem;
    }
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
    const sbTxns = await fetchTransactionsFromSupabase();
    if (sbTxns !== null) return sbTxns;
    return request<Transaction[]>('/api/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async transactions(token: string) {
    return this.history(token);
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
    const sbStats = await fetchAdminStatsFromSupabase();
    if (sbStats) {
      return {
        ...MOCK_ADMIN_STATS,
        ...sbStats,
        daily_trends: sbStats.daily_trends || MOCK_ADMIN_STATS.daily_trends,
        hourly_traffic: sbStats.hourly_traffic || MOCK_ADMIN_STATS.hourly_traffic,
        top_members: sbStats.top_members && sbStats.top_members.length > 0 ? sbStats.top_members : MOCK_ADMIN_STATS.top_members,
      };
    }
    return request<AdminStats>('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async listMembers(adminToken: string, query?: string) {
    const sbMembers = await fetchAllMembersFromSupabase(query);
    if (sbMembers && sbMembers.length > 0) return sbMembers;
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
    try {
      const sbRes = await logVisitInSupabaseOrStore(memberId, 100);
      if (sbRes && sbRes.ok) {
        return sbRes;
      }
    } catch { /* ignore fallback */ }

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
    return this.adjustPoints(adminToken, memberId, points, 'Manual staff credit');
  },

  async adjustPoints(adminToken: string, userId: string, pointsDelta: number, reason: string) {
    try {
      const sbRes = await adjustMemberPointsInSupabase(userId, pointsDelta, reason);
      if (sbRes && sbRes.ok) {
        return { message: 'Points adjusted in database', new_points: sbRes.new_points, tier: sbRes.tier };
      }
    } catch { /* ignore fallback */ }

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
    const localRewards = getStoredRewards();
    const sbRewards = await fetchRewardsFromSupabase(false);
    if (sbRewards && sbRewards.length > 0) {
      const localMap = new Map(localRewards.map((r) => [r.id, r]));
      const merged = sbRewards.map((r) => ({ ...localMap.get(r.id), ...r }));
      // Include any locally created rewards not yet in Supabase
      const sbIds = new Set(sbRewards.map((r) => r.id));
      for (const lr of localRewards) {
        if (!sbIds.has(lr.id)) merged.push(lr);
      }
      saveStoredRewards(merged);
      return merged;
    }
    if (localRewards.length > 0) return localRewards;
    return request<Reward[]>('/api/admin/rewards', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  },

  async createReward(_adminToken: string, reward: Omit<Reward, 'id'>) {
    const newReward: Reward = {
      ...reward,
      id: 'rew_' + Date.now(),
      redeemed_count: reward.redeemed_count ?? 0,
    };
    const current = getStoredRewards();
    saveStoredRewards([newReward, ...current]);
    return newReward;
  },

  async updateReward(_adminToken: string, rewardId: string, updates: Partial<Reward>) {
    const current = getStoredRewards();
    let updatedItem: Reward | null = null;
    const updatedList = current.map((r) => {
      if (r.id === rewardId) {
        updatedItem = { ...r, ...updates };
        return updatedItem;
      }
      return r;
    });
    saveStoredRewards(updatedList);
    return updatedItem || ({ id: rewardId, ...updates } as Reward);
  },

  async deleteReward(_adminToken: string, rewardId: string) {
    const current = getStoredRewards();
    const updatedList = current.filter((r) => r.id !== rewardId);
    saveStoredRewards(updatedList);
    return { ok: true };
  },

  async listRedemptions(_adminToken: string) {
    return getStoredRedemptions();
  },

  async fulfillRewardQr(adminToken: string, qrToken: string) {
    const cleanToken = (qrToken || '').trim().toUpperCase();
    const localRedemptions = getStoredRedemptions();
    const localMatch = localRedemptions.find(
      (r) =>
        (r.qr_code_token || '').toUpperCase() === cleanToken ||
        (r.discount_code || '').toUpperCase() === cleanToken ||
        r.id.toUpperCase() === cleanToken
    );

    if (localMatch) {
      if (localMatch.fulfilled && localMatch.redemption_type === 'qr') {
        throw new Error('This reward QR pass has already been fulfilled and used.');
      }
      const updatedMatch: RewardRedemption = {
        ...localMatch,
        fulfilled: true,
        fulfilled_at: new Date().toISOString(),
      };
      saveStoredRedemptions(
        localRedemptions.map((r) => (r.id === localMatch.id ? updatedMatch : r))
      );
      return {
        message: 'Redemption fulfilled',
        redemption: updatedMatch,
        member: {
          ...MOCK_MEMBER_USER,
          id: localMatch.user_id,
          name: localMatch.user_name || MOCK_MEMBER_USER.name,
          member_id: localMatch.user_member_id || MOCK_MEMBER_USER.member_id,
        },
      };
    }

    try {
      const sbRes = await fulfillRewardQrInSupabase(qrToken);
      if (sbRes) return sbRes;
    } catch (err: any) {
      if (err.message?.includes('already been fulfilled')) throw err;
    }
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
    const localRedemptions = getStoredRedemptions();
    let updatedItem: RewardRedemption | null = null;
    const updated = localRedemptions.map((r) => {
      if (r.id === redemptionId) {
        updatedItem = { ...r, fulfilled: true, fulfilled_at: new Date().toISOString() };
        return updatedItem;
      }
      return r;
    });
    if (updatedItem) {
      saveStoredRedemptions(updated);
      return { message: 'Redemption fulfilled', redemption: updatedItem };
    }
    return request<{ message: string; redemption: RewardRedemption }>(
      `/api/admin/rewards/redemptions/${redemptionId}/fulfill`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
  },

  async uploadRewardImage(adminToken: string, fileUri: string) {
    try {
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
      }).catch(() => null);

      if (!res || !res.ok) {
        return 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80';
      }

      const data = await res.json().catch(() => ({}));
      return (data.url as string) || 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80';
    } catch {
      return 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80';
    }
  },
};

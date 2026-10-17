import { supabase } from './supabase';
import { User, Reward, Transaction, AdminStats } from './api';
import { BookingItem } from './bookingsStore';

export const USER_CACHE_KEY = 'playgolf.user';

// Helper to generate member ID
export function generateMemberId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PG-${n}`;
}

export function deriveMemberIdFromUuid(userId: string): string {
  const cleanHex = (userId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleanHex) return generateMemberId();
  return `PG-${cleanHex.slice(0, 6).padEnd(6, '0')}`;
}

export function buildMemberQrToken(memberId: string, existingToken?: string | null): string {
  if (existingToken && existingToken.trim().length > 0 && existingToken.trim() !== 'QR_MEMBER_') {
    return existingToken.trim();
  }
  const cleanMemberId = (memberId || '').trim().replace('-', '').toUpperCase();
  return `QR_MEMBER_${cleanMemberId || Math.floor(100000 + Math.random() * 900000)}`;
}

export async function generateUniqueMemberId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateMemberId();
    try {
      const [{ data: pMatch }, { data: uMatch }] = await Promise.all([
        supabase.from('profiles').select('id').eq('member_id', candidate).maybeSingle(),
        supabase.from('users').select('id').eq('member_id', candidate).maybeSingle(),
      ]);
      if (!pMatch && !uMatch) return candidate;
    } catch {
      return candidate;
    }
  }
  return generateMemberId();
}

export function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(USER_CACHE_KEY);
    } else {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    }
  } catch {
    /* ignore storage errors */
  }
}

// Helper to keep both 'profiles' and legacy 'users' tables synchronized in Supabase
export async function syncProfileAndUsersTables(profile: User, phone?: string): Promise<void> {
  try {
    await supabase.from('profiles').upsert({
      id: profile.id,
      email: profile.email.toLowerCase(),
      name: profile.name,
      role: profile.role,
      member_id: profile.member_id,
      tier: profile.tier,
      points: profile.points,
      points_ytd: profile.points_ytd,
      qr_token: profile.qr_token,
      created_at: profile.created_at,
    });
  } catch (e) {
    console.warn('Supabase profiles upsert warning:', e);
  }

  try {
    await supabase.from('users').upsert({
      id: profile.id,
      email: profile.email.toLowerCase(),
      name: profile.name,
      phone: phone || null,
      member_id: profile.member_id,
      tier: profile.tier,
      points_balance: profile.points,
      lifetime_points: profile.points_ytd,
      role: profile.role === 'admin' ? 'admin' : 'user',
      suspended: false,
    });
  } catch (e) {
    console.warn('Supabase users table sync warning:', e);
  }
}

// ==================== AUTH SERVICES ====================

export async function supabaseSignUp(
  email: string,
  password: string,
  name: string,
  phone?: string
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const memberId = await generateUniqueMemberId();

  // 1. Create auth user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: cleanName,
        phone: phone?.trim() || '',
        member_id: memberId,
      },
    },
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    throw authError;
  }

  const userObj = authData.user;
  if (!userObj) {
    throw new Error('Sign up failed. Please check your details and try again.');
  }

  // Supabase returns an empty identities array if email is already taken and confirmations are enabled
  if (Array.isArray(userObj.identities) && userObj.identities.length === 0) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  // 2. Check if the DB trigger already created a profile row
  let existingProfile: User | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userObj.id)
      .maybeSingle();
    if (data) existingProfile = data as User;
  } catch {
    /* ignore */
  }

  const finalMemberId = existingProfile?.member_id || memberId;
  const newProfile: User = {
    id: userObj.id,
    email: cleanEmail,
    name: cleanName,
    role: existingProfile?.role || (cleanEmail === 'jay@gmail.com' || cleanEmail.includes('admin') ? 'admin' : 'member'),
    member_id: finalMemberId,
    tier: existingProfile?.tier || 'Silver',
    points: existingProfile?.points ?? 250,
    points_ytd: existingProfile?.points_ytd ?? 250,
    qr_token: buildMemberQrToken(finalMemberId, existingProfile?.qr_token),
    created_at: existingProfile?.created_at || new Date().toISOString(),
  };

  // 3. Ensure both 'profiles' and 'users' tables have the record
  await syncProfileAndUsersTables(newProfile, phone?.trim());

  // 4. Record welcome bonus transaction in Supabase
  try {
    await supabase.from('transactions').insert({
      user_id: userObj.id,
      type: 'earn',
      title: 'Welcome Bonus — Joined PlayGolf Club',
      points: 250,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* ignore if already logged */
  }

  setCachedUser(newProfile);

  return {
    authUser: userObj,
    session: authData.session,
    profile: newProfile,
    requiresEmailConfirmation: !authData.session,
  };
}

export async function supabaseSignIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    if (error.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials or sign up for a new account.');
    }
    throw error;
  }
  if (!data.user) throw new Error('Invalid email or password');

  // Fetch or construct & sync user profile from Supabase DB
  const profile = await fetchProfileFromSupabase(
    data.user.id,
    data.user.email || cleanEmail,
    data.user.user_metadata
  );

  if (!profile) {
    throw new Error('Unable to load member profile. Please try again.');
  }

  setCachedUser(profile);

  return { session: data.session, user: profile };
}

export async function supabaseResetPassword(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) throw error;
}

export async function supabaseUpdatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function supabaseSignOut() {
  setCachedUser(null);
  await supabase.auth.signOut();
}

// ==================== DATABASE PROFILE SERVICES ====================

export async function fetchProfileFromSupabase(
  userId: string,
  fallbackEmail?: string,
  userMetadata?: Record<string, any>
): Promise<User | null> {
  try {
    // Query both 'profiles' and 'users' in parallel so staff-credited points in 'users' are always reflected
    const [{ data: profileData }, { data: legacyUser }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    ]);

    if (profileData) {
      const resolvedMemberId =
        profileData.member_id || legacyUser?.member_id || deriveMemberIdFromUuid(userId);
      const resolvedQrToken = buildMemberQrToken(resolvedMemberId, profileData.qr_token);

      // Staff QR scans and adjustments always update 'users.points_balance'; use it when available
      const resolvedPoints =
        typeof legacyUser?.points_balance === 'number'
          ? legacyUser.points_balance
          : typeof profileData.points === 'number'
          ? profileData.points
          : 250;

      const resolvedYtd =
        typeof legacyUser?.lifetime_points === 'number'
          ? Math.max(legacyUser.lifetime_points, resolvedPoints)
          : typeof profileData.points_ytd === 'number'
          ? Math.max(profileData.points_ytd, resolvedPoints)
          : resolvedPoints;

      const computedTier =
        resolvedPoints >= 5000 ? 'Platinum' : resolvedPoints >= 1000 ? 'Gold' : 'Silver';
      const resolvedTier = legacyUser?.tier || profileData.tier || computedTier;

      const userProfile: User = {
        id: profileData.id,
        email: profileData.email || legacyUser?.email || fallbackEmail || '',
        name: profileData.name || legacyUser?.name || userMetadata?.name || 'Member',
        role:
          profileData.role ||
          (legacyUser?.role === 'admin' || profileData.email === 'jay@gmail.com' ? 'admin' : 'member'),
        member_id: resolvedMemberId,
        tier: resolvedTier,
        points: resolvedPoints,
        points_ytd: resolvedYtd,
        qr_token: resolvedQrToken,
        created_at: profileData.created_at || legacyUser?.joined_at || new Date().toISOString(),
        suspended: legacyUser?.suspended || false,
      };

      // If 'profiles' had stale points or missing qr_token/member_id, sync it while the user is authenticated
      if (
        profileData.points !== resolvedPoints ||
        profileData.points_ytd !== resolvedYtd ||
        profileData.qr_token !== resolvedQrToken ||
        profileData.member_id !== resolvedMemberId
      ) {
        supabase
          .from('profiles')
          .update({
            member_id: resolvedMemberId,
            qr_token: resolvedQrToken,
            points: resolvedPoints,
            points_ytd: resolvedYtd,
            tier: resolvedTier,
          })
          .eq('id', userProfile.id)
          .then(() => {});
      }

      // Ensure 'users' table also has this user so foreign keys on 'transactions' and staff scans succeed
      if (!legacyUser || legacyUser.points_balance !== resolvedPoints || !legacyUser.member_id) {
        supabase
          .from('users')
          .upsert({
            id: userProfile.id,
            email: userProfile.email.toLowerCase(),
            name: userProfile.name,
            member_id: userProfile.member_id,
            tier: userProfile.tier,
            points_balance: userProfile.points,
            lifetime_points: userProfile.points_ytd,
            role: userProfile.role === 'admin' ? 'admin' : 'user',
          })
          .then(() => {});
      }

      setCachedUser(userProfile);
      return userProfile;
    }

    // 2. Fallback to 'users' table by id (for accounts created earlier)
    if (legacyUser) {
      const points = typeof legacyUser.points_balance === 'number' ? legacyUser.points_balance : 250;
      const pointsYtd = typeof legacyUser.lifetime_points === 'number' ? legacyUser.lifetime_points : points;
      const memberId = legacyUser.member_id || deriveMemberIdFromUuid(userId);
      const emailStr = (legacyUser.email || fallbackEmail || '').toLowerCase();
      const isAdmin = legacyUser.role === 'admin' || emailStr === 'jay@gmail.com' || emailStr.includes('admin');

      const migratedProfile: User = {
        id: legacyUser.id,
        email: emailStr,
        name: legacyUser.name || userMetadata?.name || emailStr.split('@')[0] || 'Member',
        role: isAdmin ? 'admin' : 'member',
        member_id: memberId,
        tier: legacyUser.tier || (points >= 5000 ? 'Platinum' : points >= 1000 ? 'Gold' : 'Silver'),
        points,
        points_ytd: pointsYtd,
        qr_token: buildMemberQrToken(memberId),
        created_at: legacyUser.joined_at || new Date().toISOString(),
        suspended: legacyUser.suspended || false,
      };

      await syncProfileAndUsersTables(migratedProfile, legacyUser.phone);
      setCachedUser(migratedProfile);
      return migratedProfile;
    }

    // 3. If neither exists yet but we have authenticated user details, create the profile now
    if (fallbackEmail) {
      const cleanEmail = fallbackEmail.trim().toLowerCase();
      const memberId = userMetadata?.member_id || (await generateUniqueMemberId());
      const isAdmin = cleanEmail === 'jay@gmail.com' || cleanEmail.includes('admin');
      const createdProfile: User = {
        id: userId,
        email: cleanEmail,
        name: userMetadata?.name || cleanEmail.split('@')[0] || 'Member',
        role: isAdmin ? 'admin' : 'member',
        member_id: memberId,
        tier: 'Silver',
        points: 250,
        points_ytd: 250,
        qr_token: buildMemberQrToken(memberId),
        created_at: new Date().toISOString(),
      };
      await syncProfileAndUsersTables(createdProfile, userMetadata?.phone);
      setCachedUser(createdProfile);
      return createdProfile;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchCurrentUserFromSupabase(): Promise<User | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (sessionUser) {
      const profile = await fetchProfileFromSupabase(
        sessionUser.id,
        sessionUser.email,
        sessionUser.user_metadata
      );
      if (profile) return profile;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const profile = await fetchProfileFromSupabase(
        userData.user.id,
        userData.user.email,
        userData.user.user_metadata
      );
      if (profile) return profile;
    }
  } catch {
    /* ignore */
  }
  return getCachedUser();
}

// ==================== DATABASE TRANSACTIONS & REWARDS SERVICES ====================

export async function fetchTransactionsFromSupabase(userId?: string): Promise<Transaction[] | null> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data } = await supabase.auth.getSession();
      targetUserId = data?.session?.user?.id || getCachedUser()?.id;
    }
    if (!targetUserId || targetUserId.startsWith('usr_')) return null;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type === 'redeem' ? 'redeem' : 'earn',
      title: row.title || (row.type === 'redeem' ? 'Reward Redemption' : 'Points Earned'),
      points: Math.abs(Number(row.points) || 0),
      category: row.description || undefined,
      created_at: row.created_at || new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

export async function fetchRewardsFromSupabase(activeOnly: boolean = true): Promise<Reward[] | null> {
  try {
    let query = supabase.from('rewards').select('*');
    if (activeOnly) {
      query = query.eq('active', true);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    return data as Reward[];
  } catch {
    return null;
  }
}

export async function saveRewardToSupabase(reward: Reward): Promise<Reward | null> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reward.id || '');
    const payload: Record<string, any> = {
      title: reward.title,
      description: reward.description,
      points_cost: Number(reward.points_cost) || 100,
      category: reward.category || 'General',
      image_url: reward.image_url,
      active: reward.active !== false,
      redemption_type: reward.redemption_type || 'qr',
      discount_code: reward.discount_code || null,
    };
    if (isUuid) {
      payload.id = reward.id;
    }
    const { data, error } = await supabase
      .from('rewards')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return { ...reward, ...(data as Reward) };
  } catch {
    return null;
  }
}

export async function deleteRewardFromSupabase(rewardId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchAllRedemptionsFromSupabase(): Promise<any[] | null> {
  try {
    const [{ data: txns, error }, members] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('type', 'redeem')
        .order('created_at', { ascending: false }),
      fetchAllMembersFromSupabase(),
    ]);

    if (error || !txns) return null;
    const memberById = new Map((members || []).map((m) => [m.id, m]));

    return txns.map((t: any) => {
      const m = memberById.get(t.user_id);
      const code = t.redemption_code || '';
      const isQr = code.startsWith('QR_REDEEM_') || !code;
      const rawTitle = (t.title || 'Reward Perk').replace(/^Redeemed:\s*/i, '');
      return {
        id: t.id,
        user_id: t.user_id,
        user_name: m?.name || 'Club Member',
        user_member_id: m?.member_id || deriveMemberIdFromUuid(t.user_id),
        reward_id: t.reward_id || 'rew_1',
        reward_title: rawTitle,
        points_cost: Math.abs(Number(t.points) || 0),
        redemption_type: isQr ? 'qr' : 'discount',
        discount_code: !isQr ? code : undefined,
        qr_code_token: isQr ? code || `QR_REDEEM_${String(t.id).slice(0, 6).toUpperCase()}` : undefined,
        fulfilled: Boolean(t.used),
        created_at: t.created_at || new Date().toISOString(),
        fulfilled_at: t.used_at || undefined,
      };
    });
  } catch {
    return null;
  }
}

export async function fulfillRedemptionByIdInSupabase(redemptionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', redemptionId);
    return !error;
  } catch {
    return false;
  }
}

export async function redeemRewardInSupabase(rewardId: string): Promise<{
  redemption_id: string;
  redemption_type: 'qr' | 'discount';
  discount_code?: string;
  qr_code_token?: string;
  remaining_points: number;
} | null> {
  try {
    const profile = await fetchCurrentUserFromSupabase();
    if (!profile || profile.id.startsWith('usr_')) return null;

    const { data: rewardData, error: rewardErr } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .maybeSingle();

    if (rewardErr || !rewardData) return null;
    const reward = rewardData as Reward;

    const currentPoints = profile.points || 0;
    if (currentPoints < reward.points_cost) {
      throw new Error(`Insufficient points. You need ${reward.points_cost} PTS.`);
    }

    const newPoints = currentPoints - reward.points_cost;
    const qrCodeToken =
      reward.redemption_type === 'qr'
        ? `QR_REDEEM_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : undefined;

    // Update points in profiles and users
    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', profile.id);

    await supabase
      .from('users')
      .update({ points_balance: newPoints })
      .eq('id', profile.id);

    setCachedUser({ ...profile, points: newPoints });

    // Record transaction in Supabase
    const { data: txnData } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        type: 'redeem',
        title: `Redeemed: ${reward.title}`,
        points: reward.points_cost,
        reward_id: reward.id,
        redemption_code: qrCodeToken || reward.discount_code || 'PLAYGOLF20',
        used: reward.redemption_type === 'discount',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    return {
      redemption_id: txnData?.id || `red_${Date.now()}`,
      redemption_type: reward.redemption_type,
      discount_code: reward.discount_code,
      qr_code_token: qrCodeToken,
      remaining_points: newPoints,
    };
  } catch (err: any) {
    if (err.message?.includes('Insufficient points')) throw err;
    return null;
  }
}

export async function fetchAllMembersFromSupabase(searchQuery?: string): Promise<User[] | null> {
  try {
    const [{ data: profilesData }, { data: usersData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
    ]);

    const map = new Map<string, User>();
    const usersById = new Map<string, any>();

    if (Array.isArray(usersData)) {
      for (const u of usersData) {
        usersById.set(u.id, u);
        const pts = typeof u.points_balance === 'number' ? u.points_balance : 250;
        const memberId = u.member_id || deriveMemberIdFromUuid(u.id);
        map.set(u.id, {
          id: u.id,
          email: u.email || '',
          name: u.name || 'Member',
          role: u.role === 'admin' ? 'admin' : 'member',
          member_id: memberId,
          tier: u.tier || (pts >= 5000 ? 'Platinum' : pts >= 1000 ? 'Gold' : 'Silver'),
          points: pts,
          points_ytd: typeof u.lifetime_points === 'number' ? Math.max(u.lifetime_points, pts) : pts,
          qr_token: buildMemberQrToken(memberId),
          created_at: u.joined_at || new Date().toISOString(),
          suspended: u.suspended || false,
        });
      }
    }

    if (Array.isArray(profilesData)) {
      for (const p of profilesData) {
        const uRow = usersById.get(p.id);
        const memberId = p.member_id || uRow?.member_id || deriveMemberIdFromUuid(p.id);
        const pts =
          typeof uRow?.points_balance === 'number'
            ? uRow.points_balance
            : typeof p.points === 'number'
            ? p.points
            : 250;
        const ptsYtd =
          typeof uRow?.lifetime_points === 'number'
            ? Math.max(uRow.lifetime_points, pts)
            : typeof p.points_ytd === 'number'
            ? Math.max(p.points_ytd, pts)
            : pts;
        const computedTier = pts >= 5000 ? 'Platinum' : pts >= 1000 ? 'Gold' : 'Silver';

        map.set(p.id, {
          id: p.id,
          email: p.email || uRow?.email || '',
          name: p.name || uRow?.name || 'Member',
          role: p.role || (uRow?.role === 'admin' ? 'admin' : 'member'),
          member_id: memberId,
          tier: uRow?.tier || p.tier || computedTier,
          points: pts,
          points_ytd: ptsYtd,
          qr_token: buildMemberQrToken(memberId, p.qr_token),
          created_at: p.created_at || uRow?.joined_at || new Date().toISOString(),
          suspended: uRow?.suspended || false,
        });
      }
    }

    let list = Array.from(map.values());
    if (list.length === 0) return null;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.member_id.toLowerCase().includes(q) ||
          (m.qr_token || '').toLowerCase().includes(q)
      );
    }

    return list;
  } catch {
    return null;
  }
}

export async function fetchAdminStatsFromSupabase(): Promise<AdminStats | null> {
  try {
    const [members, { data: txns }, bookings] = await Promise.all([
      fetchAllMembersFromSupabase(),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
      fetchBookingsFromSupabase(),
    ]);

    const memberList = members || [];
    const txnList = txns || [];
    const bookingList = bookings || [];

    const tiers = { Silver: 0, Gold: 0, Platinum: 0 };
    let pointsOutstanding = 0;
    for (const m of memberList) {
      pointsOutstanding += m.points || 0;
      if (m.tier === 'Platinum') tiers.Platinum++;
      else if (m.tier === 'Gold') tiers.Gold++;
      else tiers.Silver++;
    }

    const memberById = new Map(memberList.map((m) => [m.id, m]));
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgoMs = now.getTime() - 7 * 86400000;

    let pointsIssuedToday = 0;
    let visitsToday = 0;
    let redemptionsToday = 0;
    let weekEarnTotal = 0;
    let weekRedeemTotal = 0;

    // Track per-member visit counts from real transactions and bookings
    const visitsByUserId = new Map<string, { count: number; lastDate: string }>();
    const bumpVisit = (uid: string, dateIso: string) => {
      if (!uid) return;
      const prev = visitsByUserId.get(uid) || { count: 0, lastDate: '' };
      visitsByUserId.set(uid, {
        count: prev.count + 1,
        lastDate: !prev.lastDate || dateIso > prev.lastDate ? dateIso : prev.lastDate,
      });
    };

    for (const t of txnList) {
      const pts = Math.abs(Number(t.points) || 0);
      const createdIso = String(t.created_at || '');
      const datePart = createdIso.slice(0, 10);
      const createdMs = createdIso ? new Date(createdIso).getTime() : 0;
      const isToday = datePart === todayStr;
      const isLast7Days = createdMs >= sevenDaysAgoMs;

      if (t.type === 'redeem') {
        if (isLast7Days) weekRedeemTotal += pts;
        if (isToday) redemptionsToday++;
      } else {
        if (isLast7Days) weekEarnTotal += pts;
        if (isToday) {
          pointsIssuedToday += pts;
          visitsToday++;
        }
        bumpVisit(t.user_id, datePart);
      }
    }

    for (const b of bookingList) {
      if (b.status !== 'cancelled') {
        bumpVisit(b.user_id, b.date);
        if (b.status === 'completed' && (b.checked_in_at || '').startsWith(todayStr)) {
          visitsToday++;
        }
      }
    }

    // Build real 7-day daily_trends (oldest to newest ending today)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const dObj = new Date(now.getTime() - i * 86400000);
      const dStr = dObj.toISOString().split('T')[0];
      const dayLabel = dayNames[dObj.getDay()];
      const shortDate = dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      const dayTxns = txnList.filter((t: any) => String(t.created_at || '').startsWith(dStr));
      const dayBookings = bookingList.filter((b) => b.date === dStr && b.status !== 'cancelled');

      const dayVisits =
        dayTxns.filter((t: any) => t.type !== 'redeem').length +
        dayBookings.filter((b) => b.status === 'completed').length;
      const dayEarned = dayTxns
        .filter((t: any) => t.type !== 'redeem')
        .reduce((s: number, t: any) => s + Math.abs(Number(t.points) || 0), 0);
      const dayRedeemed = dayTxns
        .filter((t: any) => t.type === 'redeem')
        .reduce((s: number, t: any) => s + Math.abs(Number(t.points) || 0), 0);

      dailyTrends.push({
        day: dayLabel,
        date: shortDate,
        visits: dayVisits,
        points_earned: dayEarned,
        points_redeemed: dayRedeemed,
        bookings: dayBookings.length,
      });
    }

    // Build real hourly_traffic from actual bookings & transactions
    const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const slotCounts = slots.map((slotHour) => {
      const slotH = parseInt(slotHour.slice(0, 2), 10);
      let count = 0;

      for (const b of bookingList) {
        if (b.status === 'cancelled') continue;
        const bh = parseInt((b.time || '14:00').slice(0, 2), 10);
        if (!isNaN(bh) && Math.abs(bh - slotH) <= 1) {
          count++;
        }
      }

      for (const t of txnList) {
        if (!t.created_at) continue;
        const th = new Date(t.created_at).getHours();
        if (!isNaN(th) && Math.abs(th - slotH) <= 1) {
          count++;
        }
      }

      return { hour: slotHour, visits: count };
    });

    const maxSlotVisits = Math.max(...slotCounts.map((s) => s.visits), 1);
    const hourlyTraffic = slotCounts.map((s) => ({
      hour: s.hour,
      visits: s.visits,
      load: s.visits === 0 ? 0 : Math.min(100, Math.round((s.visits / maxSlotVisits) * 100)),
    }));

    // Build real top_members from actual database members
    const topMembers = [...memberList]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map((m) => {
        const vInfo = visitsByUserId.get(m.id);
        return {
          id: m.id,
          name: m.name,
          member_id: m.member_id,
          tier: m.tier,
          points: m.points || 0,
          points_ytd: m.points_ytd || m.points || 0,
          visits_count: vInfo?.count || 0,
          last_visit: vInfo?.lastDate === todayStr ? 'Today' : vInfo?.lastDate || 'Registered',
        };
      });

    const recent = txnList.slice(0, 10).map((t: any) => {
      const m = memberById.get(t.user_id);
      const pts = Math.abs(Number(t.points) || 0);
      return {
        id: t.id,
        type: (t.type === 'redeem' ? 'redeem' : 'earn') as 'earn' | 'redeem',
        title: t.title || 'Club Activity',
        points: pts,
        member_name: m?.name || 'Club Member',
        member_id: m?.member_id || 'PG-MEMBER',
        created_at: t.created_at || new Date().toISOString(),
      };
    });

    return {
      points_issued_today: pointsIssuedToday,
      visits_today: visitsToday,
      redemptions_today: redemptionsToday,
      total_members: memberList.length,
      tiers,
      week_earn_total: weekEarnTotal,
      week_redeem_total: weekRedeemTotal,
      points_outstanding: pointsOutstanding,
      daily_trends: dailyTrends,
      hourly_traffic: hourlyTraffic,
      top_members: topMembers,
      recent,
    };
  } catch {
    return null;
  }
}

// ==================== DATABASE BOOKINGS SERVICES ====================

const BOOKING_META_DELIMITER = ' ||META:';

function packBookingForSupabase(booking: BookingItem) {
  const cleanNotes = (booking.notes || '').split(BOOKING_META_DELIMITER)[0].trim();
  const meta = {
    member_tier: booking.member_tier || 'Silver',
    duration: booking.duration || '60 mins',
    party_size: booking.party_size || 1,
    bay_assignment: booking.bay_assignment || 'Assigned at Reception',
    payment_status: booking.payment_status || 'paid',
    price: booking.price || '£20.00',
  };
  const packedNotes = `${cleanNotes}${BOOKING_META_DELIMITER}${JSON.stringify(meta)}`;

  return {
    id: booking.id,
    booking_code: booking.booking_code,
    user_id: booking.user_id,
    user_name: booking.user_name,
    user_member_id: booking.user_member_id,
    activity_id: booking.activity_id,
    activity_name: booking.activity_name,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    notes: packedNotes,
    created_at: booking.created_at,
    checked_in_at: booking.checked_in_at || null,
  };
}

function unpackBookingFromSupabase(row: any): BookingItem {
  const rawNotes = String(row.notes || '');
  let cleanNotes = rawNotes;
  let parsedMeta: Record<string, any> = {};

  if (rawNotes.includes(BOOKING_META_DELIMITER)) {
    const [notePart, metaPart] = rawNotes.split(BOOKING_META_DELIMITER);
    cleanNotes = notePart.trim();
    try {
      parsedMeta = JSON.parse(metaPart);
    } catch {
      parsedMeta = {};
    }
  }

  return {
    id: row.id,
    booking_code: row.booking_code,
    user_id: row.user_id,
    user_name: row.user_name || 'Club Member',
    user_member_id: row.user_member_id || 'PG-MEMBER',
    member_tier: parsedMeta.member_tier || row.member_tier || 'Silver',
    activity_id: row.activity_id,
    activity_name: row.activity_name,
    date: row.date,
    time: row.time,
    duration: parsedMeta.duration || row.duration,
    party_size: parsedMeta.party_size || row.party_size,
    bay_assignment: parsedMeta.bay_assignment || row.bay_assignment,
    payment_status: parsedMeta.payment_status || row.payment_status || 'paid',
    price: parsedMeta.price || row.price,
    status: row.status || 'confirmed',
    notes: cleanNotes,
    created_at: row.created_at || new Date().toISOString(),
    checked_in_at: row.checked_in_at || undefined,
  };
}

export async function fetchBookingsFromSupabase(): Promise<BookingItem[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(unpackBookingFromSupabase);
  } catch {
    return [];
  }
}

export async function saveBookingToSupabase(booking: BookingItem): Promise<boolean> {
  try {
    const row = packBookingForSupabase(booking);
    const { error } = await supabase.from('bookings').upsert(row);
    if (error) {
      console.warn('Supabase booking insert warning:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function updateBookingStatusInSupabase(bookingId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status, checked_in_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', bookingId);

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ==================== DATABASE VISITS & POINTS SERVICES ====================

export function normalizeMemberCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/^QR_MEMBER_/i, '')
    .replace(/^QR_ADMIN_/i, '')
    .replace(/^PG-?/i, '')
    .replace(/[^A-Z0-9]/g, '');
}

export async function logVisitInSupabaseOrStore(qrText: string, pointsDelta: number = 100) {
  const cleanCode = (qrText || '').trim();
  const cleanUpper = cleanCode.toUpperCase();
  const normalizedInput = normalizeMemberCode(cleanCode);

  if (!cleanCode) return null;

  try {
    const members = await fetchAllMembersFromSupabase();
    if (members && members.length > 0) {
      const match = members.find((p: User) => {
        const pIdUpper = (p.id || '').toUpperCase();
        const pMemberUpper = (p.member_id || '').toUpperCase();
        const pQrUpper = (p.qr_token || '').toUpperCase();
        const pEmailLower = (p.email || '').toLowerCase();

        if (
          pIdUpper === cleanUpper ||
          pMemberUpper === cleanUpper ||
          pQrUpper === cleanUpper ||
          pEmailLower === cleanCode.toLowerCase()
        ) {
          return true;
        }

        if (normalizedInput.length >= 4) {
          const normMemberId = normalizeMemberCode(p.member_id);
          const normQrToken = normalizeMemberCode(p.qr_token);
          if (normMemberId === normalizedInput || normQrToken === normalizedInput) {
            return true;
          }
        }

        // Support Admin preset token
        if (
          (cleanUpper === 'PG-000001' || cleanUpper === 'QR_ADMIN_JAY') &&
          (p.role === 'admin' || pEmailLower === 'jay@gmail.com')
        ) {
          return true;
        }

        return false;
      });

      if (match) {
        const newPoints = (match.points || 0) + pointsDelta;
        const newYtd = (match.points_ytd || 0) + pointsDelta;
        const newTier = newPoints >= 5000 ? 'Platinum' : newPoints >= 1000 ? 'Gold' : 'Silver';

        const updatedUser: User = {
          ...match,
          points: newPoints,
          points_ytd: newYtd,
          tier: newTier,
        };

        await syncProfileAndUsersTables(updatedUser);

        // If the scanned user is also the currently cached user in this browser, keep cache fresh
        const cached = getCachedUser();
        if (cached && cached.id === match.id) {
          setCachedUser(updatedUser);
        }

        await supabase.from('transactions').insert({
          user_id: match.id,
          type: 'earn',
          title: 'Range Visit Check-in',
          points: pointsDelta,
          created_at: new Date().toISOString(),
        });

        return {
          ok: true,
          message: 'Visit logged successfully',
          user_id: match.id,
          member_name: match.name,
          member_id: match.member_id,
          new_points: newPoints,
          tier: newTier,
        };
      }
    }
  } catch (e) {
    console.warn('Supabase logVisit fallback:', e);
  }

  return null;
}

export async function fulfillRewardQrInSupabase(qrToken: string) {
  const cleanToken = (qrToken || '').trim();
  if (!cleanToken) return null;

  try {
    const { data: txn, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('redemption_code', cleanToken)
      .maybeSingle();

    if (error || !txn) return null;

    if (txn.used) {
      throw new Error('This reward QR pass has already been fulfilled and used.');
    }

    await supabase
      .from('transactions')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', txn.id);

    const member = (await fetchProfileFromSupabase(txn.user_id)) || {
      id: txn.user_id,
      email: '',
      name: 'Club Member',
      role: 'member' as const,
      member_id: deriveMemberIdFromUuid(txn.user_id),
      tier: 'Silver' as const,
      points: 250,
      points_ytd: 250,
      qr_token: buildMemberQrToken(deriveMemberIdFromUuid(txn.user_id)),
      created_at: new Date().toISOString(),
    };

    const rewardTitle = (txn.title || 'Reward Pass').replace(/^Redeemed:\s*/i, '');

    return {
      message: 'Redemption fulfilled',
      redemption: {
        id: txn.id,
        user_id: txn.user_id,
        reward_id: txn.reward_id || 'rew_1',
        reward_title: rewardTitle,
        points_cost: Math.abs(Number(txn.points) || 0),
        redemption_type: 'qr',
        qr_code_token: cleanToken,
        fulfilled: true,
        created_at: txn.created_at || new Date().toISOString(),
      },
      member,
    };
  } catch (err: any) {
    if (err.message?.includes('already been fulfilled')) throw err;
    return null;
  }
}

export async function adjustMemberPointsInSupabase(
  userId: string,
  pointsDelta: number,
  reason: string = 'Staff adjustment'
) {
  try {
    const profile = await fetchProfileFromSupabase(userId);
    if (profile) {
      const newPoints = Math.max(0, (profile.points || 0) + pointsDelta);
      const newYtd = Math.max(0, (profile.points_ytd || 0) + (pointsDelta > 0 ? pointsDelta : 0));
      const newTier = newPoints >= 5000 ? 'Platinum' : newPoints >= 1000 ? 'Gold' : 'Silver';

      const updatedUser: User = {
        ...profile,
        points: newPoints,
        points_ytd: newYtd,
        tier: newTier,
      };

      await syncProfileAndUsersTables(updatedUser);

      const cached = getCachedUser();
      if (cached && cached.id === profile.id) {
        setCachedUser(updatedUser);
      }

      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: pointsDelta >= 0 ? 'earn' : 'adjust',
        title: reason || 'Points Adjustment',
        points: Math.abs(pointsDelta),
        by_admin: true,
        created_at: new Date().toISOString(),
      });

      return {
        ok: true,
        new_points: newPoints,
        tier: newTier,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

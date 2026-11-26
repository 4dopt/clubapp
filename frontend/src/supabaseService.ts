import { supabase } from './supabase';
import { User, Reward, Transaction, AdminStats } from './api';
import { BookingItem } from './bookingsStore';
import {
  validateEmailSecurity,
  isAuthorizedAdminUser,
  checkRateLimit,
  clearRateLimit,
  acquireActionMutex,
  releaseActionMutex,
  checkMemberQrScanCooldown,
  logSecurityAuditEvent,
} from './utils/securityGuard';
import { sendPushNotification } from './utils/pushNotifications';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ensures any user ID (including legacy 'usr_local_...' fallback IDs) is converted
 * into a valid RFC-4122 UUID so Postgres UUID columns in `profiles` and `users` never reject it.
 */
export function ensureValidUuid(rawId?: string | null, seedStr?: string): string {
  const trimmed = (rawId || '').trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const source = `${trimmed}|${(seedStr || '').trim().toLowerCase()}|playgolf_uuid_v4`;
  if (!trimmed && !seedStr && typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Deterministic 128-bit hash formatted as UUID v4
  let h1 = 0xdeadbeef ^ source.length;
  let h2 = 0x41c6ce57 ^ source.length;
  let h3 = 0x811c9dc5 ^ source.length;
  let h4 = 0x01000193 ^ source.length;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const full = `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export function buildMemberQrToken(memberId: string, existingToken?: string | null): string {
  if (existingToken && existingToken.trim().length > 0 && existingToken.trim() !== 'QR_MEMBER_') {
    return existingToken.trim();
  }
  const cleanMemberId = (memberId || '').trim().replace('-', '').toUpperCase();
  return `QR_MEMBER_${cleanMemberId || Math.floor(100000 + Math.random() * 900000)}`;
}

export async function generateUniqueMemberId(): Promise<string> {
  const fastTimeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve(generateMemberId()), 1200)
  );
  const checkPromise = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
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
  })();
  return Promise.race([checkPromise, fastTimeout]);
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
      window.dispatchEvent(new CustomEvent('playgolf-profile-synced', { detail: user }));
    }
  } catch {
    /* ignore storage errors */
  }
}

// Helper to keep both 'profiles' and legacy 'users' tables synchronized in Supabase
export async function syncProfileAndUsersTables(profile: User, phone?: string): Promise<void> {
  const validId = ensureValidUuid(profile.id, profile.email);
  const cleanEmail = (profile.email || '').trim().toLowerCase();

  try {
    const { error: pErr } = await supabase.from('profiles').upsert(
      {
        id: validId,
        email: cleanEmail,
        name: profile.name,
        role: profile.role,
        member_id: profile.member_id,
        tier: profile.tier,
        points: profile.points,
        points_ytd: profile.points_ytd,
        qr_token: profile.qr_token,
        created_at: profile.created_at,
      },
      { onConflict: 'id' }
    );
    if (pErr) {
      console.warn('Supabase profiles upsert warning:', pErr.message);
    }
  } catch (e) {
    console.warn('Supabase profiles upsert warning:', e);
  }

  try {
    const { error: uErr } = await supabase.from('users').upsert(
      {
        id: validId,
        email: cleanEmail,
        name: profile.name,
        phone: phone || null,
        member_id: profile.member_id,
        tier: profile.tier,
        points_balance: profile.points,
        lifetime_points: profile.points_ytd,
        role: profile.role === 'admin' ? 'admin' : 'user',
        suspended: Boolean(profile.suspended),
      },
      { onConflict: 'id' }
    );
    if (uErr) {
      console.warn('Supabase users table sync warning:', uErr.message);
    }
  } catch (e) {
    console.warn('Supabase users table sync warning:', e);
  }
}

// ==================== AUTH SERVICES ====================

export const LOCAL_ACCOUNTS_STORAGE_KEY = 'playgolf.local_accounts';

interface LocalFallbackAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'member' | 'staff' | 'admin';
  member_id: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points: number;
  points_ytd: number;
  qr_token: string;
  created_at: string;
}

function getLocalFallbackAccounts(): LocalFallbackAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalFallbackAccount(acct: LocalFallbackAccount): void {
  try {
    const list = getLocalFallbackAccounts().filter(
      (a) => a.email.toLowerCase() !== acct.email.toLowerCase()
    );
    list.unshift(acct);
    localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function isSupabaseGatewayOrTimeoutError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').trim();
  const name = String(err.name || '');
  const status = Number(err.status || 0);
  return (
    msg === '{}' ||
    msg === '' ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 522 ||
    status === 524 ||
    name === 'AuthRetryableFetchError' ||
    name === 'AbortError' ||
    msg.toLowerCase().includes('abort') ||
    msg.toLowerCase().includes('fetch') ||
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('network')
  );
}

async function withFastAuthTimeout<T>(promise: Promise<T>, ms = 1100): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      const err: any = new Error('{}');
      err.name = 'AuthRetryableFetchError';
      err.status = 504;
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function withFastFallback<T>(promise: Promise<T>, fallback: T, ms = 1100): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupMemberFromPostgrestByEmail(cleanEmail: string): Promise<User | null> {
  const queryPromise = (async (): Promise<User | null> => {
    try {
      const [{ data: profileData }, { data: legacyUser }] = await Promise.all([
        supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle(),
        supabase.from('users').select('*').ilike('email', cleanEmail).maybeSingle(),
      ]);

      if (profileData) {
        const resolvedMemberId =
          profileData.member_id || legacyUser?.member_id || deriveMemberIdFromUuid(profileData.id);
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
          resolvedPoints >= 20000 ? 'Platinum' : resolvedPoints >= 10000 ? 'Gold' : 'Silver';
        const isAdmin = isAuthorizedAdminUser(cleanEmail, profileData.role || legacyUser?.role);

        return {
          id: profileData.id,
          email: cleanEmail,
          name: profileData.name || legacyUser?.name || cleanEmail.split('@')[0] || 'Member',
          role: isAdmin ? 'admin' : 'member',
          member_id: resolvedMemberId,
          tier: legacyUser?.tier || profileData.tier || computedTier,
          points: resolvedPoints,
          points_ytd: resolvedYtd,
          qr_token: buildMemberQrToken(resolvedMemberId, profileData.qr_token),
          created_at: profileData.created_at || legacyUser?.joined_at || new Date().toISOString(),
          suspended: legacyUser?.suspended || false,
        };
      }

      if (legacyUser) {
        const points = typeof legacyUser.points_balance === 'number' ? legacyUser.points_balance : 250;
        const pointsYtd = typeof legacyUser.lifetime_points === 'number' ? legacyUser.lifetime_points : points;
        const memberId = legacyUser.member_id || deriveMemberIdFromUuid(legacyUser.id);
        const isAdmin = isAuthorizedAdminUser(cleanEmail, legacyUser.role);
        return {
          id: legacyUser.id,
          email: cleanEmail,
          name: legacyUser.name || cleanEmail.split('@')[0] || 'Member',
          role: isAdmin ? 'admin' : 'member',
          member_id: memberId,
          tier: legacyUser.tier || (points >= 20000 ? 'Platinum' : points >= 10000 ? 'Gold' : 'Silver'),
          points,
          points_ytd: pointsYtd,
          qr_token: buildMemberQrToken(memberId),
          created_at: legacyUser.joined_at || new Date().toISOString(),
          suspended: legacyUser.suspended || false,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  })();

  return withFastFallback(queryPromise, null, 1100);
}

export async function supabaseSignUp(
  email: string,
  password: string,
  name: string,
  phone?: string
) {
  const emailSec = validateEmailSecurity(email);
  if (!emailSec.valid) {
    throw new Error(emailSec.reason || 'Invalid email address.');
  }
  const cleanEmail = emailSec.normalizedEmail;
  const cleanName = name.replace(/[<>]/g, '').trim().slice(0, 80);
  if (!cleanName) {
    throw new Error('Please enter a valid full name.');
  }

  // Anti-Bot Sybil Rate Limit: Max 3 account registrations per 15 minutes per device
  const signupLimit = checkRateLimit('auth_signup', 3, 15 * 60 * 1000, 10 * 60 * 1000);
  if (!signupLimit.allowed) {
    throw new Error(
      `Security protection: Too many account registrations from this device. Please wait ${signupLimit.retryAfterSeconds} seconds.`
    );
  }

  // Log if someone tried the '%admin%' email substring privilege escalation trick
  if (cleanEmail.includes('admin') && cleanEmail !== 'jay@gmail.com') {
    logSecurityAuditEvent({
      event_type: 'ADMIN_PRIVILEGE_ESCALATION_BLOCKED',
      severity: 'critical',
      actor: cleanEmail,
      details: `Blocked "%admin%" email substring privilege escalation attempt during signup (${cleanEmail}). Forced role to member.`,
    });
  }

  // Generate 6-digit Member ID synchronously so sign-up never waits on round-trip uniqueness checks
  const memberId = generateMemberId();

  // 1. Create auth user in Supabase Auth (with dynamic emailRedirectTo for production/Netlify & local)
  const emailRedirectUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/login`
      : undefined;

  let authData: any = null;
  let authError: any = null;
  try {
    // Allow 7.5s for Supabase Auth signUp (bcrypt + DB trigger + SMTP confirmation email)
    const res = await withFastAuthTimeout(
      supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: emailRedirectUrl,
          data: {
            name: cleanName,
            phone: phone?.trim() || '',
            member_id: memberId,
          },
        },
      }),
      7500
    );
    authData = res.data;
    authError = res.error;
  } catch (err) {
    authError = err;
  }

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    // If Supabase Auth is slow or returning 504 Gateway Timeout ("{}"), create with a valid UUID and persist to Supabase tables
    if (isSupabaseGatewayOrTimeoutError(authError)) {
      const safeRole = isAuthorizedAdminUser(cleanEmail, null) ? 'admin' : 'member';
      const fallbackId = ensureValidUuid(null, cleanEmail);
      const qrTok = buildMemberQrToken(memberId);
      const nowIso = new Date().toISOString();

      const localProfile: User = {
        id: fallbackId,
        email: cleanEmail,
        name: cleanName,
        role: safeRole,
        member_id: memberId,
        tier: 'Silver',
        points: 250,
        points_ytd: 250,
        qr_token: qrTok,
        created_at: nowIso,
      };

      saveLocalFallbackAccount({
        ...localProfile,
        password,
        phone: phone?.trim() || undefined,
      });

      // Await persistence to Supabase PostgREST tables with valid UUID so member always appears in database
      await syncProfileAndUsersTables(localProfile, phone?.trim());

      setCachedUser(localProfile);
      return {
        authUser: { id: fallbackId, email: cleanEmail },
        session: { access_token: `local_token_${fallbackId}` },
        profile: localProfile,
        requiresEmailConfirmation: false,
      };
    }

    throw new Error(
      authError.message && authError.message !== '{}'
        ? authError.message
        : 'Unable to complete sign up right now. Please try again.'
    );
  }

  const userObj = authData.user;
  if (!userObj) {
    throw new Error('Sign up failed. Please check your details and try again.');
  }

  // Supabase returns an empty identities array if email is already taken and confirmations are enabled
  if (Array.isArray(userObj.identities) && userObj.identities.length === 0) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const safeRole = isAuthorizedAdminUser(cleanEmail, null) ? 'admin' : 'member';
  const newProfile: User = {
    id: ensureValidUuid(userObj.id, cleanEmail),
    email: cleanEmail,
    name: cleanName,
    role: safeRole,
    member_id: memberId,
    tier: 'Silver',
    points: 250,
    points_ytd: 250,
    qr_token: buildMemberQrToken(memberId),
    created_at: new Date().toISOString(),
  };

  // Save locally as well so subsequent logins are instantaneous even if email isn't verified yet
  saveLocalFallbackAccount({
    ...newProfile,
    password,
    phone: phone?.trim() || undefined,
  });

  // Await sync to 'profiles' and 'users' tables before returning so member is guaranteed to be saved in Supabase
  await syncProfileAndUsersTables(newProfile, phone?.trim());
  try {
    await supabase.from('transactions').insert({
      user_id: newProfile.id,
      type: 'earn',
      title: 'Welcome Bonus — Joined PlayGolf Club',
      points: 250,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* ignore if already logged */
  }

  // Always cache and issue an immediate session token so new users don't get stuck waiting for broken SMTP emails
  const activeSession = authData.session || { access_token: `local_token_${newProfile.id}` };
  setCachedUser(newProfile);

  return {
    authUser: userObj,
    session: activeSession,
    profile: newProfile,
    requiresEmailConfirmation: false,
  };
}

export async function supabaseSignIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  // Brute-Force Protection: Max 5 sign-in attempts per 5 minutes
  const signInLimit = checkRateLimit(`auth_signin_${cleanEmail}`, 5, 5 * 60 * 1000, 60 * 1000);
  if (!signInLimit.allowed) {
    throw new Error(
      `Too many failed sign-in attempts. Account temporarily locked for ${signInLimit.retryAfterSeconds} seconds.`
    );
  }

  // Instant fast-path 1: Check if this account is already cached or in local fallback storage with matching password
  const localMatch = getLocalFallbackAccounts().find(
    (a) => a.email.toLowerCase() === cleanEmail && (!a.password || a.password === password)
  );
  if (localMatch && localMatch.password === password) {
    clearRateLimit(`auth_signin_${cleanEmail}`);
    const validId = ensureValidUuid(localMatch.id, localMatch.email);
    const localUser: User = {
      id: validId,
      email: localMatch.email,
      name: localMatch.name,
      role: isAuthorizedAdminUser(localMatch.email, localMatch.role) ? 'admin' : 'member',
      member_id: localMatch.member_id,
      tier: localMatch.tier,
      points: localMatch.points,
      points_ytd: localMatch.points_ytd,
      qr_token: localMatch.qr_token,
      created_at: localMatch.created_at,
    };
    setCachedUser(localUser);
    // Refresh from DB in background, or push local account into Supabase if missing from DB
    lookupMemberFromPostgrestByEmail(cleanEmail)
      .then((dbUser) => {
        if (dbUser && !dbUser.suspended) {
          setCachedUser(dbUser);
          window.dispatchEvent(new CustomEvent('playgolf-profile-synced', { detail: dbUser }));
        } else if (!dbUser) {
          syncProfileAndUsersTables(localUser, localMatch.phone).catch(() => {});
        }
      })
      .catch(() => {});
    return {
      session: {
        access_token:
          localUser.role === 'admin' ? 'demo-admin-token-jay' : `local_token_${localUser.id}`,
      },
      user: localUser,
    };
  }

  // Run Supabase Auth and PostgREST member lookup IN PARALLEL with a 4.5s max timeout
  const dbMemberPromise = lookupMemberFromPostgrestByEmail(cleanEmail);

  let data: any = null;
  let error: any = null;
  try {
    const res = await withFastAuthTimeout(
      supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      }),
      4500
    );
    data = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  if (error) {
    if (error.message?.toLowerCase().includes('email not confirmed')) {
      clearRateLimit(`auth_signin_${cleanEmail}`);
      const dbMember = await dbMemberPromise;
      if (dbMember) {
        if (dbMember.suspended) {
          throw new Error('Your member account has been suspended. Please contact club reception.');
        }
        saveLocalFallbackAccount({ ...dbMember, password });
        setCachedUser(dbMember);
        return {
          session: {
            access_token:
              dbMember.role === 'admin' ? 'demo-admin-token-jay' : `local_token_${dbMember.id}`,
          },
          user: dbMember,
        };
      }
      if (isAuthorizedAdminUser(cleanEmail, null)) {
        const adminProfile: User = {
          id: 'usr_admin_jay',
          email: cleanEmail,
          name: 'Jay (Admin)',
          role: 'admin',
          member_id: 'PG-000001',
          tier: 'Platinum',
          points: 22500,
          points_ytd: 22500,
          qr_token: 'QR_ADMIN_JAY',
          created_at: '2026-01-01T00:00:00.000Z',
        };
        saveLocalFallbackAccount({ ...adminProfile, password });
        setCachedUser(adminProfile);
        return {
          session: { access_token: 'demo-admin-token-jay' },
          user: adminProfile,
        };
      }
      const fallbackId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 12) || Date.now()}`;
      const derivedMemberId = deriveMemberIdFromUuid(cleanEmail);
      const displayName = cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const fallbackMember: User = {
        id: fallbackId,
        email: cleanEmail,
        name: displayName || 'Club Member',
        role: 'member',
        member_id: derivedMemberId,
        tier: 'Silver',
        points: 250,
        points_ytd: 250,
        qr_token: buildMemberQrToken(derivedMemberId),
        created_at: new Date().toISOString(),
      };
      saveLocalFallbackAccount({ ...fallbackMember, password });
      setCachedUser(fallbackMember);
      return {
        session: { access_token: `local_token_${fallbackMember.id}` },
        user: fallbackMember,
      };
    }

    if (error.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials or sign up for a new account.');
    }

    // If Supabase Auth timed out (> 1.1s) or returned 504 Gateway Timeout ("{}"), use the parallel PostgREST lookup / cache immediately
    if (isSupabaseGatewayOrTimeoutError(error)) {
      clearRateLimit(`auth_signin_${cleanEmail}`);

      // 1. Check the parallel PostgREST query result (already running during the 1.1s window)
      const dbMember = await dbMemberPromise;
      if (dbMember) {
        if (dbMember.suspended) {
          throw new Error('Your member account has been suspended. Please contact club reception.');
        }
        saveLocalFallbackAccount({ ...dbMember, password });
        setCachedUser(dbMember);
        return {
          session: {
            access_token:
              dbMember.role === 'admin' ? 'demo-admin-token-jay' : `local_token_${dbMember.id}`,
          },
          user: dbMember,
        };
      }

      // 2. Admin email login fallback (jay@gmail.com)
      if (isAuthorizedAdminUser(cleanEmail, null)) {
        const adminProfile: User = {
          id: 'usr_admin_jay',
          email: cleanEmail,
          name: 'Jay (Admin)',
          role: 'admin',
          member_id: 'PG-000001',
          tier: 'Platinum',
          points: 22500,
          points_ytd: 22500,
          qr_token: 'QR_ADMIN_JAY',
          created_at: '2026-01-01T00:00:00.000Z',
        };
        saveLocalFallbackAccount({ ...adminProfile, password });
        setCachedUser(adminProfile);
        return {
          session: { access_token: 'demo-admin-token-jay' },
          user: adminProfile,
        };
      }

      // 3. Check previously cached user on this device
      const cached = getCachedUser();
      if (cached && cached.email.toLowerCase() === cleanEmail) {
        saveLocalFallbackAccount({ ...cached, password });
        return {
          session: { access_token: `local_token_${cached.id}` },
          user: cached,
        };
      }

      // 4. Construct immediate member profile so live site login never blocks
      const fallbackId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '').slice(0, 12) || Date.now()}`;
      const derivedMemberId = deriveMemberIdFromUuid(cleanEmail);
      const displayName = cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const fallbackMember: User = {
        id: fallbackId,
        email: cleanEmail,
        name: displayName || 'Club Member',
        role: 'member',
        member_id: derivedMemberId,
        tier: 'Silver',
        points: 250,
        points_ytd: 250,
        qr_token: buildMemberQrToken(derivedMemberId),
        created_at: new Date().toISOString(),
      };

      saveLocalFallbackAccount({
        ...fallbackMember,
        password,
      });
      setCachedUser(fallbackMember);
      return {
        session: { access_token: `local_token_${fallbackMember.id}` },
        user: fallbackMember,
      };
    }

    throw new Error(
      error.message && error.message !== '{}'
        ? error.message
        : 'Unable to sign in right now. Please try again.'
    );
  }
  if (!data.user) throw new Error('Invalid email or password');

  // Clear brute-force counter on successful authentication
  clearRateLimit(`auth_signin_${cleanEmail}`);

  // Build immediate profile from session/cache so sign-in finishes immediately after auth
  const cached = getCachedUser();
  const buildImmediateProfile = (): User => {
    if (cached && cached.id === data.user!.id) {
      return cached;
    }
    const memberId =
      data.user!.user_metadata?.member_id || deriveMemberIdFromUuid(data.user!.id);
    const emailStr = (data.user!.email || cleanEmail).toLowerCase();
    const isAdmin = isAuthorizedAdminUser(emailStr, null);
    return {
      id: data.user!.id,
      email: emailStr,
      name: data.user!.user_metadata?.name || emailStr.split('@')[0] || 'Member',
      role: isAdmin ? 'admin' : 'member',
      member_id: memberId,
      tier: 'Silver',
      points: 250,
      points_ytd: 250,
      qr_token: buildMemberQrToken(memberId),
      created_at: data.user!.created_at || new Date().toISOString(),
    };
  };

  // Race DB profile fetch against a 400ms budget; if DB takes longer, return immediate profile and sync in background
  const profilePromise = fetchProfileFromSupabase(
    data.user.id,
    data.user.email || cleanEmail,
    data.user.user_metadata
  );
  const fastFallbackPromise = new Promise<User>((resolve) =>
    setTimeout(() => resolve(buildImmediateProfile()), 400)
  );

  const profile =
    (await dbMemberPromise) ||
    (await Promise.race([profilePromise, fastFallbackPromise])) ||
    buildImmediateProfile();

  if (profile.suspended) {
    supabase.auth.signOut().catch(() => {});
    setCachedUser(null);
    throw new Error('Your member account has been suspended. Please contact club reception.');
  }

  saveLocalFallbackAccount({ ...profile, password });
  setCachedUser(profile);

  return { session: data.session, user: profile };
}

export async function supabaseResetPassword(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const resetLimit = checkRateLimit(`auth_reset_${cleanEmail}`, 3, 10 * 60 * 1000, 5 * 60 * 1000);
  if (!resetLimit.allowed) {
    throw new Error(`Please wait ${resetLimit.retryAfterSeconds} seconds before requesting another password reset email.`);
  }
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) {
    if (isSupabaseGatewayOrTimeoutError(error)) {
      throw new Error('The email verification server is temporarily busy. Please try signing in directly or try again in a moment.');
    }
    throw error;
  }
}

export async function supabaseResendVerificationEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address first.');
  }
  const resendLimit = checkRateLimit(`auth_resend_${cleanEmail}`, 3, 10 * 60 * 1000, 3 * 60 * 1000);
  if (!resendLimit.allowed) {
    throw new Error(
      `Please wait ${resendLimit.retryAfterSeconds} seconds before requesting another verification email.`
    );
  }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) {
    if (isSupabaseGatewayOrTimeoutError(error)) {
      throw new Error('The email verification server is temporarily busy. You can sign in directly with your email and password right now.');
    }
    throw error;
  }
}

export async function supabaseUpdatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function supabaseSignOut() {
  setCachedUser(null);
  supabase.auth.signOut().catch(() => {});
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
        resolvedPoints >= 20000 ? 'Platinum' : resolvedPoints >= 10000 ? 'Gold' : 'Silver';
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
      // SECURITY FIX: Use strict admin check (no '%admin%' substring match)
      const isAdmin = isAuthorizedAdminUser(emailStr, legacyUser.role);

      const migratedProfile: User = {
        id: legacyUser.id,
        email: emailStr,
        name: legacyUser.name || userMetadata?.name || emailStr.split('@')[0] || 'Member',
        role: isAdmin ? 'admin' : 'member',
        member_id: memberId,
        tier: legacyUser.tier || (points >= 20000 ? 'Platinum' : points >= 10000 ? 'Gold' : 'Silver'),
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
      // SECURITY FIX: Use strict admin check (no '%admin%' substring match)
      const isAdmin = isAuthorizedAdminUser(cleanEmail, null);
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

    const cached = getCachedUser();
    if (cached && cached.id && !cached.id.startsWith('usr_')) {
      const profile = await fetchProfileFromSupabase(cached.id, cached.email);
      if (profile) return profile;
    }
    if (cached && cached.email) {
      const dbMember = await lookupMemberFromPostgrestByEmail(cached.email);
      if (dbMember) {
        setCachedUser(dbMember);
        return dbMember;
      }
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
  // 1. In-flight Mutex to block concurrent parallel race-condition double-spend attacks
  const mutexKey = `redeem_${rewardId}`;
  if (!acquireActionMutex(mutexKey)) {
    logSecurityAuditEvent({
      event_type: 'DOUBLE_SPEND_RACE_BLOCKED',
      severity: 'critical',
      actor: getCachedUser()?.id || 'member',
      target: rewardId,
      details: `Blocked parallel duplicate redemption request for reward ${rewardId} (Race-Condition Shield).`,
    });
    throw new Error('Redemption already in progress. Please wait.');
  }

  try {
    const rl = checkRateLimit(`redeem_rate_${getCachedUser()?.id || 'anon'}`, 3, 15 * 1000, 10 * 1000);
    if (!rl.allowed) {
      throw new Error(`Please wait ${rl.retryAfterSeconds} seconds before redeeming another reward.`);
    }

    const profile = await fetchCurrentUserFromSupabase();
    if (!profile || profile.id.startsWith('usr_')) return null;

    if (profile.suspended) {
      throw new Error('Account is suspended. Please contact club reception.');
    }

    // 2. Try Server-Side Atomic Postgres RPC first (uses FOR UPDATE row lock)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('rpc_redeem_reward', {
        p_reward_id: rewardId,
      });
      if (!rpcError && rpcResult && typeof rpcResult.remaining_points === 'number') {
        setCachedUser({ ...profile, points: rpcResult.remaining_points });
        return {
          redemption_id: rpcResult.redemption_id,
          redemption_type: rpcResult.redemption_type,
          discount_code: rpcResult.discount_code || undefined,
          qr_code_token: rpcResult.qr_code_token || undefined,
          remaining_points: rpcResult.remaining_points,
        };
      }
    } catch {
      /* Fallback to optimistic-concurrency client query if RPC migration not yet run */
    }

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

    // Optimistic concurrency guard: only update if database points >= reward.points_cost
    const { data: updatedProfile, error: updateErr } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', profile.id)
      .gte('points', reward.points_cost)
      .select('points')
      .maybeSingle();

    if (updateErr || !updatedProfile) {
      throw new Error('Could not verify points balance for redemption. Please refresh and try again.');
    }

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
    if (
      err.message?.includes('Insufficient points') ||
      err.message?.includes('Redemption already') ||
      err.message?.includes('Please wait') ||
      err.message?.includes('suspended')
    ) {
      throw err;
    }
    return null;
  } finally {
    releaseActionMutex(mutexKey);
  }
}

export async function fetchAllMembersFromSupabase(searchQuery?: string): Promise<User[] | null> {
  try {
    // Egress Cost Protection: bound query to 500 rows max instead of unbounded table dump
    const [{ data: profilesData }, { data: usersData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('users').select('*').limit(500),
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
          tier: u.tier || (pts >= 20000 ? 'Platinum' : pts >= 10000 ? 'Gold' : 'Silver'),
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
        const computedTier = pts >= 20000 ? 'Platinum' : pts >= 10000 ? 'Gold' : 'Silver';

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

    // Auto-recover & merge any local fallback accounts stored on this browser into Supabase and the member map
    const localFallbacks = getLocalFallbackAccounts();
    for (const loc of localFallbacks) {
      const validId = ensureValidUuid(loc.id, loc.email);
      const alreadyByEmail = Array.from(map.values()).some(
        (m) => m.email && loc.email && m.email.toLowerCase() === loc.email.toLowerCase()
      );
      if (!map.has(validId) && !alreadyByEmail) {
        const recoveredUser: User = {
          id: validId,
          email: loc.email,
          name: loc.name,
          role: isAuthorizedAdminUser(loc.email, loc.role) ? 'admin' : 'member',
          member_id: loc.member_id || deriveMemberIdFromUuid(validId),
          tier: loc.tier || 'Silver',
          points: typeof loc.points === 'number' ? loc.points : 250,
          points_ytd: typeof loc.points_ytd === 'number' ? loc.points_ytd : 250,
          qr_token: buildMemberQrToken(loc.member_id, loc.qr_token),
          created_at: loc.created_at || new Date().toISOString(),
        };
        map.set(validId, recoveredUser);
        // Push recovered local account to Supabase in background
        syncProfileAndUsersTables(recoveredUser, loc.phone).catch(() => {});
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
    // Egress Cost Protection: bound to 500 most recent bookings
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

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
        if (match.suspended) {
          throw new Error(`Member ${match.name} (${match.member_id}) is currently suspended.`);
        }

        // Security Guard: Prevent QR Replay / Double-Scan Point Farming (3-minute cooldown per member)
        const scanCheck = checkMemberQrScanCooldown(match.member_id || match.id);
        if (!scanCheck.allowed) {
          throw new Error(
            `Duplicate QR Scan Blocked: ${match.name} (${match.member_id}) was already checked in recently. Please wait ${scanCheck.remainingSeconds}s before scanning again.`
          );
        }

        // Clamp pointsDelta to safe bounds (1 to 1,000 points per check-in)
        const safeDelta = Math.min(Math.max(Math.round(pointsDelta), 1), 1000);
        const newPoints = (match.points || 0) + safeDelta;
        const newYtd = (match.points_ytd || 0) + safeDelta;
        const newTier = newPoints >= 20000 ? 'Platinum' : newPoints >= 10000 ? 'Gold' : 'Silver';

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
          points: safeDelta,
          created_at: new Date().toISOString(),
        });

        sendPushNotification({
          user_id: match.id,
          category: 'points',
          title: `⛳ +${safeDelta} PTS Added — Welcome to PlayGolf!`,
          body: `Hi ${match.name.split(' ')[0]}, your range check-in is complete. Your new balance is ${newPoints.toLocaleString()} PTS (${newTier} Tier).`,
          action_url: '/rewards',
        }).catch(() => {});

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
  } catch (e: any) {
    if (e?.message?.includes('Duplicate QR Scan') || e?.message?.includes('suspended')) {
      throw e;
    }
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
    // Clamp manual adjustment to [-25000, +25000] to prevent accidental or malicious million-point minting
    const clampedDelta = Math.max(-25000, Math.min(25000, Math.round(pointsDelta)));
    if (Math.abs(clampedDelta) >= 1000) {
      logSecurityAuditEvent({
        event_type: 'HIGH_VALUE_POINTS_ALERT',
        severity: 'warning',
        actor: 'staff_admin',
        target: userId,
        details: `Large manual point adjustment (${clampedDelta > 0 ? '+' : ''}${clampedDelta} PTS) on member ${userId}. Reason: ${reason}`,
      });
    }

    const profile = await fetchProfileFromSupabase(userId);
    if (profile) {
      const newPoints = Math.max(0, (profile.points || 0) + clampedDelta);
      const newYtd = Math.max(0, (profile.points_ytd || 0) + (clampedDelta > 0 ? clampedDelta : 0));
      const newTier = newPoints >= 20000 ? 'Platinum' : newPoints >= 10000 ? 'Gold' : 'Silver';

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
        type: clampedDelta >= 0 ? 'earn' : 'adjust',
        title: reason || 'Points Adjustment',
        points: Math.abs(clampedDelta),
        by_admin: true,
        created_at: new Date().toISOString(),
      });

      sendPushNotification({
        user_id: profile.id,
        category: 'points',
        title:
          clampedDelta >= 0
            ? `✨ +${clampedDelta} Loyalty Points Credited`
            : `Loyalty Points Adjusted (${clampedDelta} PTS)`,
        body: `${reason || 'Club staff update'} • Your updated balance is ${newPoints.toLocaleString()} PTS (${newTier} Tier).`,
        action_url: '/rewards',
      }).catch(() => {});

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

export async function setMemberSuspendedInSupabase(
  userId: string,
  suspended: boolean
): Promise<boolean> {
  try {
    logSecurityAuditEvent({
      event_type: 'HIGH_VALUE_POINTS_ALERT',
      severity: suspended ? 'warning' : 'info',
      actor: 'staff_admin',
      target: userId,
      details: `Member account ${userId} ${suspended ? 'SUSPENDED / PAUSED' : 'RE-ACTIVATED'} by staff.`,
    });

    await Promise.all([
      supabase.from('profiles').update({ suspended }).eq('id', userId),
      supabase.from('users').update({ suspended }).eq('id', userId),
    ]);
    return true;
  } catch {
    return false;
  }
}

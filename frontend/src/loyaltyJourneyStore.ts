import { Reward, getStoredRewards } from './api';
import { getStoredBookings } from './bookingsStore';
import { adjustMemberPointsInSupabase } from './supabaseService';

export interface GolfChallenge {
  id: string;
  title: string;
  subtitle: string;
  category: 'consistency' | 'explorer' | 'offpeak' | 'earlywin';
  current: number;
  target: number;
  unit: string;
  rewardPoints: number;
  xpReward: number;
  claimed: boolean;
  howToProgress: string;
}

export interface FriendReferral {
  id: string;
  referrerCode: string;
  referrerMemberId?: string;
  friendName: string;
  friendEmail?: string;
  friendMemberId?: string;
  invitedDate: string;
  status: 'pending_first_visit' | 'first_visit_verified';
  bonusPoints: number;
  verifiedAt?: string;
  referrerCredited?: boolean;
}

export interface LoyaltyJourneyState {
  targetRewardId: string;
  socialPrivateMode: boolean;
  totalVisits: number;
  rangeBallsHit: number;
  activitiesTried: string[];
  rewardsRedeemedCount: number;
  challenges: GolfChallenge[];
  referrals: FriendReferral[];
  teamGoalProgress: number;
  teamGoalTarget: number;
  teamGoalClaimed: boolean;
  // Strict Daily & Anti-Abuse Tracking
  streakDay: number; // 1 to 7
  dailyCheckInClaimedDate: string | null; // YYYY-MM-DD
  dailySwingPlayedDate: string | null; // YYYY-MM-DD
  lastVerifiedVisitDate: string | null; // YYYY-MM-DD anti-passback
  chestXp: number;
  chestTargetXp: number;
  chestsOpened: number;
}

const JOURNEY_STORAGE_KEY = 'playgolf.loyalty_journey_v2';
const REFERRALS_REGISTRY_KEY = 'playgolf.referrals_registry_v1';
const VISIT_ANTI_PASSBACK_KEY = 'playgolf.visit_dates_by_member_v1';

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getYesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const DEFAULT_CHALLENGES: GolfChallenge[] = [
  {
    id: 'chal_range_3',
    title: 'Range Habit Builder',
    subtitle: 'Complete 3 Driving Range practice sessions checked in at reception',
    category: 'consistency',
    current: 0,
    target: 3,
    unit: 'sessions',
    rewardPoints: 150,
    xpReward: 120,
    claimed: false,
    howToProgress: 'Book a Driving Range bay and scan your pass at reception.',
  },
  {
    id: 'chal_explorer',
    title: 'Multi-Activity Explorer',
    subtitle: 'Play 2 different club activities (Range, 9 Holes, Putt Crazy, or Darts)',
    category: 'explorer',
    current: 0,
    target: 2,
    unit: 'activities',
    rewardPoints: 150,
    xpReward: 120,
    claimed: false,
    howToProgress: 'Book & check in for Putt Crazy Minigolf, 9 Holes, or Interactive Darts.',
  },
  {
    id: 'chal_quiet_time',
    title: 'Quiet-Time Regular',
    subtitle: 'Check in twice at reception during Off-Peak Hours (Mon–Thu 9am–4pm)',
    category: 'offpeak',
    current: 0,
    target: 2,
    unit: 'off-peak visits',
    rewardPoints: 100,
    xpReward: 100,
    claimed: false,
    howToProgress: 'Visit the club Monday–Thursday between 9:00 AM and 4:00 PM.',
  },
  {
    id: 'chal_early_win',
    title: 'First Reward Experience',
    subtitle: 'Redeem your first reward voucher from the Rewards Catalog',
    category: 'earlywin',
    current: 0,
    target: 1,
    unit: 'redemption',
    rewardPoints: 75,
    xpReward: 80,
    claimed: false,
    howToProgress: 'Redeem any reward from the Rewards catalog.',
  },
];

const DEFAULT_REFERRALS: FriendReferral[] = [];

export function isNaturalQuietTimeWindow(now = new Date()): boolean {
  const day = now.getDay(); // 0 Sun, 1 Mon .. 4 Thu, 5 Fri, 6 Sat
  const hour = now.getHours();
  const isMonToThu = day >= 1 && day <= 4;
  return isMonToThu && hour >= 9 && hour < 16;
}

export function getMemberReferralCode(user?: { name?: string; member_id?: string } | null): string {
  if (!user) return 'PG-MEMBER';
  const cleanMemberId = (user.member_id || 'PG2445').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const firstName = (user.name || 'GOLF')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^A-Z]/gi, '')
    .toUpperCase()
    .slice(0, 6);
  return `PG-${firstName || 'GOLF'}-${cleanMemberId.slice(-4)}`;
}

export function getStoredReferralRegistry(): FriendReferral[] {
  try {
    const raw = localStorage.getItem(REFERRALS_REGISTRY_KEY);
    if (!raw) {
      return DEFAULT_REFERRALS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_REFERRALS;
    return parsed.filter((r: any) => r?.id !== 'ref_default_1');
  } catch {
    return DEFAULT_REFERRALS;
  }
}

export function saveStoredReferralRegistry(list: FriendReferral[]): void {
  try {
    localStorage.setItem(REFERRALS_REGISTRY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getJourneyState(): LoyaltyJourneyState {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    const registry = getStoredReferralRegistry();
    if (!raw) {
      const initial: LoyaltyJourneyState = {
        targetRewardId: 'rew_1',
        socialPrivateMode: false,
        totalVisits: 0,
        rangeBallsHit: 0,
        activitiesTried: [],
        rewardsRedeemedCount: 0,
        challenges: DEFAULT_CHALLENGES,
        referrals: registry,
        teamGoalProgress: 0,
        teamGoalTarget: 10,
        teamGoalClaimed: false,
        streakDay: 1,
        dailyCheckInClaimedDate: null,
        dailySwingPlayedDate: null,
        lastVerifiedVisitDate: null,
        chestXp: 0,
        chestTargetXp: 300,
        chestsOpened: 0,
      };
      localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(initial));
      return syncJourneyWithRealBookings(initial);
    }
    const parsed = JSON.parse(raw);
    const mergedChallenges =
      Array.isArray(parsed.challenges) && parsed.challenges.length > 0
        ? DEFAULT_CHALLENGES.map((def) => {
            const found = parsed.challenges.find((c: any) => c.id === def.id);
            return found
              ? {
                  ...def,
                  current: Math.min(def.target, Math.max(0, Number(found.current) || 0)),
                  claimed: Boolean(found.claimed),
                }
              : def;
          })
        : DEFAULT_CHALLENGES;

    const state: LoyaltyJourneyState = {
      targetRewardId: parsed.targetRewardId || 'rew_1',
      socialPrivateMode: Boolean(parsed.socialPrivateMode),
      totalVisits: typeof parsed.totalVisits === 'number' ? parsed.totalVisits : 0,
      rangeBallsHit: typeof parsed.rangeBallsHit === 'number' ? parsed.rangeBallsHit : 0,
      activitiesTried: Array.isArray(parsed.activitiesTried) ? parsed.activitiesTried : [],
      rewardsRedeemedCount: typeof parsed.rewardsRedeemedCount === 'number' ? parsed.rewardsRedeemedCount : 0,
      challenges: mergedChallenges,
      referrals: registry,
      teamGoalProgress: typeof parsed.teamGoalProgress === 'number' ? Math.min(10, parsed.teamGoalProgress) : 0,
      teamGoalTarget: 10,
      teamGoalClaimed: Boolean(parsed.teamGoalClaimed),
      streakDay: typeof parsed.streakDay === 'number' && parsed.streakDay >= 1 && parsed.streakDay <= 7 ? parsed.streakDay : 1,
      dailyCheckInClaimedDate: parsed.dailyCheckInClaimedDate || null,
      dailySwingPlayedDate: parsed.dailySwingPlayedDate || null,
      lastVerifiedVisitDate: parsed.lastVerifiedVisitDate || null,
      chestXp: typeof parsed.chestXp === 'number' ? Math.max(0, parsed.chestXp) : 0,
      chestTargetXp: 300,
      chestsOpened: typeof parsed.chestsOpened === 'number' ? parsed.chestsOpened : 0,
    };

    return syncJourneyWithRealBookings(state);
  } catch {
    return {
      targetRewardId: 'rew_1',
      socialPrivateMode: false,
      totalVisits: 0,
      rangeBallsHit: 0,
      activitiesTried: [],
      rewardsRedeemedCount: 0,
      challenges: DEFAULT_CHALLENGES,
      referrals: DEFAULT_REFERRALS,
      teamGoalProgress: 0,
      teamGoalTarget: 10,
      teamGoalClaimed: false,
      streakDay: 1,
      dailyCheckInClaimedDate: null,
      dailySwingPlayedDate: null,
      lastVerifiedVisitDate: null,
      chestXp: 0,
      chestTargetXp: 300,
      chestsOpened: 0,
    };
  }
}

// Automatically sync quest progress with real bookings & completed visits so progress is 100% genuine
function syncJourneyWithRealBookings(state: LoyaltyJourneyState): LoyaltyJourneyState {
  try {
    const bookings = getStoredBookings();
    const activeOrCompleted = bookings.filter((b) => b.status === 'completed' || b.status === 'confirmed');
    if (activeOrCompleted.length === 0) return state;

    const distinctActivities = new Set<string>(state.activitiesTried);
    let rangeCount = 0;
    for (const bk of activeOrCompleted) {
      if (bk.activity_name) distinctActivities.add(bk.activity_name);
      if (bk.activity_id === 'driving-range' && bk.status === 'completed') {
        rangeCount += 1;
      }
    }

    const updatedChallenges = state.challenges.map((c) => {
      if (c.id === 'chal_explorer') {
        return { ...c, current: Math.min(c.target, Math.max(c.current, distinctActivities.size)) };
      }
      if (c.id === 'chal_range_3' && rangeCount > 0) {
        return { ...c, current: Math.min(c.target, Math.max(c.current, rangeCount)) };
      }
      if (c.id === 'chal_early_win' && state.rewardsRedeemedCount > 0) {
        return { ...c, current: 1 };
      }
      return c;
    });

    return {
      ...state,
      activitiesTried: Array.from(distinctActivities),
      challenges: updatedChallenges,
    };
  } catch {
    return state;
  }
}

export function saveJourneyState(next: LoyaltyJourneyState): LoyaltyJourneyState {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(next));
    if (Array.isArray(next.referrals)) {
      saveStoredReferralRegistry(next.referrals);
    }
    window.dispatchEvent(new Event('playgolf-journey-updated'));
  } catch {
    /* ignore storage error */
  }
  return next;
}

export function isQuietTimeActive(): boolean {
  return isNaturalQuietTimeWindow();
}

export function getVisitPointsRate(): {
  basePoints: number;
  bonusPoints: number;
  totalPerVisit: number;
  isQuietTime: boolean;
} {
  const quiet = isNaturalQuietTimeWindow();
  const basePoints = 100;
  const bonusPoints = quiet ? 100 : 0;
  return {
    basePoints,
    bonusPoints,
    totalPerVisit: basePoints + bonusPoints,
    isQuietTime: quiet,
  };
}

export function getChosenRewardProgress(userPoints: number, rewardsList?: Reward[]) {
  const state = getJourneyState();
  const catalog = rewardsList && rewardsList.length > 0 ? rewardsList : getStoredRewards();
  const chosen =
    catalog.find((r) => r.id === state.targetRewardId) ||
    catalog.find((r) => r.id === 'rew_1') ||
    catalog[0];

  if (!chosen) {
    return null;
  }

  const cost = chosen.points_cost || 150;
  const pointsRemaining = Math.max(0, cost - userPoints);
  const progressPct = Math.min(100, Math.round((userPoints / cost) * 100));
  const visitsStandard = pointsRemaining === 0 ? 0 : Math.ceil(pointsRemaining / 100);
  const visitsQuietTime = pointsRemaining === 0 ? 0 : Math.ceil(pointsRemaining / 200);

  return {
    reward: chosen,
    cost,
    userPoints,
    pointsRemaining,
    progressPct,
    canRedeemNow: userPoints >= cost,
    visitsStandard,
    visitsQuietTime,
  };
}

export function setChosenRewardId(rewardId: string): LoyaltyJourneyState {
  const current = getJourneyState();
  return saveJourneyState({
    ...current,
    targetRewardId: rewardId,
  });
}

export function toggleSocialPrivateMode(): LoyaltyJourneyState {
  const current = getJourneyState();
  return saveJourneyState({
    ...current,
    socialPrivateMode: !current.socialPrivateMode,
  });
}

export function recordRedemptionInJourney(): LoyaltyJourneyState {
  const current = getJourneyState();
  const updatedChallenges = current.challenges.map((c) =>
    c.id === 'chal_early_win' ? { ...c, current: Math.min(c.target, c.current + 1) } : c
  );
  return saveJourneyState({
    ...current,
    rewardsRedeemedCount: current.rewardsRedeemedCount + 1,
    chestXp: current.chestXp + 50,
    challenges: updatedChallenges,
  });
}

/**
 * Called when Staff scans a Member Card or Booking Pass at Reception (`/admin/scan`).
 * Enforces 1 visit points credit per member per calendar day (anti-passback) and
 * automatically verifies any pending Friend Referral on their 1st paid visit!
 */
export async function recordVerifiedReceptionVisit(
  memberIdentifier: string,
  activityId = 'driving-range'
): Promise<{
  alreadyCheckedInToday: boolean;
  pointsAwarded: number;
  isQuietTime: boolean;
  verifiedReferral: FriendReferral | null;
}> {
  const today = getTodayIsoDate();
  const cleanKey = (memberIdentifier || '').trim().toUpperCase();
  const rate = getVisitPointsRate();

  // 1. Check Anti-Passback (Max 1 points-earning visit check-in per member per day)
  let visitMap: Record<string, string> = {};
  try {
    const rawMap = localStorage.getItem(VISIT_ANTI_PASSBACK_KEY);
    if (rawMap) visitMap = JSON.parse(rawMap) || {};
  } catch {
    visitMap = {};
  }

  const alreadyCheckedInToday = Boolean(cleanKey && visitMap[cleanKey] === today);
  if (cleanKey && !alreadyCheckedInToday) {
    visitMap[cleanKey] = today;
    try {
      localStorage.setItem(VISIT_ANTI_PASSBACK_KEY, JSON.stringify(visitMap));
    } catch {
      /* ignore */
    }
  }

  const pointsAwarded = alreadyCheckedInToday ? 0 : rate.totalPerVisit;

  // 2. Advance Member's Personal Golf Journey Quests on Verified Reception Check-In
  const current = getJourneyState();
  if (!alreadyCheckedInToday) {
    const nextActivities = new Set(current.activitiesTried);
    if (activityId === 'putt-crazy') nextActivities.add('Putt Crazy Minigolf');
    else if (activityId === 'nine-holes') nextActivities.add('9 Holes Golf');
    else if (activityId === 'darts-interactive') nextActivities.add('Interactive Darts');
    else nextActivities.add('Driving Range');

    const updatedChallenges = current.challenges.map((c) => {
      if (c.id === 'chal_range_3' && activityId === 'driving-range') {
        return { ...c, current: Math.min(c.target, c.current + 1) };
      }
      if (c.id === 'chal_explorer') {
        return { ...c, current: Math.min(c.target, nextActivities.size) };
      }
      if (c.id === 'chal_quiet_time' && rate.isQuietTime) {
        return { ...c, current: Math.min(c.target, c.current + 1) };
      }
      return c;
    });

    saveJourneyState({
      ...current,
      totalVisits: current.totalVisits + 1,
      rangeBallsHit: current.rangeBallsHit + (activityId === 'driving-range' ? 100 : 0),
      activitiesTried: Array.from(nextActivities),
      teamGoalProgress: Math.min(current.teamGoalTarget, current.teamGoalProgress + 1),
      lastVerifiedVisitDate: today,
      chestXp: current.chestXp + 75,
      challenges: updatedChallenges,
    });
  }

  // 3. Check & Verify Fair Buddy Referral if this member had a pending referral!
  const verifiedReferral = await verifyReferralOnReceptionScan(cleanKey);

  return {
    alreadyCheckedInToday,
    pointsAwarded,
    isQuietTime: rate.isQuietTime,
    verifiedReferral,
  };
}

/**
 * Register a new friend referral (either when a member invites a friend by name/email/ID,
 * or when a new user enters a friend's referral code during Sign Up).
 * Zero points are awarded at signup; points unlock only when staff scans their 1st visit!
 */
export function registerPendingReferral(params: {
  referrerCode: string;
  referrerMemberId?: string;
  friendName: string;
  friendEmail?: string;
  friendMemberId?: string;
}): { ok: boolean; error?: string; referral?: FriendReferral } {
  const name = (params.friendName || '').replace(/[<>]/g, '').trim().slice(0, 80);
  const email = (params.friendEmail || '').trim().toLowerCase();
  const memberId = (params.friendMemberId || '').trim().toUpperCase();
  const referrerCode = (params.referrerCode || 'PG-MEMBER').trim().toUpperCase();
  const referrerMemberId = (params.referrerMemberId || '').trim().toUpperCase();

  if (!name) {
    return { ok: false, error: 'Please enter your friend’s name.' };
  }
  if (!email && !memberId) {
    return { ok: false, error: 'Please enter your friend’s email address or Member ID.' };
  }

  // SECURITY FIX 1: Block Self-Referral Point Farming
  if (
    (referrerMemberId && memberId && referrerMemberId === memberId) ||
    (memberId && referrerCode.endsWith(memberId.replace(/[^A-Z0-9]/g, '').slice(-4)))
  ) {
    return { ok: false, error: 'Security Guard: You cannot refer your own Member ID.' };
  }

  const registry = getStoredReferralRegistry();

  // SECURITY FIX 2: Cap pending referrals to max 5 per member to prevent referral spam
  const pendingCount = registry.filter((r) => r.status === 'pending_first_visit').length;
  if (pendingCount >= 5) {
    return {
      ok: false,
      error: 'You already have 5 pending friend referrals awaiting their first visit.',
    };
  }

  const duplicate = registry.find(
    (r) =>
      (email && r.friendEmail?.toLowerCase() === email) ||
      (memberId && r.friendMemberId?.toUpperCase() === memberId)
  );
  if (duplicate) {
    return { ok: false, error: 'This friend is already registered in your referral tracker.' };
  }

  const newReferral: FriendReferral = {
    id: 'ref_' + Date.now(),
    referrerCode,
    referrerMemberId: params.referrerMemberId,
    friendName: name,
    friendEmail: email || undefined,
    friendMemberId: memberId || undefined,
    invitedDate: getTodayIsoDate(),
    status: 'pending_first_visit',
    bonusPoints: 200,
    referrerCredited: false,
  };

  const updatedRegistry = [newReferral, ...registry];
  saveStoredReferralRegistry(updatedRegistry);

  const currentJourney = getJourneyState();
  saveJourneyState({
    ...currentJourney,
    referrals: updatedRegistry,
  });

  return { ok: true, referral: newReferral };
}

/**
 * Triggered automatically when Reception scans a member's QR pass or Booking Pass on `/admin/scan`.
 * Matches by Member ID, Email, or Name. If a pending referral exists, marks it `first_visit_verified`
 * and credits +200 PTS to both the friend and the referrer!
 */
export async function verifyReferralOnReceptionScan(
  scannedIdentifier: string,
  scannedName?: string,
  scannedEmail?: string
): Promise<FriendReferral | null> {
  const cleanId = (scannedIdentifier || '').replace('QR_MEMBER_', '').trim().toUpperCase();
  const cleanName = (scannedName || '').trim().toLowerCase();
  const cleanEmail = (scannedEmail || '').trim().toLowerCase();

  const registry = getStoredReferralRegistry();
  // SECURITY FIX: Require exact Member ID or Email match (do not match by common first name alone)
  const pendingMatch = registry.find((r) => {
    if (r.status !== 'pending_first_visit') return false;
    if (cleanId && r.friendMemberId && r.friendMemberId.toUpperCase() === cleanId) return true;
    if (cleanId && r.friendEmail && r.friendEmail.toUpperCase() === cleanId) return true;
    if (cleanEmail && r.friendEmail && r.friendEmail.toLowerCase() === cleanEmail) return true;
    return false;
  });

  if (!pendingMatch) return null;

  const verifiedItem: FriendReferral = {
    ...pendingMatch,
    status: 'first_visit_verified',
    verifiedAt: `Verified at Reception (${getTodayIsoDate()})`,
    referrerCredited: true,
  };

  const updatedRegistry = registry.map((r) => (r.id === pendingMatch.id ? verifiedItem : r));
  saveStoredReferralRegistry(updatedRegistry);

  const currentJourney = getJourneyState();
  saveJourneyState({
    ...currentJourney,
    chestXp: currentJourney.chestXp + 100,
    referrals: updatedRegistry,
  });

  // Credit +200 PTS in Supabase if referrerMemberId or friendMemberId is present
  if (pendingMatch.referrerMemberId) {
    adjustMemberPointsInSupabase(
      pendingMatch.referrerMemberId,
      200,
      `Referral Bonus: ${pendingMatch.friendName} completed 1st paid visit`
    ).catch(() => {});
  }
  if (pendingMatch.friendMemberId) {
    adjustMemberPointsInSupabase(
      pendingMatch.friendMemberId,
      200,
      `Welcome Referral Bonus: 1st paid visit verified`
    ).catch(() => {});
  }

  return verifiedItem;
}

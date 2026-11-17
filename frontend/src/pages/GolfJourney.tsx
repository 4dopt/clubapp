import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Zap,
  Trophy,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Gift,
  ChevronRight,
  UserPlus,
  QrCode,
  Flame,
  Compass,
  Check,
  Copy,
  X,
  SlidersHorizontal,
  Flag,
  Crosshair,
  PackageOpen,
  Calendar,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth';
import { api, Reward, getStoredRewards } from '../api';
import { syncProfileAndUsersTables } from '../supabaseService';
import {
  getJourneyState,
  saveJourneyState,
  isQuietTimeActive,
  getVisitPointsRate,
  getChosenRewardProgress,
  setChosenRewardId,
  toggleSocialPrivateMode,
  recordRedemptionInJourney,
  getTodayIsoDate,
  getYesterdayIsoDate,
  getMemberReferralCode,
  registerPendingReferral,
  LoyaltyJourneyState,
  GolfChallenge,
} from '../loyaltyJourneyStore';

interface CelebrationModalData {
  badge: string;
  title: string;
  subtitle: string;
  pointsAdded: number;
  xpAdded?: number;
  basePoints?: number;
  bonusPoints?: number;
  newBalance: number;
  receiptRef: string;
}

interface FloatingRewardToast {
  id: number;
  text: string;
  sub: string;
}

function playGameSound(type: 'claim' | 'swing' | 'chest' | 'tap') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      start: number,
      duration: number,
      wave: OscillatorType = 'triangle',
      vol = 0.15
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.005, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    if (type === 'claim') {
      playTone(523.25, now, 0.11, 'triangle', 0.17);
      playTone(659.25, now + 0.08, 0.11, 'triangle', 0.17);
      playTone(783.99, now + 0.16, 0.13, 'triangle', 0.17);
      playTone(1046.5, now + 0.24, 0.25, 'sine', 0.2);
    } else if (type === 'chest') {
      playTone(440, now, 0.1, 'triangle', 0.18);
      playTone(554.37, now + 0.08, 0.1, 'triangle', 0.18);
      playTone(659.25, now + 0.16, 0.12, 'triangle', 0.2);
      playTone(880, now + 0.24, 0.32, 'sine', 0.22);
    } else if (type === 'swing') {
      playTone(260, now, 0.08, 'sine', 0.18);
      playTone(620, now + 0.07, 0.18, 'triangle', 0.16);
    } else {
      playTone(660, now, 0.05, 'sine', 0.08);
    }
  } catch {
    /* ignore audio restrictions */
  }
}

// Margin-safe daily check-in rewards (strictly 1 claim per calendar day)
const DAILY_STREAK_REWARDS = [
  { day: 1, pts: 5, xp: 30, label: 'Day 1' },
  { day: 2, pts: 5, xp: 35, label: 'Day 2' },
  { day: 3, pts: 10, xp: 40, label: 'Day 3' },
  { day: 4, pts: 10, xp: 45, label: 'Day 4' },
  { day: 5, pts: 15, xp: 50, label: 'Day 5' },
  { day: 6, pts: 15, xp: 60, label: 'Day 6' },
  { day: 7, pts: 50, xp: 100, label: 'Day 7 Chest', isChest: true },
];

// Margin-safe daily tee shot outcomes (strictly 1 shot per calendar day)
const DAILY_SWING_ZONES = [
  {
    zone: '🎯 PIN-HIGH EAGLE!',
    distance: '1.8 ft from the cup',
    points: 15,
    xp: 60,
  },
  {
    zone: '⛳ GREEN IN REGULATION!',
    distance: '7.4 ft Birdie putt',
    points: 10,
    xp: 45,
  },
  {
    zone: '⚡ CENTER FAIRWAY DRIVE!',
    distance: '265 yds fairway cut',
    points: 5,
    xp: 35,
  },
];

let hasAutoCheckedDailyPopup = false;

export function GolfJourney() {
  const { user, token, setUser, refresh } = useAuth();
  const [journey, setJourney] = useState<LoyaltyJourneyState>(() => getJourneyState());
  const [rewards, setRewards] = useState<Reward[]>(() => getStoredRewards().filter((r) => r.active));
  const [activeView, setActiveView] = useState<'course' | 'quests' | 'clubhouse'>('course');
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationModalData | null>(null);
  const [quickRedeemModal, setQuickRedeemModal] = useState<{
    rewardTitle: string;
    pointsCost: number;
    qrToken: string;
    discountCode?: string;
    redemptionType: 'qr' | 'discount';
  } | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Friend Referral Registration Form
  const [friendNameInput, setFriendNameInput] = useState('');
  const [friendContactInput, setFriendContactInput] = useState('');
  const [referralFormMsg, setReferralFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Gamified Pop-Up States
  const [showDailyStreakPopup, setShowDailyStreakPopup] = useState(false);
  const [showDailySwingModal, setShowDailySwingModal] = useState(false);
  const [swingState, setSwingState] = useState<'ready' | 'swinging' | 'landed'>('ready');
  const [swingResult, setSwingResult] = useState<(typeof DAILY_SWING_ZONES)[0] | null>(null);
  const [showChestModal, setShowChestModal] = useState(false);
  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(2);
  const [floatingToast, setFloatingToast] = useState<FloatingRewardToast | null>(null);

  const todayKey = getTodayIsoDate();
  const yesterdayKey = getYesterdayIsoDate();
  const isDailyClaimedToday = journey.dailyCheckInClaimedDate === todayKey;
  const isDailySwingPlayedToday = journey.dailySwingPlayedDate === todayKey;

  useEffect(() => {
    const sync = () => {
      setJourney(getJourneyState());
      setRewards(getStoredRewards().filter((r) => r.active));
    };
    window.addEventListener('playgolf-journey-updated', sync);
    if (token) {
      api
        .rewards(token)
        .then((list) => {
          if (list && list.length > 0) setRewards(list);
        })
        .catch(() => {});
    }
    return () => window.removeEventListener('playgolf-journey-updated', sync);
  }, [token]);

  // Only auto-open the Daily Streak Pop-Up if the member hasn't claimed today's bonus yet
  useEffect(() => {
    if (!hasAutoCheckedDailyPopup && !isDailyClaimedToday) {
      hasAutoCheckedDailyPopup = true;
      const timer = setTimeout(() => {
        setShowDailyStreakPopup(true);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [isDailyClaimedToday]);

  if (!user) return null;

  const userPoints = user.points ?? user.points_balance ?? 0;
  const quietTime = isQuietTimeActive();
  const visitRate = getVisitPointsRate();
  const chosenGoal = getChosenRewardProgress(userPoints, rewards);
  const earlyWinReward = rewards.find((r) => r.id === 'rew_early_1' || r.is_early_win) || rewards[0];
  const referralCode = getMemberReferralCode(user);

  const triggerFloatingToast = (text: string, sub: string) => {
    setFloatingToast({ id: Date.now(), text, sub });
    setTimeout(() => {
      setFloatingToast((prev) => (prev && Date.now() - prev.id >= 2200 ? null : prev));
    }, 2400);
  };

  const creditMemberPoints = async (
    pointsDelta: number,
    xpDelta: number,
    celebrationInfo?: Omit<CelebrationModalData, 'newBalance' | 'pointsAdded'>
  ) => {
    const newPoints = userPoints + pointsDelta;
    const newPointsYtd = (user.points_ytd || userPoints) + pointsDelta;
    const nextTier = newPoints >= 5000 ? 'Platinum' : newPoints >= 1000 ? 'Gold' : 'Silver';

    const updatedUser = {
      ...user,
      points: newPoints,
      points_balance: newPoints,
      points_ytd: newPointsYtd,
      tier: nextTier as 'Silver' | 'Gold' | 'Platinum',
    };

    setUser(updatedUser);
    syncProfileAndUsersTables(updatedUser).catch(() => {});

    triggerFloatingToast(`+${pointsDelta} PTS`, `+${xpDelta} Club XP`);

    if (celebrationInfo) {
      setCelebration({
        ...celebrationInfo,
        pointsAdded: pointsDelta,
        xpAdded: xpDelta,
        newBalance: newPoints,
      });
    }
  };

  // STRICT ONCE-PER-DAY STREAK CLAIM
  const handleClaimDailyStreak = async () => {
    if (isDailyClaimedToday) return; // Hard guard against multiple claims in a single day

    playGameSound('claim');

    // Calculate consecutive streak day
    let activeStreakDay = 1;
    if (journey.dailyCheckInClaimedDate === yesterdayKey) {
      activeStreakDay = journey.streakDay < 7 ? journey.streakDay + 1 : 1;
    } else if (!journey.dailyCheckInClaimedDate) {
      activeStreakDay = journey.streakDay || 1;
    } else {
      activeStreakDay = 1; // Streak reset if missed a day
    }

    const rewardEntry =
      DAILY_STREAK_REWARDS.find((d) => d.day === activeStreakDay) || DAILY_STREAK_REWARDS[0];

    const nextState = saveJourneyState({
      ...journey,
      dailyCheckInClaimedDate: todayKey,
      streakDay: activeStreakDay,
      chestXp: journey.chestXp + rewardEntry.xp,
    });
    setJourney(nextState);
    setShowDailyStreakPopup(false);

    await creditMemberPoints(rewardEntry.pts, rewardEntry.xp, {
      badge: `🔥 DAY ${activeStreakDay} CHECK-IN VERIFIED`,
      title: `Daily Streak Bonus Claimed!`,
      subtitle: `Locked in for ${todayKey}. Come back tomorrow to unlock Day ${
        activeStreakDay < 7 ? activeStreakDay + 1 : 1
      }!`,
      basePoints: rewardEntry.pts,
      bonusPoints: 0,
      receiptRef: `PG-STREAK-${todayKey.replace(/-/g, '')}`,
    });
  };

  // STRICT ONCE-PER-DAY NEAREST-THE-PIN TEE SHOT
  const handleTakeDailySwing = async () => {
    if (isDailySwingPlayedToday || swingState === 'swinging') return; // Hard guard: 1 swing per day

    playGameSound('swing');
    setSwingState('swinging');
    setSwingResult(null);

    setTimeout(async () => {
      playGameSound('claim');
      const outcome = DAILY_SWING_ZONES[Math.floor(Math.random() * DAILY_SWING_ZONES.length)];
      setSwingResult(outcome);
      setSwingState('landed');

      const nextState = saveJourneyState({
        ...journey,
        dailySwingPlayedDate: todayKey,
        rangeBallsHit: journey.rangeBallsHit + 1,
        chestXp: journey.chestXp + outcome.xp,
      });
      setJourney(nextState);

      await creditMemberPoints(outcome.points, outcome.xp);
    }, 950);
  };

  // STRICT XP-LOCKED CADDY MYSTERY CHEST (Requires 300 XP)
  const handleOpenMysteryChest = async () => {
    if (journey.chestXp < journey.chestTargetXp) return; // Hard guard: must have 300 XP

    playGameSound('chest');
    const bonusPts = 50;
    const remainingXp = Math.max(0, journey.chestXp - journey.chestTargetXp);

    const nextState = saveJourneyState({
      ...journey,
      chestXp: remainingXp,
      chestsOpened: journey.chestsOpened + 1,
    });
    setJourney(nextState);
    setShowChestModal(false);

    await creditMemberPoints(bonusPts, 25, {
      badge: '🏆 PRO SHOP MYSTERY CHEST',
      title: 'Golden Caddy Chest Unlocked!',
      subtitle: 'You earned 300 Club XP and unlocked +50 Bonus Points toward your target reward!',
      basePoints: bonusPts,
      bonusPoints: 0,
      receiptRef: `PG-CHEST-${journey.chestsOpened + 1}-${todayKey.replace(/-/g, '')}`,
    });
  };

  // CLAIM COMPLETED QUEST (Only unlockable when current >= target and !claimed)
  const handleClaimCompletedQuest = async (challenge: GolfChallenge) => {
    if (challenge.claimed || challenge.current < challenge.target) return;

    playGameSound('claim');
    const updatedChallenges = journey.challenges.map((c) =>
      c.id === challenge.id ? { ...c, claimed: true } : c
    );
    const nextState = saveJourneyState({
      ...journey,
      chestXp: journey.chestXp + (challenge.xpReward || 100),
      challenges: updatedChallenges,
    });
    setJourney(nextState);

    await creditMemberPoints(challenge.rewardPoints, challenge.xpReward || 100, {
      badge: '⛳ QUEST COMPLETED',
      title: `${challenge.title} Claimed!`,
      subtitle: challenge.subtitle,
      basePoints: challenge.rewardPoints,
      bonusPoints: 0,
      receiptRef: `PG-QUEST-${challenge.id.toUpperCase()}`,
    });
  };

  // CLAIM COMPLETED 4-BALL CO-OP GOAL (Only when teamGoalProgress >= teamGoalTarget and !teamGoalClaimed)
  const handleClaimTeamGoal = async () => {
    if (journey.teamGoalClaimed || journey.teamGoalProgress < journey.teamGoalTarget) return;

    playGameSound('claim');
    const nextState = saveJourneyState({
      ...journey,
      teamGoalClaimed: true,
      chestXp: journey.chestXp + 100,
    });
    setJourney(nextState);

    await creditMemberPoints(100, 100, {
      badge: 'FOURBALL CO-OP GOAL',
      title: '4-Ball Monthly Goal Claimed!',
      subtitle: '10 Combined Range & Course Visits verified at Reception.',
      basePoints: 100,
      bonusPoints: 0,
      receiptRef: `PG-TEAM-${todayKey.replace(/-/g, '')}`,
    });
  };

  // REGISTER A REFERRED FRIEND (Pending 1st Paid Reception Visit)
  const handleRegisterFriendReferral = (e: React.FormEvent) => {
    e.preventDefault();
    setReferralFormMsg(null);

    const contact = friendContactInput.trim();
    const isMemberId = contact.toUpperCase().startsWith('PG-');
    const res = registerPendingReferral({
      referrerCode: referralCode,
      referrerMemberId: user.member_id,
      friendName: friendNameInput,
      friendEmail: isMemberId ? undefined : contact,
      friendMemberId: isMemberId ? contact.toUpperCase() : undefined,
    });

    if (!res.ok) {
      setReferralFormMsg({ type: 'err', text: res.error || 'Could not register referral.' });
      return;
    }

    playGameSound('tap');
    setJourney(getJourneyState());
    setFriendNameInput('');
    setFriendContactInput('');
    setReferralFormMsg({
      type: 'ok',
      text: `${res.referral?.friendName} is now linked to your invite code (${referralCode}). Both of you will automatically receive +200 PTS when staff scans their 1st paid visit at reception!`,
    });
  };

  const handleOneTapRedeem = async (reward: Reward) => {
    if (!token || userPoints < reward.points_cost) return;
    playGameSound('claim');
    setRedeemingId(reward.id);
    try {
      const res = await api.redeemReward(token, reward.id);
      const updatedPoints = Math.max(0, userPoints - reward.points_cost);
      const updatedUser = {
        ...user,
        points: updatedPoints,
        points_balance: updatedPoints,
      };
      setUser(updatedUser);
      const nextJourney = recordRedemptionInJourney();
      setJourney(nextJourney);
      await refresh().catch(() => {});
      setQuickRedeemModal({
        rewardTitle: reward.title,
        pointsCost: reward.points_cost,
        qrToken: res.qr_code_token || 'QR_REDEEM_' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        discountCode: res.discount_code,
        redemptionType: res.redemption_type,
      });
    } catch {
      const fallbackQr = 'QR_REDEEM_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const updatedPoints = Math.max(0, userPoints - reward.points_cost);
      setUser({
        ...user,
        points: updatedPoints,
        points_balance: updatedPoints,
      });
      const nextJourney = recordRedemptionInJourney();
      setJourney(nextJourney);
      setQuickRedeemModal({
        rewardTitle: reward.title,
        pointsCost: reward.points_cost,
        qrToken: fallbackQr,
        discountCode: reward.discount_code,
        redemptionType: reward.redemption_type,
      });
    } finally {
      setRedeemingId(null);
    }
  };

  const golferLevel = Math.max(
    1,
    Math.floor(journey.totalVisits / 2) + journey.challenges.filter((c) => c.claimed).length + journey.chestsOpened
  );
  const chestReady = journey.chestXp >= journey.chestTargetXp;
  const chestPct = Math.min(100, Math.round((journey.chestXp / journey.chestTargetXp) * 100));

  const rangeChallenge = journey.challenges.find((c) => c.id === 'chal_range_3') || journey.challenges[0];
  const explorerChallenge = journey.challenges.find((c) => c.id === 'chal_explorer') || journey.challenges[1];

  // 5 Course Holes driven by real verified milestones
  const courseHoles = [
    {
      holeNum: 1,
      par: 'PAR 3 • STARTER TEE',
      title: 'Early Win Welcome Perk',
      subtitle: 'Redeem your first 50 PTS Welcome Coffee or 30-Ball Warm-Up Basket',
      rewardBadge: '50 PTS Starter',
      done: journey.rewardsRedeemedCount > 0,
      active: journey.rewardsRedeemedCount === 0,
      align: 'left' as const,
      canClaimReward: userPoints >= (earlyWinReward?.points_cost || 50) && journey.rewardsRedeemedCount === 0,
    },
    {
      holeNum: 2,
      par: 'PAR 4 • PINNED GOAL',
      title: chosenGoal?.reward.title || '100 Range Balls',
      subtitle: chosenGoal?.canRedeemNow
        ? 'Goal Reached! 0 visits remaining — Ready to redeem.'
        : `${chosenGoal?.visitsStandard || 1} reception visit${
            chosenGoal?.visitsStandard === 1 ? '' : 's'
          } remaining (${chosenGoal?.pointsRemaining || 0} PTS needed)`,
      rewardBadge: `${chosenGoal?.cost || 150} PTS Target`,
      done: Boolean(chosenGoal?.canRedeemNow),
      active: journey.rewardsRedeemedCount > 0 && !chosenGoal?.canRedeemNow,
      align: 'right' as const,
      canClaimReward: Boolean(chosenGoal?.canRedeemNow),
    },
    {
      holeNum: 3,
      par: 'PAR 4 • RANGE HABIT',
      title: '3 Range Practice Sessions',
      subtitle: `${rangeChallenge.current}/${rangeChallenge.target} verified range check-ins completed`,
      rewardBadge: '+150 Bonus PTS',
      done: Boolean(rangeChallenge.claimed),
      active: Boolean(chosenGoal?.canRedeemNow && !rangeChallenge.claimed),
      align: 'left' as const,
      canClaimReward: rangeChallenge.current >= rangeChallenge.target && !rangeChallenge.claimed,
    },
    {
      holeNum: 4,
      par: 'PAR 5 • CLUB EXPLORER',
      title: 'Try Minigolf or 9 Holes',
      subtitle: `${explorerChallenge.current}/${explorerChallenge.target} club activities explored`,
      rewardBadge: '+150 Bonus PTS',
      done: Boolean(explorerChallenge.claimed),
      active: false,
      align: 'right' as const,
      canClaimReward: explorerChallenge.current >= explorerChallenge.target && !explorerChallenge.claimed,
    },
    {
      holeNum: 5,
      par: 'CHAMPIONSHIP GREEN',
      title: 'Gold Club Trophy & 15% Off',
      subtitle: 'Reach 1,000 PTS for 15% fixed booking discount & free monthly bucket',
      rewardBadge: '1,000 PTS Trophy',
      done: userPoints >= 1000,
      active: false,
      align: 'center' as const,
      canClaimReward: false,
    },
  ];

  const totalVisitsForGoal = chosenGoal ? Math.max(1, Math.ceil(chosenGoal.cost / visitRate.totalPerVisit)) : 2;
  const completedVisitsForGoal = chosenGoal
    ? Math.min(totalVisitsForGoal, Math.floor(userPoints / visitRate.totalPerVisit))
    : 1;

  return (
    <div style={{ padding: '12px 16px 36px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes pgFloatUp {
          0% { opacity: 0; transform: translate(-50%, 16px) scale(0.85); }
          20% { opacity: 1; transform: translate(-50%, 0px) scale(1.05); }
          80% { opacity: 1; transform: translate(-50%, -14px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -28px) scale(0.95); }
        }
        @keyframes pgPulseGold {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.65); }
          70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        @keyframes pgChestWiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-6deg) scale(1.07); }
          75% { transform: rotate(6deg) scale(1.07); }
        }
        @keyframes pgBallArc {
          0% { left: 12%; bottom: 18px; transform: scale(1); }
          50% { left: 52%; bottom: 82px; transform: scale(1.35); }
          100% { left: 80%; bottom: 28px; transform: scale(0.95); }
        }
      `}</style>

      {/* FLOATING +PTS / +XP GAME TOAST */}
      {floatingToast && (
        <div
          key={floatingToast.id}
          style={{
            position: 'fixed',
            top: '78px',
            left: '50%',
            zIndex: 2000,
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            border: '2px solid #fbbf24',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '999px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            animation: 'pgFloatUp 2.3s ease forwards',
          }}
        >
          <Sparkles size={16} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#fde047' }}>{floatingToast.text}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ecfdf5' }}>&bull; {floatingToast.sub}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. GOLF GAME TOP SCORECARD BAR (Level + 3 Daily-Locked Game Pills)    */}
      {/* ===================================================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '12px 14px',
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              border: '2px solid #6ee7b7',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.48rem', fontWeight: 900, color: '#d1fae5', letterSpacing: '0.06em' }}>
              LEVEL
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>{golferLevel}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 900,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {(user.name || 'Golfer').split(' ')[0]}’s Tour
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 800 }}>
              {journey.totalVisits} Visits &bull; {userPoints.toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* 3 Game Action Pills (Each strictly rate-limited to once per day / 300 XP) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              playGameSound('tap');
              setShowDailyStreakPopup(true);
            }}
            title="Daily Check-In Streak (1 per day)"
            style={{
              background: isDailyClaimedToday
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              color: isDailyClaimedToday ? '#fde047' : '#090d16',
              border: isDailyClaimedToday ? '1px solid rgba(251, 191, 36, 0.35)' : 'none',
              padding: '7px 10px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              animation: isDailyClaimedToday ? 'none' : 'pgPulseGold 2s infinite',
            }}
          >
            <Flame size={14} />
            <span>{isDailyClaimedToday ? `${journey.streakDay}d ✓` : `${journey.streakDay}d`}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playGameSound('tap');
              if (!isDailySwingPlayedToday) {
                setSwingState('ready');
                setSwingResult(null);
              } else {
                setSwingState('landed');
              }
              setShowDailySwingModal(true);
            }}
            title="Daily Nearest-the-Pin Shot (1 per day)"
            style={{
              background: isDailySwingPlayedToday ? 'rgba(255,255,255,0.08)' : 'rgba(16, 185, 129, 0.2)',
              border: isDailySwingPlayedToday ? '1px solid rgba(255,255,255,0.2)' : '1.5px solid #34d399',
              color: isDailySwingPlayedToday ? '#94a3b8' : '#6ee7b7',
              padding: '7px 10px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Crosshair size={14} />
            <span>{isDailySwingPlayedToday ? 'Played ✓' : '1 Shot'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playGameSound('tap');
              setShowChestModal(true);
            }}
            title="Caddy Mystery Chest (Unlocks at 300 XP)"
            style={{
              background: chestReady
                ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.45)',
              color: chestReady ? '#090d16' : '#fde047',
              padding: '7px 10px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              animation: chestReady ? 'pgChestWiggle 1.1s infinite' : 'none',
            }}
          >
            <PackageOpen size={14} />
            <span>{chestPct}%</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. EASY-TO-NAVIGATE 3-MODE GAME SWITCHER                              */}
      {/* ===================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          background: '#e2e8f0',
          padding: '5px',
          borderRadius: '16px',
          gap: '5px',
        }}
      >
        {[
          { id: 'course', label: '🗺️ Course Map', badge: '5 Holes' },
          {
            id: 'quests',
            label: '🏆 Club Quests',
            badge: `${journey.challenges.filter((c) => !c.claimed).length} Quests`,
          },
          { id: 'clubhouse', label: '👥 Clubhouse', badge: journey.socialPrivateMode ? 'Solo Mode' : '4-Ball & Refer' },
        ].map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playGameSound('tap');
                setActiveView(tab.id as any);
              }}
              style={{
                padding: '10px 6px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? 'var(--brand-green)' : '#475569',
                fontWeight: 900,
                fontSize: '0.76rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 3px 10px rgba(15, 23, 42, 0.1)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: isActive ? '#d97706' : '#64748b',
                }}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: COURSE MAP (PINNED TARGET + WINDING GOLF FAIRWAY)             */}
      {/* ===================================================================== */}
      {activeView === 'course' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* PINNED REWARD SCORECARD */}
          {chosenGoal && (
            <div
              style={{
                background: '#ffffff',
                border: '2px solid rgba(4, 120, 87, 0.28)',
                borderRadius: '20px',
                padding: '15px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <img
                    src={chosenGoal.reward.image_url}
                    alt={chosenGoal.reward.title}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      border: '1.5px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        color: 'var(--brand-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Flag size={11} /> PINNED TARGET REWARD
                    </div>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        lineHeight: 1.2,
                        marginTop: '1px',
                      }}
                    >
                      {chosenGoal.reward.title}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGoalPicker(!showGoalPicker)}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--slate-dark)',
                    padding: '6px 10px',
                    borderRadius: '999px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <SlidersHorizontal size={12} /> Change Pin
                </button>
              </div>

              {showGoalPicker && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '10px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--slate-grey)' }}>
                    Pick which reward you are saving for:
                  </div>
                  {rewards.map((r) => {
                    const isSelected = r.id === chosenGoal.reward.id;
                    const remPts = Math.max(0, r.points_cost - userPoints);
                    const visitsRem = remPts === 0 ? 0 : Math.ceil(remPts / visitRate.totalPerVisit);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          playGameSound('tap');
                          const next = setChosenRewardId(r.id);
                          setJourney(next);
                          setShowGoalPicker(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid var(--brand-green)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--brand-green-subtle)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                            {r.points_cost} PTS &bull;{' '}
                            {visitsRem === 0 ? 'Unlocked!' : `${visitsRem} visit${visitsRem === 1 ? '' : 's'} left`}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--brand-green)' }}>
                          {isSelected ? '✓ Active' : 'Select'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Golf Ball Punch-Card Slots */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 800, marginBottom: '8px' }}>
                  <span style={{ color: '#065f46' }}>
                    {chosenGoal.canRedeemNow
                      ? '⛳ Target Reached — 0 Visits Remaining!'
                      : `🎯 ${chosenGoal.visitsStandard} Standard Visit${
                          chosenGoal.visitsStandard === 1 ? '' : 's'
                        } Left (or ${chosenGoal.visitsQuietTime} in Mon–Thu 9am–4pm Quiet-Time)`}
                  </span>
                  <span style={{ color: '#047857', fontWeight: 900 }}>{chosenGoal.progressPct}%</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(5, totalVisitsForGoal)}, 1fr)`,
                    gap: '6px',
                  }}
                >
                  {Array.from({ length: Math.min(5, totalVisitsForGoal) }).map((_, idx) => {
                    const done = chosenGoal.canRedeemNow || idx < completedVisitsForGoal;
                    return (
                      <div
                        key={idx}
                        style={{
                          background: done ? '#059669' : '#ffffff',
                          color: done ? '#ffffff' : '#64748b',
                          border: done ? 'none' : '1px dashed #94a3b8',
                          borderRadius: '10px',
                          padding: '6px 4px',
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{done ? '⛳' : '⚪'}</span>
                        <span>Visit {idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {chosenGoal.canRedeemNow ? (
                  <button
                    type="button"
                    disabled={redeemingId === chosenGoal.reward.id}
                    onClick={() => handleOneTapRedeem(chosenGoal.reward)}
                    className="btn-primary"
                    style={{ flex: 1, height: '42px', fontSize: '0.8rem', fontWeight: 900 }}
                  >
                    <QrCode size={15} /> 1-Tap Redeem ({chosenGoal.cost} PTS)
                  </button>
                ) : (
                  <Link
                    to="/booking"
                    className="btn-primary"
                    style={{ flex: 1, height: '42px', fontSize: '0.8rem', fontWeight: 900, textDecoration: 'none' }}
                  >
                    Book Next Session (+{visitRate.totalPerVisit} PTS at Reception) <ChevronRight size={15} />
                  </Link>
                )}

                <div
                  style={{
                    background: quietTime ? '#fef3c7' : 'var(--bg-subtle)',
                    border: quietTime ? '1.5px solid #f59e0b' : '1px solid var(--border-color)',
                    color: quietTime ? '#b45309' : 'var(--slate-grey)',
                    padding: '0 10px',
                    height: '42px',
                    borderRadius: '12px',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  title="Automatic Club Clock: Mon–Thu 9:00 AM – 4:00 PM awards 2× points"
                >
                  <Zap size={13} /> {quietTime ? '2× Quiet-Time Live' : '1× Peak Hours'}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ILLUSTRATED GOLF COURSE FAIRWAY MAP (HOLE 1 TO HOLE 5)            */}
          {/* ================================================================= */}
          <div
            style={{
              background:
                'repeating-linear-gradient(180deg, #065f46 0px, #065f46 48px, #047857 48px, #047857 96px)',
              borderRadius: '24px',
              padding: '20px 16px',
              position: 'relative',
              overflow: 'hidden',
              border: '3px solid #064e3b',
              boxShadow: '0 16px 34px -10px rgba(6, 78, 59, 0.45)',
            }}
          >
            {/* Water Hazard & Sand Bunker */}
            <div
              style={{
                position: 'absolute',
                top: '135px',
                right: '-25px',
                width: '110px',
                height: '75px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                border: '3px solid #bae6fd',
                opacity: 0.75,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '120px',
                left: '-20px',
                width: '85px',
                height: '55px',
                borderRadius: '50%',
                background: '#fde68a',
                border: '3px solid #fcd34d',
                opacity: 0.8,
                pointerEvents: 'none',
              }}
            />

            {/* Course Header Banner */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                background: 'rgba(9, 13, 22, 0.78)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px',
                padding: '10px 14px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#fde047', letterSpacing: '0.07em' }}>
                  ⛳ NORTHWICK PARK 5-HOLE COURSE
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                  Verified by reception check-ins &amp; reward redemptions
                </div>
              </div>
              <Link
                to="/booking"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '6px 11px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                }}
              >
                Book Tee Time
              </Link>
            </div>

            {/* Center Fairway Dotted Path */}
            <div
              style={{
                position: 'absolute',
                top: '85px',
                bottom: '45px',
                left: '50%',
                width: '4px',
                transform: 'translateX(-50%)',
                background:
                  'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 10px, transparent 10px, transparent 18px)',
                zIndex: 1,
              }}
            />

            {/* 5 Winding Fairway Hole Greens */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {courseHoles.map((hole) => {
                const isSelected = selectedHoleNum === hole.holeNum;
                return (
                  <div
                    key={hole.holeNum}
                    onClick={() => {
                      playGameSound('tap');
                      setSelectedHoleNum(hole.holeNum);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: hole.align === 'right' ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '62px',
                        height: '62px',
                        borderRadius: '50%',
                        background: hole.done
                          ? 'radial-gradient(circle, #34d399 0%, #059669 100%)'
                          : hole.active
                          ? 'radial-gradient(circle, #fde047 0%, #d97706 100%)'
                          : 'radial-gradient(circle, #334155 0%, #0f172a 100%)',
                        border: isSelected
                          ? '4px solid #ffffff'
                          : hole.done
                          ? '3px solid #a7f3d0'
                          : hole.active
                          ? '3px solid #fef08a'
                          : '3px solid rgba(255,255,255,0.3)',
                        boxShadow: hole.active
                          ? '0 0 0 6px rgba(251, 191, 36, 0.35), 0 8px 20px rgba(0,0,0,0.4)'
                          : '0 8px 18px rgba(0,0,0,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.54rem',
                          fontWeight: 900,
                          color: hole.active ? '#090d16' : '#ecfdf5',
                          textTransform: 'uppercase',
                        }}
                      >
                        HOLE
                      </span>
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 900,
                          color: hole.active ? '#090d16' : '#ffffff',
                          lineHeight: 1,
                        }}
                      >
                        {hole.done ? '✓' : hole.holeNum}
                      </span>

                      {hole.active && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            background: '#090d16',
                            color: '#fde047',
                            fontSize: '0.52rem',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '999px',
                            border: '1px solid #fbbf24',
                          }}
                        >
                          🏌️‍♂️ YOU
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        background: isSelected ? 'rgba(9, 13, 22, 0.92)' : 'rgba(9, 13, 22, 0.72)',
                        backdropFilter: 'blur(8px)',
                        border: isSelected
                          ? '1.5px solid #fde047'
                          : hole.done
                          ? '1px solid rgba(52, 211, 153, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '16px',
                        padding: '11px 13px',
                        color: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#6ee7b7', letterSpacing: '0.05em' }}>
                          {hole.par}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: hole.done ? '#059669' : 'rgba(251, 191, 36, 0.2)',
                            color: hole.done ? '#ffffff' : '#fde047',
                          }}
                        >
                          {hole.done ? '★ CLEARED' : hole.rewardBadge}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                        {hole.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.3 }}>
                        {hole.subtitle}
                      </div>

                      {isSelected && hole.canClaimReward && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hole.holeNum === 1 && earlyWinReward) handleOneTapRedeem(earlyWinReward);
                            else if (hole.holeNum === 2 && chosenGoal?.reward) handleOneTapRedeem(chosenGoal.reward);
                            else if (hole.holeNum === 3) handleClaimCompletedQuest(rangeChallenge);
                            else if (hole.holeNum === 4) handleClaimCompletedQuest(explorerChallenge);
                          }}
                          style={{
                            marginTop: '8px',
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                            color: '#090d16',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                          }}
                        >
                          🎁 Redeem / Claim Unlocked Reward
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: CLUB QUESTS & TROPHY CABINET (Verified Progress Only)         */}
      {/* ===================================================================== */}
      {activeView === 'quests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quiet-Time 2× Bonus Power Hours Status Banner (Automatic Club Clock) */}
          <div
            style={{
              background: quietTime ? 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' : '#ffffff',
              color: quietTime ? '#ffffff' : 'var(--text-primary)',
              border: quietTime ? '1.5px solid #34d399' : '1px solid var(--border-color)',
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  color: quietTime ? '#fde047' : 'var(--brand-green)',
                  textTransform: 'uppercase',
                }}
              >
                ⚡ AUTOMATIC OFF-PEAK BONUS (MON–THU 9:00 AM – 4:00 PM)
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, marginTop: '2px' }}>
                {quietTime
                  ? 'Quiet-Time 2× Window Active Now — Reception Scans Award 200 PTS!'
                  : 'Currently Peak Hours (100 PTS / Visit) • Visit Mon–Thu 9am–4pm for 2× Points'}
              </div>
            </div>
            <span
              style={{
                background: quietTime ? '#fbbf24' : 'var(--bg-subtle)',
                color: quietTime ? '#090d16' : 'var(--slate-grey)',
                padding: '6px 11px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {quietTime ? '200 PTS / Visit' : '100 PTS / Visit'}
            </span>
          </div>

          {/* Participation Quests (Progress verified by Reception Scans & Redemptions) */}
          {journey.challenges.map((chal) => {
            const isReadyToClaim = chal.current >= chal.target && !chal.claimed;
            return (
              <div
                key={chal.id}
                style={{
                  background: chal.claimed ? '#f0fdf4' : isReadyToClaim ? '#fffbeb' : '#ffffff',
                  border: chal.claimed
                    ? '1.5px solid #6ee7b7'
                    : isReadyToClaim
                    ? '2px solid #f59e0b'
                    : '1px solid var(--border-color)',
                  borderRadius: '18px',
                  padding: '15px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        {chal.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: chal.claimed ? '#059669' : '#fef3c7',
                          color: chal.claimed ? '#ffffff' : '#b45309',
                        }}
                      >
                        +{chal.rewardPoints} PTS
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {chal.subtitle}
                    </div>
                  </div>

                  {chal.claimed ? (
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        color: '#059669',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle2 size={16} /> Claimed
                    </span>
                  ) : isReadyToClaim ? (
                    <button
                      type="button"
                      onClick={() => handleClaimCompletedQuest(chal)}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 13px',
                        borderRadius: '999px',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🎁 Claim +{chal.rewardPoints} PTS
                    </button>
                  ) : (
                    <Link
                      to={chal.id === 'chal_early_win' ? '/rewards' : '/booking'}
                      style={{
                        background: 'var(--brand-green-subtle)',
                        border: '1px solid rgba(4, 120, 87, 0.25)',
                        color: 'var(--brand-green)',
                        padding: '7px 11px',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chal.id === 'chal_early_win' ? 'Open Rewards →' : 'Book Session →'}
                    </Link>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  {Array.from({ length: chal.target }).map((_, i) => {
                    const done = i < chal.current;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '10px',
                          background: done ? 'var(--brand-green-subtle)' : 'var(--bg-subtle)',
                          border: done ? '1.5px solid var(--brand-green)' : '1px dashed #cbd5e1',
                          color: done ? 'var(--brand-green)' : 'var(--slate-grey)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          textAlign: 'center',
                        }}
                      >
                        {done ? '⛳' : '⚪'} {i + 1}/{chal.target}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                  🔒 Verified automatically when your pass is scanned at Reception.
                </div>
              </div>
            );
          })}

          {/* Trophy Cabinet */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '18px',
              padding: '15px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--slate-grey)', textTransform: 'uppercase', marginBottom: '10px' }}>
              🏅 Clubhouse Trophy Cabinet
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { name: 'Early Win', icon: Gift, unlocked: journey.rewardsRedeemedCount > 0, color: '#d97706' },
                {
                  name: 'Range Pro',
                  icon: Trophy,
                  unlocked: Boolean(journey.challenges.find((c) => c.id === 'chal_range_3')?.claimed),
                  color: '#059669',
                },
                {
                  name: 'Explorer',
                  icon: Compass,
                  unlocked: Boolean(journey.challenges.find((c) => c.id === 'chal_explorer')?.claimed),
                  color: '#0284c7',
                },
                {
                  name: '2× Regular',
                  icon: Zap,
                  unlocked: Boolean(journey.challenges.find((c) => c.id === 'chal_quiet_time')?.claimed),
                  color: '#7c3aed',
                },
              ].map((b) => {
                const IconComp = b.icon;
                return (
                  <div
                    key={b.name}
                    style={{
                      background: b.unlocked ? '#f8fafc' : '#f1f5f9',
                      border: b.unlocked ? `1.5px solid ${b.color}` : '1px dashed #cbd5e1',
                      borderRadius: '14px',
                      padding: '10px 6px',
                      textAlign: 'center',
                      opacity: b.unlocked ? 1 : 0.6,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        color: b.unlocked ? b.color : '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)' }}>{b.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: CLUBHOUSE (4-BALL TEAM GOAL, SOLO MODE & REAL REFERRALS)      */}
      {/* ===================================================================== */}
      {activeView === 'clubhouse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1-Tap Solo / Private Mode Switch */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {journey.socialPrivateMode ? (
                <Lock size={20} style={{ color: '#475569' }} />
              ) : (
                <Unlock size={20} style={{ color: '#059669' }} />
              )}
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {journey.socialPrivateMode ? 'Private Solo Mode Active' : '4-Ball Social Mode Active'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {journey.socialPrivateMode
                    ? 'Non-competitive mode: friend leaderboards are hidden.'
                    : 'Team up with friends or switch to Solo Mode anytime.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playGameSound('tap');
                setJourney(toggleSocialPrivateMode());
              }}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                color: 'var(--slate-dark)',
                padding: '7px 12px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {journey.socialPrivateMode ? 'Enable 4-Ball' : 'Go Private'}
            </button>
          </div>

          {/* 4-Ball Team Goal (Verified by Reception Check-Ins) */}
          {!journey.socialPrivateMode && (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid rgba(4, 120, 87, 0.28)',
                borderRadius: '18px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.64rem', fontWeight: 900, color: 'var(--brand-green)', textTransform: 'uppercase' }}>
                    👥 WEEKEND 4-BALL CO-OP GOAL
                  </span>
                  <div style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                    10 Combined Group Visits (+100 PTS Each)
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Advances automatically when group members check in at Reception
                  </div>
                </div>
                {journey.teamGoalClaimed ? (
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#059669' }}>✓ Claimed</span>
                ) : journey.teamGoalProgress >= journey.teamGoalTarget ? (
                  <button
                    type="button"
                    onClick={handleClaimTeamGoal}
                    style={{
                      background: 'var(--brand-green)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 12px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Claim +100 PTS
                  </button>
                ) : (
                  <span
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--slate-grey)',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {journey.teamGoalTarget - journey.teamGoalProgress} Visits Left
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
                {Array.from({ length: journey.teamGoalTarget }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '12px',
                      borderRadius: '4px',
                      background: i < journey.teamGoalProgress ? 'var(--brand-green)' : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-green)', marginTop: '6px' }}>
                {journey.teamGoalProgress} / {journey.teamGoalTarget} Verified Group Visits
              </div>
            </div>
          )}

          {/* REAL FAIR BUDDY REFERRAL SYSTEM (Verified by Reception Scanner `/admin/scan`) */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #fcd34d',
              borderRadius: '18px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheck size={16} style={{ color: '#059669' }} />
              <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                RECEPTION-VERIFIED BUDDY REFERRAL
              </span>
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Both Earn +200 PTS After Friend’s 1st Paid Visit
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 12px 0', lineHeight: 1.45 }}>
              <strong>How Verification Works:</strong> Share your invite code below or register your friend’s Email / Member ID. <strong>0 PTS are given on signup.</strong> When your friend arrives for their first paid session and staff scans their pass on the <strong>Reception Scanner (`/admin/scan`)</strong>, the system automatically verifies their visit and credits <strong>+200 PTS to both accounts</strong>.
            </p>

            {/* Personal Referral Code Box */}
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6rem', color: '#92400e', fontWeight: 800 }}>YOUR PERSONAL INVITE CODE</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, fontFamily: 'monospace', color: '#78350f' }}>
                  {referralCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(referralCode);
                  setCopiedReferral(true);
                  setTimeout(() => setCopiedReferral(false), 2000);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fcd34d',
                  color: '#b45309',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {copiedReferral ? <Check size={14} /> : <Copy size={14} />}
                {copiedReferral ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            {/* Register a Friend Form */}
            <form
              onSubmit={handleRegisterFriendReferral}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Link a Referred Golf Buddy (Awaiting Reception Scan)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Friend's Full Name"
                  value={friendNameInput}
                  onChange={(e) => setFriendNameInput(e.target.value)}
                  style={{ height: '38px', fontSize: '0.78rem' }}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Email or Member ID (PG-...)"
                  value={friendContactInput}
                  onChange={(e) => setFriendContactInput(e.target.value)}
                  style={{ height: '38px', fontSize: '0.78rem' }}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ height: '38px', fontSize: '0.78rem', fontWeight: 900 }}
              >
                <UserPlus size={14} /> Register Friend Invite (Pending 1st Visit)
              </button>

              {referralFormMsg && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: referralFormMsg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                    color: referralFormMsg.type === 'ok' ? '#047857' : '#dc2626',
                    border: referralFormMsg.type === 'ok' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  }}
                >
                  {referralFormMsg.text}
                </div>
              )}
            </form>

            {/* Referral Status Tracker */}
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--slate-grey)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Referred Friends Status ({journey.referrals.length})
            </div>
            {journey.referrals.map((ref) => {
              const verified = ref.status === 'first_visit_verified';
              return (
                <div
                  key={ref.id}
                  style={{
                    background: verified ? '#f0fdf4' : '#f8fafc',
                    border: verified ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '9px 11px',
                    marginTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.76rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{ref.friendName}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                      {ref.friendMemberId ? `ID: ${ref.friendMemberId}` : ref.friendEmail || `Invited ${ref.invitedDate}`}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      color: verified ? '#059669' : '#64748b',
                      background: verified ? '#d1fae5' : '#e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {verified ? '✓ 1st Visit Verified (+200 PTS)' : '⏳ Awaiting Reception Scan'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POP-UP 1: DAILY TEE-OFF STREAK MODAL (STRICTLY 1 CLAIM PER DAY)       */}
      {/* ===================================================================== */}
      {showDailyStreakPopup && (
        <div className="modal-overlay" onClick={() => setShowDailyStreakPopup(false)} style={{ zIndex: 1300 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '410px',
              borderRadius: '26px',
              padding: '22px 18px',
              background: 'linear-gradient(165deg, #090d16 0%, #0f172a 55%, #064e3b 100%)',
              color: '#ffffff',
              border: '2px solid rgba(251, 191, 36, 0.45)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setShowDailyStreakPopup(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(251, 191, 36, 0.2)',
                border: '1px solid #fbbf24',
                color: '#fde047',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              <Flame size={14} /> DAILY CLUB TEE-OFF STREAK (1 PER DAY)
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', margin: '0 0 4px 0' }}>
              Day {journey.streakDay || 1} Golf Streak 🔥
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Check in once per calendar day to build your streak toward the <strong>Day 7 Golden Caddy Chest</strong>.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              {DAILY_STREAK_REWARDS.map((item) => {
                const currentDay = journey.streakDay || 1;
                const isPast = item.day < currentDay || (item.day === currentDay && isDailyClaimedToday);
                const isToday = item.day === currentDay && !isDailyClaimedToday;

                return (
                  <div
                    key={item.day}
                    style={{
                      gridColumn: item.isChest ? 'span 2' : 'span 1',
                      background: isToday
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : isPast
                        ? 'rgba(16, 185, 129, 0.22)'
                        : 'rgba(255, 255, 255, 0.07)',
                      border: isToday
                        ? '2px solid #fef08a'
                        : isPast
                        ? '1.5px solid #34d399'
                        : '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '14px',
                      padding: '10px 6px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        color: isToday ? '#090d16' : isPast ? '#6ee7b7' : '#94a3b8',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', marginTop: '3px' }}>
                      {item.isChest ? '🏆 +50 PTS' : `+${item.pts} PTS`}
                    </div>
                    <div
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: isToday ? '#090d16' : '#a7f3d0',
                        marginTop: '1px',
                      }}
                    >
                      {isPast ? '✓ Claimed' : `+${item.xp} XP`}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isDailyClaimedToday}
              onClick={handleClaimDailyStreak}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                border: 'none',
                background: isDailyClaimedToday
                  ? 'rgba(255, 255, 255, 0.14)'
                  : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                color: isDailyClaimedToday ? '#94a3b8' : '#090d16',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: isDailyClaimedToday ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isDailyClaimedToday ? (
                <>
                  <CheckCircle2 size={17} /> Claimed for Today ({todayKey}) — Come Back Tomorrow
                </>
              ) : (
                <>
                  <Sparkles size={17} /> Claim Today’s Check-In Bonus
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POP-UP 2: DAILY "NEAREST THE PIN" SWING MODAL (STRICTLY 1 SHOT / DAY) */}
      {/* ===================================================================== */}
      {showDailySwingModal && (
        <div className="modal-overlay" onClick={() => setShowDailySwingModal(false)} style={{ zIndex: 1300 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '410px',
              borderRadius: '26px',
              padding: '22px 18px',
              background: '#0f172a',
              color: '#ffffff',
              border: '2px solid #34d399',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowDailySwingModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #34d399',
                color: '#6ee7b7',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 900,
                marginBottom: '8px',
              }}
            >
              <Crosshair size={13} /> DAILY NEAREST-THE-PIN (1 SHOT PER DAY)
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: '0 0 4px 0' }}>
              Daily Par-3 Tee Shot 🏌️‍♂️
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '0 0 14px 0' }}>
              You get <strong>1 official tee shot per day</strong> to earn Club XP toward your Caddy Chest.
            </p>

            <div
              style={{
                height: '130px',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, #0ea5e9 0%, #38bdf8 40%, #059669 41%, #047857 100%)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: '10%',
                  bottom: '14px',
                  width: '90px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#34d399',
                  border: '2px solid #a7f3d0',
                }}
              />
              <div style={{ position: 'absolute', right: '20%', bottom: '28px' }}>🚩</div>
              <div style={{ position: 'absolute', left: '10%', bottom: '16px', fontSize: '1.1rem' }}>🏌️‍♂️</div>
              <div
                style={{
                  position: 'absolute',
                  left: swingState === 'landed' || isDailySwingPlayedToday ? '79%' : '14%',
                  bottom: swingState === 'landed' || isDailySwingPlayedToday ? '26px' : '20px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  animation: swingState === 'swinging' ? 'pgBallArc 0.95s ease-out forwards' : 'none',
                }}
              />
            </div>

            {swingResult && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1.5px solid #34d399',
                  borderRadius: '14px',
                  padding: '12px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fde047' }}>{swingResult.zone}</div>
                <div style={{ fontSize: '0.76rem', color: '#ecfdf5', marginTop: '2px', fontWeight: 700 }}>
                  {swingResult.distance} &bull; Earned <strong>+{swingResult.points} PTS</strong> &amp;{' '}
                  <strong>+{swingResult.xp} XP</strong>!
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isDailySwingPlayedToday || swingState === 'swinging'}
              onClick={handleTakeDailySwing}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                background: isDailySwingPlayedToday
                  ? 'rgba(255, 255, 255, 0.14)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: isDailySwingPlayedToday ? '#94a3b8' : '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: isDailySwingPlayedToday ? 'not-allowed' : 'pointer',
              }}
            >
              {swingState === 'swinging'
                ? 'Ball in Flight...'
                : isDailySwingPlayedToday
                ? `✓ Today's Shot Completed (${todayKey}) — Next Shot Tomorrow`
                : '🏌️‍♂️ Take Today’s Official Tee Shot (1 Left)'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POP-UP 3: PRO SHOP CADDY MYSTERY CHEST MODAL (LOCKED UNTIL 300 XP)    */}
      {/* ===================================================================== */}
      {showChestModal && (
        <div className="modal-overlay" onClick={() => setShowChestModal(false)} style={{ zIndex: 1300 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '400px',
              borderRadius: '26px',
              padding: '22px 18px',
              background: 'linear-gradient(160deg, #090d16 0%, #1e293b 100%)',
              color: '#ffffff',
              border: '2px solid #fbbf24',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowChestModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: chestReady ? 'linear-gradient(135deg, #fbbf24, #d97706)' : '#334155',
                color: chestReady ? '#090d16' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                animation: chestReady ? 'pgChestWiggle 1.2s infinite' : 'none',
              }}
            >
              {chestReady ? <PackageOpen size={34} /> : <Lock size={30} />}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fde047', margin: '0 0 4px 0' }}>
              Golden Caddy Mystery Chest
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Chest Progress: <strong>{journey.chestXp} / {journey.chestTargetXp} XP</strong> ({chestPct}%)
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '14px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'left',
                fontSize: '0.76rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontWeight: 800, color: '#fde047' }}>Chest Contents (Unlocks at 300 XP):</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>✨ Loyalty Points Bundle</span>
                <strong style={{ color: '#34d399' }}>+50 Bonus PTS</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⚡ Golfer Level Progression</span>
                <strong style={{ color: '#38bdf8' }}>+25 Rank XP</strong>
              </div>
            </div>

            <button
              type="button"
              disabled={!chestReady}
              onClick={handleOpenMysteryChest}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                background: chestReady
                  ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                  : 'rgba(255, 255, 255, 0.14)',
                color: chestReady ? '#090d16' : '#94a3b8',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: chestReady ? 'pointer' : 'not-allowed',
              }}
            >
              {chestReady
                ? '🎁 Open Mystery Chest Now (+50 PTS)'
                : `🔒 Need ${Math.max(0, journey.chestTargetXp - journey.chestXp)} More XP to Unlock`}
            </button>
          </div>
        </div>
      )}

      {/* CELEBRATE PROGRESS: OFFICIAL CLUB POINTS RECEIPT MODAL */}
      {celebration && (
        <div className="modal-overlay" onClick={() => setCelebration(null)} style={{ zIndex: 1350 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '400px',
              borderRadius: '24px',
              padding: '22px 18px',
              textAlign: 'center',
              position: 'relative',
              background: '#ffffff',
            }}
          >
            <button
              type="button"
              onClick={() => setCelebration(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'var(--bg-subtle)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ecfdf5',
                border: '1px solid #6ee7b7',
                color: '#047857',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                marginBottom: '10px',
              }}
            >
              <Sparkles size={13} /> {celebration.badge}
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--brand-green)', lineHeight: 1.1, marginBottom: '4px' }}>
              +{celebration.pointsAdded} PTS
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              {celebration.title}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              {celebration.subtitle}
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '12px 14px',
                textAlign: 'left',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--slate-grey)', textTransform: 'uppercase' }}>
                Official Club Points Receipt &bull; {celebration.receiptRef}
              </div>
              {typeof celebration.basePoints === 'number' && celebration.basePoints > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Verified Points</span>
                  <span>+{celebration.basePoints} PTS</span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '6px',
                  marginTop: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  color: 'var(--text-primary)',
                }}
              >
                <span>Updated Points Balance</span>
                <span style={{ color: 'var(--brand-green)' }}>{celebration.newBalance.toLocaleString()} PTS</span>
              </div>
            </div>

            <button type="button" onClick={() => setCelebration(null)} className="btn-primary" style={{ height: '44px' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* 1-TAP RECEPTION REDEMPTION MODAL */}
      {quickRedeemModal && (
        <div className="modal-overlay" onClick={() => setQuickRedeemModal(null)} style={{ zIndex: 1350 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '390px' }}>
            <div style={{ color: 'var(--brand-green)', display: 'inline-flex', marginBottom: '8px' }}>
              <CheckCircle2 size={46} />
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--brand-green)',
                marginBottom: '4px',
              }}
            >
              1-TAP RECEPTION REDEMPTION PASS
            </div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {quickRedeemModal.rewardTitle}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Show this QR pass at reception or the Clubhouse Café for instant 1-scan fulfillment.
            </p>

            <div
              style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '12px',
              }}
            >
              <QRCodeSVG value={quickRedeemModal.qrToken} size={165} />
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--slate-dark)',
                marginBottom: '16px',
              }}
            >
              Pass Ref: {quickRedeemModal.qrToken}
            </div>

            <button type="button" onClick={() => setQuickRedeemModal(null)} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

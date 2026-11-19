import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Zap,
  CheckCircle2,
  Gift,
  ChevronRight,
  QrCode,
  Copy,
  Check,
  SlidersHorizontal,
  Flag,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  UserPlus,
  X,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth';
import { resolveCardVisualTier } from '../components/MembershipCard';
import { api, Reward, Transaction, getStoredRewards } from '../api';
import { BookingItem, getStoredBookings } from '../bookingsStore';
import { supabase } from '../supabase';
import {
  fetchBookingsFromSupabase,
  fetchRewardsFromSupabase,
  fetchTransactionsFromSupabase,
} from '../supabaseService';
import {
  getChosenRewardProgress,
  getMemberReferralCode,
  getStoredReferralRegistry,
  getVisitPointsRate,
  recordRedemptionInJourney,
  registerPendingReferral,
  setChosenRewardId,
  FriendReferral,
} from '../loyaltyJourneyStore';

export function GolfJourney() {
  const { user, token, setUser, refresh } = useAuth();

  const [rewards, setRewards] = useState<Reward[]>(() => getStoredRewards().filter((r) => r.active));
  const [bookings, setBookings] = useState<BookingItem[]>(() => getStoredBookings());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referrals, setReferrals] = useState<FriendReferral[]>(() => getStoredReferralRegistry());
  const [loading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [, setClockTick] = useState(0);

  // Goal picker & redeem state
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemModal, setRedeemModal] = useState<{
    rewardTitle: string;
    pointsCost: number;
    qrToken: string;
    discountCode?: string;
    redemptionType: 'qr' | 'discount';
  } | null>(null);

  // Referral state
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendContact, setFriendContact] = useState('');
  const [referralMsg, setReferralMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!user) return;
    setReferrals(getStoredReferralRegistry());
    const localMine = getStoredBookings().filter(
      (b) => b.user_id === user.id || b.user_member_id === user.member_id
    );
    setBookings(localMine);

    // Fetch each resource independently so one slow query doesn't block the others
    fetchTransactionsFromSupabase(user.id)
      .then((supaTxns) => {
        if (supaTxns) {
          setTransactions(supaTxns);
          setLastUpdated(new Date());
        } else if (token) {
          api.history(token)
            .then((hist) => setTransactions(hist))
            .catch(() => {});
        }
      })
      .catch(() => {});

    fetchBookingsFromSupabase()
      .then((supaBookings) => {
        if (supaBookings && supaBookings.length > 0) {
          const mine = supaBookings.filter(
            (b) => b.user_id === user.id || b.user_member_id === user.member_id
          );
          setBookings(mine);
          setLastUpdated(new Date());
        }
      })
      .catch(() => {});

    fetchRewardsFromSupabase(true)
      .then((supaRewards) => {
        if (supaRewards && supaRewards.length > 0) {
          setRewards(supaRewards);
          setLastUpdated(new Date());
        } else if (token) {
          api.rewards(token)
            .then((apiRewards) => {
              if (apiRewards.length > 0) setRewards(apiRewards);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    // Only reload when the signed-in member changes (not on every points/profile refresh),
    // otherwise refresh() -> new user object -> reload -> refresh() loops forever and hammers the database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.member_id, token]);

  // Keep a ref to the latest user so realtime handlers don't need to resubscribe on every change
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initial load + one-time auth refresh per member
  useEffect(() => {
    loadLiveData();
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLiveData]);

  // Keep Off-Peak / Peak clock accurate every 30s
  useEffect(() => {
    const interval = setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Supabase subscriptions for live points, bookings, transactions & rewards
  useEffect(() => {
    if (!user?.id || user.id.startsWith('usr_')) return;

    const channel = supabase
      .channel(`golf-journey-live-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as any;
          const current = userRef.current;
          if (next && current) {
            setUser({
              ...current,
              points: typeof next.points === 'number' ? next.points : current.points,
              points_balance: typeof next.points === 'number' ? next.points : current.points_balance,
              points_ytd: typeof next.points_ytd === 'number' ? next.points_ytd : current.points_ytd,
              tier: next.tier || current.tier,
            });
            setLastUpdated(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => {
          loadLiveData();
          refresh().catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadLiveData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards' },
        () => {
          loadLiveData();
        }
      )
      .subscribe();

    const onJourneyEvent = () => {
      setReferrals(getStoredReferralRegistry());
      loadLiveData();
    };
    window.addEventListener('playgolf-journey-updated', onJourneyEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('playgolf-journey-updated', onJourneyEvent);
    };
  }, [user?.id, setUser, refresh, loadLiveData]);

  const userPoints = user ? user.points ?? user.points_balance ?? 0 : 0;
  const visitRate = getVisitPointsRate();
  const chosenGoal = useMemo(() => {
    // Reading selectedRewardId ensures immediate re-computation when user picks a goal
    void selectedRewardId;
    return getChosenRewardProgress(userPoints, rewards);
  }, [userPoints, rewards, selectedRewardId]);

  // Real-time computed stats from actual bookings & transactions
  const stats = useMemo(() => {
    const completedBookings = bookings.filter((b) => b.status === 'completed');
    const activeOrCompleted = bookings.filter(
      (b) => b.status === 'completed' || b.status === 'confirmed'
    );
    const distinctActivities = Array.from(
      new Set(activeOrCompleted.map((b) => b.activity_name).filter(Boolean))
    );
    const rangeCompleted = completedBookings.filter((b) => b.activity_id === 'driving-range').length;
    const redeemTxns = transactions.filter((t) => t.type === 'redeem');
    const earnTxns = transactions.filter((t) => t.type === 'earn');
    const totalVisits = Math.max(completedBookings.length, earnTxns.length);

    return {
      totalVisits,
      distinctActivities,
      rangeCompleted,
      rewardsClaimed: redeemTxns.length,
    };
  }, [bookings, transactions]);

  if (!user) return null;

  const visualTier = resolveCardVisualTier(user);
  const currentTier = visualTier === 'Green' ? 'Club Member' : visualTier;
  const nextTier =
    visualTier === 'Green' ? 'Silver' : visualTier === 'Silver' ? 'Gold' : visualTier === 'Gold' ? 'Platinum' : null;
  const nextTierTarget =
    visualTier === 'Green' ? 1000 : visualTier === 'Silver' ? 10000 : visualTier === 'Gold' ? 20000 : 20000;
  const tierProgressPct = nextTier
    ? Math.min(100, Math.round((userPoints / nextTierTarget) * 100))
    : 100;
  const pointsToNextTier = nextTier ? Math.max(0, nextTierTarget - userPoints) : 0;

  const referralCode = getMemberReferralCode(user);

  const handleRedeem = async (reward: Reward) => {
    if (!token || userPoints < reward.points_cost) return;
    setRedeemError(null);
    setRedeemingId(reward.id);
    try {
      const res = await api.redeemReward(token, reward.id);
      recordRedemptionInJourney();
      await Promise.all([refresh().catch(() => {}), loadLiveData()]);
      setRedeemModal({
        rewardTitle: reward.title,
        pointsCost: reward.points_cost,
        qrToken: res.qr_code_token || '',
        discountCode: res.discount_code,
        redemptionType: res.redemption_type,
      });
    } catch (err: any) {
      setRedeemError(err?.message || 'Could not redeem reward right now. Please try again.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReferralMsg(null);
    const contact = friendContact.trim();
    const isMemberId = contact.toUpperCase().startsWith('PG-');
    const res = registerPendingReferral({
      referrerCode: referralCode,
      referrerMemberId: user.member_id,
      friendName,
      friendEmail: isMemberId ? undefined : contact,
      friendMemberId: isMemberId ? contact.toUpperCase() : undefined,
    });

    if (!res.ok) {
      setReferralMsg({ type: 'err', text: res.error || 'Please check your friend’s details.' });
      return;
    }

    setReferrals(getStoredReferralRegistry());
    setFriendName('');
    setFriendContact('');
    setReferralMsg({
      type: 'ok',
      text: `${res.referral?.friendName} added. You both receive +200 PTS once staff scans their first visit at reception.`,
    });
  };

  const milestones = [
    {
      id: 'first_visit',
      title: 'First Club Visit',
      description: 'Check in at reception for your first session',
      current: Math.min(1, stats.totalVisits),
      target: 1,
      actionLabel: 'Book Session',
      actionTo: '/booking',
    },
    {
      id: 'first_reward',
      title: 'First Reward Claimed',
      description: 'Redeem any reward using your points',
      current: Math.min(1, stats.rewardsClaimed),
      target: 1,
      actionLabel: 'View Rewards',
      actionTo: '/rewards',
    },
    {
      id: 'range_regular',
      title: 'Range Regular',
      description: 'Complete 3 Driving Range sessions',
      current: Math.min(3, stats.rangeCompleted),
      target: 3,
      actionLabel: 'Book Range',
      actionTo: '/booking/driving-range',
    },
    {
      id: 'club_explorer',
      title: 'Club Explorer',
      description: 'Try 2 different club activities',
      current: Math.min(2, stats.distinctActivities.length),
      target: 2,
      actionLabel: 'Explore',
      actionTo: '/booking',
    },
  ];

  return (
    <div style={{ padding: '14px 16px 32px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. LIVE POINTS & TIER SUMMARY */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
          borderRadius: '20px',
          padding: '18px',
          color: '#ffffff',
          boxShadow: '0 10px 24px rgba(6, 78, 59, 0.22)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 8px #34d399',
              }}
            />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a7f3d0', letterSpacing: '0.04em' }}>
              LIVE JOURNEY &bull; {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <span
            style={{
              background: visitRate.isQuietTime ? '#fbbf24' : 'rgba(255,255,255,0.14)',
              color: visitRate.isQuietTime ? '#090d16' : '#ecfdf5',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={12} />
            {visitRate.isQuietTime ? '2× Off-Peak (+200 PTS/visit)' : '+100 PTS/visit'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600 }}>Your Points Balance</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, marginTop: '2px' }}>
              {userPoints.toLocaleString()}{' '}
              <span style={{ fontSize: '0.9rem', color: '#6ee7b7', fontWeight: 800 }}>PTS</span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '6px 12px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.6rem', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>
              Current Tier
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff' }}>{currentTier}</div>
          </div>
        </div>

        {nextTier ? (
          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#d1fae5',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              <span>Progress to {nextTier}</span>
              <span>{pointsToNextTier.toLocaleString()} PTS to go</span>
            </div>
            <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.16)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${tierProgressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #34d399, #fbbf24)',
                  borderRadius: '999px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#fde047', fontWeight: 800 }}>
            <Trophy size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            Top Platinum Tier Unlocked
          </div>
        )}
      </div>

      {/* 2. MY TARGET REWARD */}
      {chosenGoal && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <img
                src={chosenGoal.reward.image_url}
                alt={chosenGoal.reward.title}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    color: 'var(--brand-green)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Flag size={11} /> Next Reward Goal
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {chosenGoal.reward.title}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGoalPicker((v) => !v)}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                color: 'var(--slate-dark)',
                padding: '6px 11px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              <SlidersHorizontal size={12} /> {showGoalPicker ? 'Close' : 'Change'}
            </button>
          </div>

          {showGoalPicker && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {rewards.map((r) => {
                const isSelected = r.id === chosenGoal.reward.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setChosenRewardId(r.id);
                      setSelectedRewardId(r.id);
                      setShowGoalPicker(false);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--brand-green)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--brand-green-subtle)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{r.title}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                        {r.points_cost.toLocaleString()} PTS
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--brand-green)' }}>
                      {isSelected ? 'Selected' : 'Pick'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 800, marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {chosenGoal.canRedeemNow
                  ? 'Ready to redeem!'
                  : `${chosenGoal.pointsRemaining.toLocaleString()} PTS needed (${chosenGoal.visitsStandard} visit${chosenGoal.visitsStandard === 1 ? '' : 's'})`}
              </span>
              <span style={{ color: 'var(--brand-green)' }}>
                {Math.min(userPoints, chosenGoal.cost).toLocaleString()} / {chosenGoal.cost.toLocaleString()} PTS
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${chosenGoal.progressPct}%`,
                  height: '100%',
                  background: chosenGoal.canRedeemNow
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : 'linear-gradient(90deg, var(--brand-green), var(--brand-green-light))',
                  borderRadius: '999px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          {redeemError && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 10px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} /> {redeemError}
            </div>
          )}

          {chosenGoal.canRedeemNow ? (
            <button
              type="button"
              disabled={redeemingId === chosenGoal.reward.id}
              onClick={() => handleRedeem(chosenGoal.reward)}
              className="btn-primary"
              style={{ width: '100%', height: '42px', fontSize: '0.84rem', fontWeight: 900 }}
            >
              <QrCode size={16} />
              {redeemingId === chosenGoal.reward.id
                ? 'Redeeming...'
                : `Redeem Now (${chosenGoal.cost.toLocaleString()} PTS)`}
            </button>
          ) : (
            <Link
              to="/booking"
              className="btn-primary"
              style={{ width: '100%', height: '42px', fontSize: '0.84rem', fontWeight: 900, textDecoration: 'none' }}
            >
              Book Next Session <ChevronRight size={16} />
            </Link>
          )}
        </div>
      )}

      {/* 3. LIVE STATS SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '—' : stats.totalVisits}
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-grey)', marginTop: '2px' }}>
            Visits
          </div>
        </div>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {loading ? '—' : stats.distinctActivities.length}
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-grey)', marginTop: '2px' }}>
            Activities
          </div>
        </div>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--brand-green)' }}>
            {loading ? '—' : stats.rewardsClaimed}
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-grey)', marginTop: '2px' }}>
            Rewards
          </div>
        </div>
      </div>

      {/* 4. CLUB MILESTONES (REAL PROGRESS) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Target size={16} style={{ color: 'var(--brand-green)' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Club Milestones
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {milestones.map((m) => {
            const done = m.current >= m.target;
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));
            return (
              <div
                key={m.id}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: done ? '#f0fdf4' : '#f8fafc',
                  border: done ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {done && <CheckCircle2 size={15} style={{ color: '#059669' }} />}
                      {m.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {m.description}
                    </div>
                  </div>

                  {done ? (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        color: '#047857',
                        background: '#d1fae5',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Done
                    </span>
                  ) : (
                    <Link
                      to={m.actionTo}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--brand-green)',
                        background: '#ffffff',
                        border: '1px solid rgba(4, 120, 87, 0.25)',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.actionLabel} →
                    </Link>
                  )}
                </div>

                {!done && m.target > 1 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                      <span>Progress</span>
                      <span>
                        {m.current} / {m.target}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--brand-green)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. RECENT LIVE ACTIVITY */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} style={{ color: 'var(--brand-green)' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Recent Activity
            </span>
          </div>
          <Link
            to="/history"
            style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-green)', textDecoration: 'none' }}
          >
            View All →
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            No points activity yet. Book a session and scan your pass at reception to earn points!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 5).map((tx) => {
              const isEarn = tx.type !== 'redeem';
              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 10px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '10px',
                        background: isEarn ? '#ecfdf5' : '#fef3c7',
                        color: isEarn ? '#059669' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isEarn ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tx.title}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      color: isEarn ? '#059669' : '#b45309',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isEarn ? `+${tx.points}` : `-${tx.points}`} PTS
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. INVITE A FRIEND (COMPACT & REAL) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gift size={16} style={{ color: '#d97706' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Invite a Friend (+200 PTS Each)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowInviteForm((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-green)',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {showInviteForm ? 'Hide' : 'Track Friend'}
          </button>
        </div>

        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
          Share your code. When your friend checks in for their 1st paid visit at reception, you both get +200 PTS.
        </p>

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
          }}
        >
          <span style={{ fontSize: '0.92rem', fontWeight: 900, fontFamily: 'monospace', color: '#78350f' }}>
            {referralCode}
          </span>
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
              padding: '6px 11px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copiedReferral ? <Check size={13} /> : <Copy size={13} />}
            {copiedReferral ? 'Copied' : 'Copy'}
          </button>
        </div>

        {showInviteForm && (
          <form onSubmit={handleInviteSubmit} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Friend's Name"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                style={{ height: '38px', fontSize: '0.78rem' }}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder="Email or PG-ID"
                value={friendContact}
                onChange={(e) => setFriendContact(e.target.value)}
                style={{ height: '38px', fontSize: '0.78rem' }}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ height: '38px', fontSize: '0.78rem', fontWeight: 800 }}>
              <UserPlus size={14} /> Link Friend Invite
            </button>
            {referralMsg && (
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: referralMsg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                  color: referralMsg.type === 'ok' ? '#047857' : '#dc2626',
                }}
              >
                {referralMsg.text}
              </div>
            )}
          </form>
        )}

        {referrals.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {referrals.map((ref) => {
              const verified = ref.status === 'first_visit_verified';
              return (
                <div
                  key={ref.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: verified ? '#f0fdf4' : '#f8fafc',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{ref.friendName}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: verified ? '#059669' : '#64748b',
                    }}
                  >
                    {verified ? 'Verified (+200 PTS)' : 'Pending 1st Visit'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REWARD REDEMPTION MODAL */}
      {redeemModal && (
        <div className="modal-overlay" onClick={() => setRedeemModal(null)} style={{ zIndex: 1350 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRedeemModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-grey)' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--brand-green)', textTransform: 'uppercase' }}>
              Reward Unlocked
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 12px 0' }}>
              {redeemModal.rewardTitle}
            </h3>

            {redeemModal.redemptionType === 'discount' && redeemModal.discountCode ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px dashed var(--brand-green)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Show or enter this code at reception:
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--brand-green)', marginTop: '4px' }}>
                  {redeemModal.discountCode}
                </div>
              </div>
            ) : (
              <div style={{ display: 'inline-block', padding: '14px', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <QRCodeSVG value={redeemModal.qrToken} size={160} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setRedeemModal(null)}
              className="btn-primary"
              style={{ width: '100%', height: '42px', fontWeight: 800 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

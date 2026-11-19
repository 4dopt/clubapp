import React, { useEffect, useState } from 'react';
import { Gift, CheckCircle, AlertCircle, Copy, Check, Target, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Reward, getStoredRewards } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import {
  getChosenRewardProgress,
  setChosenRewardId,
  recordRedemptionInJourney,
  getVisitPointsRate,
} from '../loyaltyJourneyStore';

export function Rewards() {
  const { user, token, refresh } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>(() => getStoredRewards().filter((r) => r.active));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(() => getStoredRewards().filter((r) => r.active).length === 0);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');
  const [goalRefreshTick, setGoalRefreshTick] = useState(0);

  useEffect(() => {
    const syncLocalRewards = () => {
      const active = getStoredRewards().filter((r) => r.active);
      if (active.length > 0) {
        setRewards(active);
        setLoading(false);
      }
    };
    window.addEventListener('playgolf-rewards-updated', syncLocalRewards);

    if (token) {
      api.rewards(token)
        .then((list) => {
          if (list && list.length > 0) setRewards(list);
        })
        .catch(() => {
          if (rewards.length === 0) setError('Failed to load rewards');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('playgolf-rewards-updated', syncLocalRewards);
  }, [token]);

  const handleRedeem = async (reward: Reward) => {
    if (!token || !user) return;
    const balance = user.points ?? user.points_balance ?? 0;
    if (balance < reward.points_cost) {
      setError(`Insufficient points. You need ${reward.points_cost} points.`);
      return;
    }
    setError('');
    setRedeeming(reward.id);
    try {
      const result = await api.redeemReward(token, reward.id);
      recordRedemptionInJourney();
      setRedemptionResult({ ...result, rewardTitle: reward.title, pointsCost: reward.points_cost });
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Redemption failed');
    } finally {
      setRedeeming(null);
    }
  };

  if (!user) return null;

  const userPoints = user.points ?? user.points_balance ?? 0;
  const chosenGoal = getChosenRewardProgress(userPoints, rewards);
  const visitRate = getVisitPointsRate();
  void goalRefreshTick;
  const derivedCategories = Array.from(new Set(rewards.map((r) => r.category).filter(Boolean)));
  const categories = ['All', ...derivedCategories];

  const filteredRewards =
    selectedCategory === 'All' ? rewards : rewards.filter((r) => r.category === selectedCategory);

  return (
    <div style={{ padding: '16px 16px 28px 16px' }}>
      {/* Page Title & Balance Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.2,
            }}
          >
            <Gift size={22} style={{ color: '#d97706', flexShrink: 0 }} /> Rewards Catalog
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Redeem your points for balls, gear & coaching
          </p>
        </div>

        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 800,
            boxShadow: 'var(--shadow-sm)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {userPoints.toLocaleString()} PTS
        </div>
      </div>

      {/* Chosen Target Reward Banner */}
      {chosenGoal && (
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '14px',
            boxShadow: '0 6px 18px rgba(4, 120, 87, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Target size={13} /> MY CHOSEN REWARD GOAL
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'rgba(255,255,255,0.16)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {chosenGoal.progressPct}% ({Math.min(userPoints, chosenGoal.cost)}/{chosenGoal.cost} PTS)
            </span>
          </div>

          <div style={{ fontSize: '0.94rem', fontWeight: 800, marginBottom: '6px' }}>
            “I’m saving for: {chosenGoal.reward.title}”
          </div>

          <div
            style={{
              width: '100%',
              height: '7px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${chosenGoal.progressPct}%`,
                height: '100%',
                background: '#34d399',
                borderRadius: '999px',
              }}
            />
          </div>

          <div style={{ fontSize: '0.74rem', color: '#ecfdf5', fontWeight: 700, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            {chosenGoal.canRedeemNow ? (
              <span>✓ Goal Reached — 0 visits remaining! Tap Redeem below.</span>
            ) : (
              <>
                <span>
                  🎯 <strong>{chosenGoal.visitsStandard} standard visit{chosenGoal.visitsStandard === 1 ? '' : 's'}</strong> remaining ({chosenGoal.pointsRemaining} PTS needed)
                </span>
                <span style={{ color: '#fde68a' }}>
                  ⚡ Or {chosenGoal.visitsQuietTime} Quiet-Time 2× visit{chosenGoal.visitsQuietTime === 1 ? '' : 's'}!
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div
          className="hide-scrollbar"
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '6px',
            marginBottom: '14px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: isActive ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                  background: isActive ? 'var(--brand-green)' : '#ffffff',
                  color: isActive ? '#ffffff' : 'var(--slate-dark)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 3px 10px rgba(4, 120, 87, 0.22)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--slate-grey)', fontSize: '0.88rem' }}>
          Loading rewards...
        </div>
      ) : filteredRewards.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--slate-grey)',
            fontSize: '0.85rem',
          }}
        >
          No rewards available in this category right now.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRewards.map((r) => {
            const canAfford = userPoints >= r.points_cost;
            const pointsNeeded = Math.max(0, r.points_cost - userPoints);
            const visitsStandard = pointsNeeded === 0 ? 0 : Math.ceil(pointsNeeded / 100);
            const visitsQuietTime = pointsNeeded === 0 ? 0 : Math.ceil(pointsNeeded / 200);
            const isChosenGoal = chosenGoal?.reward.id === r.id;
            const isEarlyWin = Boolean(r.is_early_win || r.id === 'rew_early_1' || r.points_cost <= 75);

            return (
              <div
                key={r.id}
                style={{
                  background: '#ffffff',
                  border: isChosenGoal
                    ? '2px solid var(--brand-green)'
                    : isEarlyWin
                    ? '1.5px solid #f59e0b'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ height: '156px', position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
                  <img
                    src={r.image_url}
                    alt={r.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.05) 50%, rgba(15,23,42,0.5) 100%)',
                    }}
                  />
                  {isEarlyWin && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                      }}
                    >
                      <Sparkles size={12} /> EARLY WIN STARTER
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      color: '#b45309',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                    }}
                  >
                    {r.points_cost} PTS
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {r.category}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.3 }}>
                    {r.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.45 }}>
                    {r.description}
                  </p>

                  {/* Visits Remaining & Quiet-Time Info Bar */}
                  <div
                    style={{
                      background: canAfford ? '#f0fdf4' : '#f8fafc',
                      border: canAfford ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                      fontSize: '0.73rem',
                    }}
                  >
                    {canAfford ? (
                      <span style={{ color: '#047857', fontWeight: 800 }}>
                        ✓ Unlocked (0 visits remaining) — Ready for 1-Tap Redemption
                      </span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                          🎯 {visitsStandard} standard visit{visitsStandard === 1 ? '' : 's'} remaining ({pointsNeeded} PTS)
                        </span>
                        <span style={{ color: '#b45309', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Zap size={12} /> {visitsQuietTime} in Quiet-Time 2×
                        </span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canAfford || redeeming === r.id}
                      className={canAfford ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        flex: 1,
                        height: '44px',
                        opacity: canAfford ? 1 : 0.75,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                      }}
                    >
                      {redeeming === r.id ? (
                        'Redeeming...'
                      ) : canAfford ? (
                        <>1-Tap Redeem ({r.points_cost} PTS)</>
                      ) : (
                        <>Need {pointsNeeded} More PTS</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChosenRewardId(r.id);
                        setGoalRefreshTick((t) => t + 1);
                      }}
                      style={{
                        padding: '0 12px',
                        height: '44px',
                        borderRadius: '12px',
                        border: isChosenGoal ? '1.5px solid var(--brand-green)' : '1px solid var(--border-color)',
                        background: isChosenGoal ? 'var(--brand-green-subtle)' : '#ffffff',
                        color: isChosenGoal ? 'var(--brand-green)' : 'var(--slate-dark)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <Target size={14} />
                      {isChosenGoal ? 'My Goal ✓' : 'Set as Goal'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redemption Result Modal */}
      {redemptionResult && (
        <div className="modal-overlay" onClick={() => setRedemptionResult(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--brand-green)', display: 'inline-flex', marginBottom: '10px' }}>
              <CheckCircle size={48} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Redemption Successful!
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              {redemptionResult.rewardTitle}
            </p>

            {redemptionResult.redemption_type === 'discount' ? (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '16px',
                  borderRadius: '14px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 700 }}>
                  Discount Promo Code
                </div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#b45309',
                    letterSpacing: '0.1em',
                    marginTop: '4px',
                    marginBottom: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  {redemptionResult.discount_code || 'PLAYGOLF20'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(redemptionResult.discount_code || 'PLAYGOLF20');
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fcd34d',
                    color: '#b45309',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            ) : (
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
                  marginBottom: '18px',
                }}
              >
                <QRCodeSVG value={redemptionResult.qr_code_token || 'QR_REDEEM_DEMO'} size={170} />
              </div>
            )}

            <button onClick={() => setRedemptionResult(null)} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

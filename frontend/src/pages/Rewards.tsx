import React, { useEffect, useState } from 'react';
import { Gift, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Reward } from '../api';
import { QRCodeSVG } from 'qrcode.react';

export function Rewards() {
  const { user, token, refresh } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      api.rewards(token)
        .then(setRewards)
        .catch(() => setError('Failed to load rewards'))
        .finally(() => setLoading(false));
    }
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
      setRedemptionResult({ ...result, rewardTitle: reward.title });
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Redemption failed');
    } finally {
      setRedeeming(null);
    }
  };

  if (!user) return null;

  const userPoints = user.points ?? user.points_balance ?? 0;
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

            return (
              <div
                key={r.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.45 }}>
                    {r.description}
                  </p>

                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!canAfford || redeeming === r.id}
                    className={canAfford ? 'btn-primary' : 'btn-secondary'}
                    style={{
                      height: '46px',
                      opacity: canAfford ? 1 : 0.75,
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                    }}
                  >
                    {redeeming === r.id ? (
                      'Redeeming...'
                    ) : canAfford ? (
                      <>Redeem for {r.points_cost} PTS</>
                    ) : (
                      <>Need {pointsNeeded} More Points</>
                    )}
                  </button>
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

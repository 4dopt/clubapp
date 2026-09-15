import React, { useEffect, useState } from 'react';
import { Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Reward } from '../api';
import { QRCodeSVG } from 'qrcode.react';

export function Rewards() {
  const { user, token, refresh } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
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
    if ((user.points || user.points_balance || 0) < reward.points_cost) {
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift style={{ color: '#d97706' }} /> Rewards Catalog
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Redeem your points for balls, gear & coaching
          </p>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 800 }}>
          {(user.points || user.points_balance || 0).toLocaleString()} PTS
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-grey)' }}>Loading rewards...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rewards.map((r) => {
            const canAfford = (user.points || user.points_balance || 0) >= r.points_cost;

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
                <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 'var(--radius-full)', color: '#b45309', fontWeight: 800, fontSize: '0.8rem', boxShadow: 'var(--shadow-sm)' }}>
                    {r.points_cost} PTS
                  </div>
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.8)', padding: '2px 8px', borderRadius: '4px', color: '#ffffff', fontSize: '0.7rem', fontWeight: 600 }}>
                    {r.category}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {r.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                    {r.description}
                  </p>

                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!canAfford || redeeming === r.id}
                    className={`btn-primary ${canAfford ? '' : 'btn-secondary'}`}
                    style={{
                      opacity: canAfford ? 1 : 0.6,
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {redeeming === r.id ? (
                      'Redeeming...'
                    ) : canAfford ? (
                      <>Redeem for {r.points_cost} PTS</>
                    ) : (
                      <>Need {r.points_cost - (user.points || user.points_balance || 0)} More Points</>
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
            <div style={{ color: 'var(--brand-green)', display: 'inline-flex', marginBottom: '12px' }}>
              <CheckCircle size={48} />
            </div>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Redemption Successful!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {redemptionResult.rewardTitle}
            </p>

            {redemptionResult.redemption_type === 'discount' ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 700 }}>Discount Code</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', letterSpacing: '0.1em', marginTop: '4px' }}>
                  {redemptionResult.discount_code || 'PLAYGOLF20'}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', display: 'inline-block', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <QRCodeSVG value={redemptionResult.qr_code_token || 'QR_REDEEM_DEMO'} size={160} />
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

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Calendar, QrCode, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth';
import { MembershipCard } from '../components/MembershipCard';
import { OffersSlider } from '../components/OffersSlider';
import { QrModal } from '../components/QrModal';
import { api, Transaction } from '../api';

export function Dashboard() {
  const { user, token } = useAuth();
  const [showQrModal, setShowQrModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.history(token)
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  if (!user) return null;

  return (
    <div style={{ padding: '16px 0 32px 0' }}>
      {/* Greeting Header */}
      <div style={{ padding: '0 20px 12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Hello, {user.name.split(' ')[0]} 👋
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Welcome to PlayGolf Club
          </p>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          style={{
            background: 'var(--brand-green-subtle)',
            border: '1px solid rgba(4, 120, 87, 0.3)',
            color: 'var(--brand-green)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <QrCode size={16} /> QR Pass
        </button>
      </div>

      {/* Digital Membership Card */}
      <MembershipCard user={user} onOpenQrModal={() => setShowQrModal(true)} />

      {/* Tier Progress Indicator */}
      {user.tier !== 'Platinum' && (
        <div style={{ margin: '0 20px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 700 }}>
            <span>Progress to {user.tier === 'Silver' ? 'Gold' : 'Platinum'} Tier</span>
            <span>{user.points} / {user.tier === 'Silver' ? 1000 : 5000} PTS</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.round((user.points / (user.tier === 'Silver' ? 1000 : 5000)) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-green), var(--brand-green-light))', borderRadius: '3px' }} />
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
        <Link
          to="/booking"
          className="btn-secondary"
          style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textDecoration: 'none', background: 'var(--brand-green-subtle)', borderColor: 'rgba(4, 120, 87, 0.25)' }}
        >
          <div style={{ background: '#ffffff', color: 'var(--brand-green)', padding: '8px', borderRadius: '10px', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <Calendar size={20} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--brand-green)' }}>Book Activity</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--slate-grey)' }}>Range, Golf & Games</span>
        </Link>

        <Link
          to="/rewards"
          className="btn-secondary"
          style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textDecoration: 'none', background: '#fffbeb', borderColor: '#fde68a' }}
        >
          <div style={{ background: '#ffffff', color: '#d97706', padding: '8px', borderRadius: '10px', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <Gift size={20} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309' }}>Browse Rewards</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--slate-grey)' }}>Redeem balls & coaching</span>
        </Link>
      </div>

      {/* Exclusive Offers Slider */}
      <OffersSlider />

      {/* Recent Activity Section */}
      <div style={{ padding: '12px 20px 0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={18} style={{ color: 'var(--brand-green)' }} /> Recent Activity
          </h3>
          <Link to="/profile" style={{ fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            View Profile & History <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {transactions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.85rem' }}>
              No transactions recorded yet. Visit the driving range to earn your first points!
            </div>
          ) : (
            transactions.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-grey)', marginTop: '2px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                  }}
                >
                  {t.type === 'earn' ? `+${t.points}` : `-${t.points}`} PTS
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showQrModal && <QrModal user={user} onClose={() => setShowQrModal(false)} />}
    </div>
  );
}

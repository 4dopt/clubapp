import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Phone, Calendar, ShieldCheck, Award, History, QrCode, LogOut, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Transaction } from '../api';
import { QrModal } from '../components/QrModal';

export function Profile() {
  const { user, token, signOut } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const nextTierName = user.tier === 'Silver' ? 'Gold' : user.tier === 'Gold' ? 'Platinum' : 'Max';
  const nextTierPoints = user.tier === 'Silver' ? 1000 : user.tier === 'Gold' ? 5000 : user.points;
  const currentPoints = user.points || user.points_balance || 0;
  const progressPercent = user.tier === 'Platinum' ? 100 : Math.min(100, Math.round((currentPoints / nextTierPoints) * 100));

  return (
    <div style={{ padding: '20px 20px 40px 20px' }}>
      {/* Profile Header Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--brand-green-subtle)',
            color: 'var(--brand-green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            border: '2px solid var(--brand-green-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '12px',
          }}
        >
          {user.name.charAt(0)}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {user.name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <span className="tier-pill" style={{ background: 'var(--slate-dark)', color: '#fff', fontSize: '0.7rem' }}>
            {user.tier} TIER
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate-grey)', fontFamily: 'monospace' }}>
            ID: {user.member_id}
          </span>
        </div>

        {/* Action Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => setShowQrModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '10px', background: 'var(--brand-green-subtle)', color: 'var(--brand-green)', borderColor: 'rgba(4, 120, 87, 0.3)' }}
          >
            <QrCode size={16} /> Show QR Pass
          </button>
          <button
            onClick={() => signOut()}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '10px', color: '#dc2626', borderColor: '#fecaca' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Membership Loyalty & Tier Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={18} style={{ color: '#d97706' }} /> Loyalty & Tier Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--slate-grey)', textTransform: 'uppercase', fontWeight: 700 }}>Points Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-green)', marginTop: '2px' }}>
              {currentPoints.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>PTS</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--slate-grey)', textTransform: 'uppercase', fontWeight: 700 }}>Lifetime YTD</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-dark)', marginTop: '2px' }}>
              {(user.points_ytd || currentPoints).toLocaleString()} <span style={{ fontSize: '0.75rem' }}>PTS</span>
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        {user.tier !== 'Platinum' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-grey)', marginBottom: '6px', fontWeight: 600 }}>
              <span>Tier Progress to {nextTierName}</span>
              <span>{currentPoints} / {nextTierPoints} PTS</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-green), var(--brand-green-light))', borderRadius: '4px' }} />
            </div>
          </div>
        )}
      </div>

      {/* Account Info Details */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserIcon size={18} style={{ color: 'var(--brand-green)' }} /> Account Details
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} /> Email
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} /> Member Status
            </span>
            <span style={{ fontWeight: 700, color: 'var(--brand-green)', background: 'var(--brand-green-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem' }}>
              Active Member
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} /> Joined Club
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Date(user.created_at || '2026-01-01').toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Integrated Points & Visit History Section */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={18} style={{ color: 'var(--brand-green)' }} /> Activity & History Log
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
            {transactions.length} Records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-grey)' }}>Loading activity history...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.85rem' }}>No activity history found.</div>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--slate-grey)', marginTop: '2px' }}>
                  {new Date(t.created_at).toLocaleString()}
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

      {showQrModal && <QrModal user={user} onClose={() => setShowQrModal(false)} />}
    </div>
  );
}

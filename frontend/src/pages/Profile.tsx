import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Calendar, ShieldCheck, Award, History, QrCode, LogOut, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Transaction } from '../api';
import { QrModal } from '../components/QrModal';
import { resolveCardVisualTier } from '../components/MembershipCard';

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

  const currentPoints = user.points ?? user.points_balance ?? 0;
  const visualTier = resolveCardVisualTier(user);
  const nextTierName = visualTier === 'Green' ? 'Silver' : visualTier === 'Silver' ? 'Gold' : visualTier === 'Gold' ? 'Platinum' : 'Max';
  const nextTierPoints = visualTier === 'Green' ? 500 : visualTier === 'Silver' ? 1000 : visualTier === 'Gold' ? 5000 : currentPoints;
  const progressPercent = visualTier === 'Platinum' ? 100 : Math.min(100, Math.round((currentPoints / nextTierPoints) * 100));

  return (
    <div style={{ padding: '16px 16px 28px 16px' }}>
      {/* Profile Header Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px 18px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--brand-green-subtle)',
            color: 'var(--brand-green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.7rem',
            fontWeight: 800,
            border: '2px solid var(--brand-green-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '10px',
          }}
        >
          {(user.name || 'M').charAt(0).toUpperCase()}
        </div>

        <h2
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span className="tier-pill" style={{ background: 'var(--slate-dark)', color: '#fff', fontSize: '0.66rem' }}>
            {visualTier === 'Green' ? 'CLUB MEMBER' : `${visualTier} TIER`}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--slate-grey)', fontFamily: 'monospace', fontWeight: 700 }}>
            ID: {user.member_id}
          </span>
        </div>

        {/* Action Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => setShowQrModal(true)}
            className="btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '10px 12px',
              background: 'var(--brand-green-subtle)',
              color: 'var(--brand-green)',
              borderColor: 'rgba(4, 120, 87, 0.3)',
              fontWeight: 700,
            }}
          >
            <QrCode size={16} /> Show QR Pass
          </button>
          <button
            onClick={() => signOut()}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '10px 12px', color: '#dc2626', borderColor: '#fecaca', fontWeight: 700 }}
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
          padding: '18px 16px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={18} style={{ color: '#d97706' }} /> Loyalty & Tier Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: visualTier !== 'Platinum' ? '14px' : '0' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', textTransform: 'uppercase', fontWeight: 700 }}>Points Balance</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-green)', marginTop: '2px' }}>
              {currentPoints.toLocaleString()} <span style={{ fontSize: '0.72rem' }}>PTS</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', textTransform: 'uppercase', fontWeight: 700 }}>Lifetime YTD</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-dark)', marginTop: '2px' }}>
              {(user.points_ytd || currentPoints).toLocaleString()} <span style={{ fontSize: '0.72rem' }}>PTS</span>
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        {visualTier !== 'Platinum' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--slate-grey)', marginBottom: '6px', fontWeight: 700 }}>
              <span>Tier Progress to {nextTierName}</span>
              <span style={{ color: 'var(--brand-green)', fontWeight: 800 }}>{currentPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} PTS</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
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
          padding: '18px 16px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserIcon size={18} style={{ color: 'var(--brand-green)' }} /> Account Details
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontWeight: 600 }}>
              <Mail size={15} /> Email
            </span>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-primary)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {user.email}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontWeight: 600 }}>
              <ShieldCheck size={15} /> Member Status
            </span>
            <span
              style={{
                fontWeight: 800,
                color: 'var(--brand-green)',
                background: 'var(--brand-green-subtle)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
              }}
            >
              Active Member
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--slate-grey)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontWeight: 600 }}>
              <Calendar size={15} /> Joined Club
            </span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date(user.created_at || '2026-01-01').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
        <div style={{ padding: '15px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <History size={18} style={{ color: 'var(--brand-green)' }} /> Activity & History Log
          </h3>
          <span style={{ fontSize: '0.74rem', color: 'var(--slate-grey)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {transactions.length} Records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.84rem' }}>Loading activity history...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.84rem' }}>No activity history found.</div>
        ) : (
          transactions.map((t, idx, arr) => (
            <div
              key={t.id}
              style={{
                padding: '14px 16px',
                borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: t.type === 'earn' ? 'var(--brand-green-subtle)' : '#fef2f2',
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {t.type === 'earn' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', marginTop: '2px' }}>
                    {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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

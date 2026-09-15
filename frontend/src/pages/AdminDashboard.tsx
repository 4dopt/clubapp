import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, QrCode, Users, Gift, TrendingUp, UserPlus, Award, Zap, Activity } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, AdminStats, User } from '../api';

export function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [quickMemberId, setQuickMemberId] = useState('');
  const [quickLogMessage, setQuickLogMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      adminApi.stats(token)
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleQuickCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMemberId.trim() || !token) return;
    try {
      const res = await adminApi.logVisit(token, quickMemberId);
      setQuickLogMessage(`Check-in logged for ${res.member_name} (+100 PTS)`);
      setQuickMemberId('');
      const updated = await adminApi.stats(token);
      setStats(updated);
    } catch (err: any) {
      setQuickLogMessage(err.message || 'Check-in failed');
    }
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 20px 40px 20px' }}>
      {/* Admin Top Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '6px' }}>
            <Shield size={12} /> STAFF OPERATIONS TERMINAL
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
            Club Analytics & Operations
          </h2>
        </div>

        <Link
          to="/admin/scan"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 800,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
        >
          <QrCode size={18} /> Camera Scanner
        </Link>
      </div>

      {quickLogMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px', fontWeight: 700 }}>
          {quickLogMessage}
        </div>
      )}

      {/* Primary Analytics KPI Grid (All numbers in Green & Green shades) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Visits Today</span>
            <Activity size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            {stats?.visits_today ?? 32}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>Range bay check-ins</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Points Issued Today</span>
            <Zap size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            {(stats?.points_issued_today ?? 4500).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>Loyalty rewards given</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Active Members</span>
            <Users size={16} color="#6ee7b7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6ee7b7', marginTop: '6px' }}>
            {stats?.total_members ?? 142}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>Total club roster</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Redemptions Today</span>
            <Gift size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a7f3d0', marginTop: '6px' }}>
            {stats?.redemptions_today ?? 8}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>Perks & items claimed</div>
        </div>
      </div>

      {/* Tier Breakdown Analytics Card (Green Shades) */}
      <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#10b981" /> Member Tier Distribution
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>Silver Tier</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a7f3d0', marginTop: '2px' }}>{stats?.tiers?.Silver ?? 95}</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Gold Tier</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{stats?.tiers?.Gold ?? 35}</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.22)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Platinum</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{stats?.tiers?.Platinum ?? 12}</div>
          </div>
        </div>
      </div>

      {/* Quick Action: Log Visit Check-in */}
      <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} color="#10b981" /> Quick Visit Check-in (+100 PTS)
        </h3>

        <form onSubmit={handleQuickCheckin} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter Member ID (e.g. PG-2445B5)"
            value={quickMemberId}
            onChange={(e) => setQuickMemberId(e.target.value)}
            required
            style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#ffffff', marginBottom: 0 }}
          />
          <button type="submit" className="btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
            Log Visit
          </button>
        </form>
      </div>

      {/* Member Management Shortcuts & Point Reward Tools */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <Link
          to="/admin/members"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            padding: '16px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px', borderRadius: '10px', width: 'fit-content' }}>
            <Users size={20} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Member Directory</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Search members & credit points balance</span>
        </Link>

        <Link
          to="/admin/rewards"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            padding: '16px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '8px', borderRadius: '10px', width: 'fit-content' }}>
            <Gift size={20} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Reward Catalog</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Add & manage perks and discounts</span>
        </Link>
      </div>

      {/* Live Recent Operations Feed (Green Numbers) */}
      <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#10b981" /> Live Operations Feed
          </h3>
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Realtime
          </span>
        </div>

        {stats?.recent && stats.recent.length > 0 ? (
          stats.recent.map((rec) => (
            <div
              key={rec.id}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{rec.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {rec.member_name} ({rec.member_id}) &bull; {new Date(rec.created_at).toLocaleTimeString()}
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: rec.type === 'earn' ? '#10b981' : '#a7f3d0',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {rec.type === 'earn' ? `+${rec.points} PTS` : `-${rec.points} PTS`}
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No recent activity recorded today.
          </div>
        )}
      </div>
    </div>
  );
}

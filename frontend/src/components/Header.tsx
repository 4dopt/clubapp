import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, LogOut, Award } from 'lucide-react';
import { useAuth } from '../auth';
import { resolveCardVisualTier } from './MembershipCard';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || location.pathname === '/login') return null;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (user.role === 'admin') {
    return (
      <header
        style={{
          background: 'rgba(9, 13, 22, 0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#10b981',
              fontSize: '0.7rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Shield size={13} /> Admin Terminal
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user.name}
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.14)',
            border: '1px solid rgba(239, 68, 68, 0.32)',
            color: '#f87171',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title="Sign out of admin session"
        >
          <LogOut size={13} /> Sign Out
        </button>
      </header>
    );
  }

  const pointsBalance = user.points ?? user.points_balance ?? 0;
  const visualTier = resolveCardVisualTier(user);

  return (
    <header className="app-header">
      <Link
        to="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          minWidth: 0,
        }}
      >
        <img
          src="/playgolf-logo.png"
          alt="PlayGolf Northwick Park"
          style={{
            height: '36px',
            width: 'auto',
            maxWidth: '130px',
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
          }}
        />
        <span className="brand-badge">{visualTier === 'Green' ? 'Member' : visualTier}</span>
      </Link>

      <Link
        to="/rewards"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#b45309',
          padding: '5px 11px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 800,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Award size={13} style={{ color: '#d97706' }} />
        <span>{pointsBalance.toLocaleString()} PTS</span>
      </Link>
    </header>
  );
}

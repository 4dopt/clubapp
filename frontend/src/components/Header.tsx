import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Shield,
  Award,
  BarChart3,
  LayoutDashboard,
  QrCode,
  Calendar,
  Gift,
  Users,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../auth';
import { resolveCardVisualTier } from './MembershipCard';
import { NotificationBellButton } from './NotificationCenter';

export function Header() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/login') return null;

  const isOnAdminRoute = user.role === 'admin' && location.pathname.startsWith('/admin');

  if (isOnAdminRoute) {
    const adminNavLinks = [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/scan', label: 'Scan Pass', icon: QrCode },
      { to: '/admin/bookings', label: 'Bookings', icon: Calendar },
      { to: '/admin/rewards', label: 'Vouchers & Perks', icon: Gift },
      { to: '/admin/members', label: 'Members', icon: Users },
      { to: '/admin/analytics', label: 'Reports & Till', icon: BarChart3 },
    ];

    return (
      <header className="app-header-admin">
        <div className="admin-header-inner">
          {/* Brand Logo & Reception Indicator */}
          <div className="admin-header-brand">
            <Link to="/admin" className="admin-brand-link">
              <img
                src="/playgolf-logo.png"
                alt="PlayGolf Northwick Park"
                className="admin-brand-logo-img"
              />
              <div className="admin-brand-info">
                <span className="admin-brand-title">STAFF PORTAL</span>
                <span className="admin-brand-desk">
                  <span className="admin-status-dot" />
                  Reception Desk
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links (>= 900px) */}
          <nav className="admin-desktop-nav-menu">
            {adminNavLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `admin-desktop-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Side: Switch to Member App & Notifications */}
          <div className="admin-header-user-section">
            <Link
              to="/dashboard"
              className="admin-switch-member-btn"
              title="Exit Admin & open the Member App view"
            >
              <Smartphone size={14} />
              <span>Member App</span>
            </Link>

            <NotificationBellButton />
          </div>
        </div>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {user.role === 'admin' && (
          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ecfdf5',
              border: '1.5px solid #047857',
              color: '#047857',
              padding: '5px 11px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 800,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            title="Return to Staff & Admin Desk"
          >
            <Shield size={13} />
            <span>Staff Desk</span>
          </Link>
        )}

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

        <NotificationBellButton />
      </div>
    </header>
  );
}

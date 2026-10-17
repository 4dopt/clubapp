import React from 'react';
import { useNavigate, Link, NavLink, useLocation } from 'react-router-dom';
import {
  Shield,
  LogOut,
  Award,
  BarChart3,
  LayoutDashboard,
  QrCode,
  Calendar,
  Gift,
  Users,
} from 'lucide-react';
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
    const isAnalyticsPage = location.pathname.startsWith('/admin/analytics');
    const adminNavLinks = [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/scan', label: 'Scan Pass', icon: QrCode },
      { to: '/admin/bookings', label: 'Bookings Sheet', icon: Calendar },
      { to: '/admin/rewards', label: 'Rewards & Offers', icon: Gift },
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

          {/* Mobile Quick Action Link (< 900px) */}
          <div className="admin-mobile-header-actions">
            <Link
              to="/admin"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-full)',
                padding: '5px 11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              <Shield size={14} /> Staff
            </Link>

            <Link
              to="/admin/analytics"
              style={{
                background: isAnalyticsPage ? 'rgba(56, 189, 248, 0.24)' : 'rgba(56, 189, 248, 0.12)',
                border: `1px solid ${isAnalyticsPage ? 'rgba(56, 189, 248, 0.5)' : 'rgba(56, 189, 248, 0.28)'}`,
                borderRadius: 'var(--radius-full)',
                padding: '5px 11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
              title="Open Club Reports & Analytics"
            >
              <BarChart3 size={14} /> Reports
            </Link>
          </div>

          {/* User Info & Sign Out */}
          <div className="admin-header-user-section">
            <div className="admin-user-pill">
              <span className="admin-user-name">{user.name || 'Staff User'}</span>
              <span className="admin-user-role">Club Manager</span>
            </div>

            <button
              onClick={handleLogout}
              className="admin-logout-btn"
              title="Sign out of admin session"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
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

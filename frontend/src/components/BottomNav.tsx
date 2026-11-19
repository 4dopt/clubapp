import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Gift, Calendar, User, QrCode, Users, Trophy, LogOut } from 'lucide-react';
import { useAuth } from '../auth';

export function BottomNav() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user || location.pathname === '/login') return null;

  const isOnAdminRoute = user.role === 'admin' && location.pathname.startsWith('/admin');

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isOnAdminRoute) {
    return (
      <nav className="bottom-nav bottom-nav-admin">
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={19} />
          <span>Desk</span>
        </NavLink>

        <NavLink to="/admin/scan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <QrCode size={19} />
          <span>Scan</span>
        </NavLink>

        <NavLink to="/admin/bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={19} />
          <span>Bookings</span>
        </NavLink>

        <NavLink to="/admin/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Gift size={19} />
          <span>Vouchers</span>
        </NavLink>

        <NavLink to="/admin/members" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={19} />
          <span>Members</span>
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="nav-item"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="Sign Out of Staff Portal"
        >
          <LogOut size={19} />
          <span>Sign Out</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} />
        <span>Card</span>
      </NavLink>

      <NavLink to="/journey" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Trophy size={20} />
        <span>Journey</span>
      </NavLink>

      <NavLink to="/booking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Calendar size={20} />
        <span>Booking</span>
      </NavLink>

      <NavLink to="/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Gift size={20} />
        <span>Rewards</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={20} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

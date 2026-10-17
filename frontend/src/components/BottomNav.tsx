import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Gift, Calendar, User, QrCode, Users } from 'lucide-react';
import { useAuth } from '../auth';

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/login') return null;

  if (user.role === 'admin') {
    return (
      <nav className="bottom-nav bottom-nav-admin">
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={19} />
          <span>Home</span>
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
          <span>Rewards</span>
        </NavLink>

        <NavLink to="/admin/members" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={19} />
          <span>Members</span>
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} />
        <span>Card</span>
      </NavLink>

      <NavLink to="/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Gift size={20} />
        <span>Rewards</span>
      </NavLink>

      <NavLink to="/booking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Calendar size={20} />
        <span>Booking</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={20} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

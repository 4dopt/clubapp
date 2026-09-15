import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Gift, Calendar, User, QrCode, Users } from 'lucide-react';
import { useAuth } from '../auth';

export function BottomNav() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'admin') {
    return (
      <nav className="bottom-nav">
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/admin/scan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <QrCode size={20} />
          <span>Scanner</span>
        </NavLink>

        <NavLink to="/admin/members" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Members</span>
        </NavLink>

        <NavLink to="/admin/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Gift size={20} />
          <span>Rewards</span>
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

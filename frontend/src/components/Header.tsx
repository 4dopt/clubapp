import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../auth';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || user.role !== 'admin') return null;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header
      style={{
        background: 'rgba(9, 13, 22, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10b981',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          <Shield size={13} /> Admin Terminal
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
          {user.name}
        </span>
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title="Sign out of admin session"
      >
        <LogOut size={14} /> Sign Out
      </button>
    </header>
  );
}


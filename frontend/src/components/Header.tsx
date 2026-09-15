import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, Download } from 'lucide-react';
import { useAuth } from '../auth';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="app-header" style={{ padding: '12px 16px' }}>
      <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/playgolf-logo.png"
          alt="PlayGolf Northwick Park"
          style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
        />
        {user?.role === 'admin' && <span className="brand-badge">STAFF</span>}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {deferredPrompt && (
          <button
            onClick={handleInstallPwa}
            style={{
              background: 'var(--brand-green-subtle)',
              border: '1px solid rgba(4, 120, 87, 0.3)',
              color: 'var(--brand-green)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Install App
          </button>
        )}

        {user?.role === 'admin' && (
          <Link
            to="/admin"
            style={{
              background: 'rgba(217, 119, 6, 0.1)',
              color: '#d97706',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={13} /> Admin
          </Link>
        )}

        {user ? (
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-grey)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

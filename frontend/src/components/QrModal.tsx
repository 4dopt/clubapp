import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { User } from '../api';

interface Props {
  user: User;
  onClose: () => void;
}

export function QrModal({ user, onClose }: Props) {
  const memberId = user.member_id || 'PG-000000';
  const qrValue =
    user.qr_token && user.qr_token.trim() && user.qr_token.trim() !== 'QR_MEMBER_'
      ? user.qr_token.trim()
      : `QR_MEMBER_${memberId.replace('-', '').toUpperCase()}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <button
          onClick={onClose}
          aria-label="Close QR Modal"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'var(--bg-subtle)',
            border: 'none',
            color: 'var(--slate-dark)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--brand-green-subtle)',
            color: 'var(--brand-green)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 800,
            marginBottom: '10px',
          }}
        >
          <Sparkles size={13} /> Member Digital Pass
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
          {user.name}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600 }}>
          ID: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--brand-green)' }}>{memberId}</span> &bull; {user.tier} Tier
        </p>

        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '18px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '10px',
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--slate-grey)', marginBottom: '12px', fontWeight: 700 }}>
          Token: {qrValue}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: 'var(--brand-green)',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={16} /> Verified Active Membership
        </div>

        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '16px', lineHeight: 1.4 }}>
          Scan at the Driving Range bay scanner or Pro Shop desk to log visits and earn points automatically.
        </p>

        <button onClick={onClose} className="btn-secondary" style={{ height: '44px', fontWeight: 700 }}>
          Done
        </button>
      </div>
    </div>
  );
}

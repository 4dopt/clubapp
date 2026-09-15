import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { User } from '../api';

interface Props {
  user: User;
  onClose: () => void;
}

export function QrModal({ user, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--bg-subtle)',
            border: 'none',
            color: 'var(--slate-dark)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--brand-green-subtle)', color: 'var(--brand-green)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>
          <Sparkles size={14} /> Member Digital Pass
        </div>

        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {user.name}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          ID: {user.member_id} &bull; {user.tier} Tier Member
        </p>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', display: 'inline-block', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '20px' }}>
          <QRCodeSVG value={user.qr_token || user.member_id} size={200} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--brand-green)', fontSize: '0.8rem', fontWeight: 700 }}>
          <ShieldCheck size={16} /> Verified Active Membership
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Scan at the Driving Range bay scanner or Pro Shop desk to log visits and earn points automatically.
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RotateCw, Wifi, ShieldCheck, Sparkles, Copy, Check } from 'lucide-react';
import { User } from '../api';

interface Props {
  user: User;
  onOpenQrModal?: () => void;
}

export function MembershipCard({ user, onOpenQrModal }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTierClass = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'card-tier-gold';
      case 'platinum':
        return 'card-tier-platinum';
      default:
        return 'card-tier-silver';
    }
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = user.member_id || 'PG-000000';
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="membership-card-container">
      <div 
        className={`membership-card ${getTierClass(user.tier)} ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}
      >
        {/* Dynamic Specular Lighting & Holographic Sheen */}
        <div className="card-light-specular" />
        <div className="card-shine" />
        <div className="card-mesh-pattern" />

        {/* FRONT OF CARD */}
        <div className="card-face card-front">
          {/* Header Row: Club Logo & Tier Pill */}
          <div className="card-header">
            <div className="card-brand">
              <div className="brand-emblem">
                <Sparkles size={14} className="emblem-sparkle" />
              </div>
              <div className="brand-text">
                <span className="brand-title">PLAYGOLF</span>
                <span className="brand-subtitle">EXECUTIVE CLUB</span>
              </div>
            </div>
            <div className="tier-pill-wrapper">
              <span className="tier-pill">{user.tier} MEMBER</span>
            </div>
          </div>

          {/* Middle Row: Gold EMV Smart Chip & Contactless RFID Waves */}
          <div className="card-chip-row">
            <div className="card-chip">
              <div className="chip-line horizontal" />
              <div className="chip-line vertical" />
            </div>
            <Wifi size={18} className="rfid-waves" />
          </div>

          {/* Member Details */}
          <div className="card-details">
            <div className="card-member-id-container">
              <span className="card-member-id">{user.member_id || 'PG-000000'}</span>
              <button 
                type="button" 
                className="copy-id-btn" 
                onClick={handleCopyId}
                title="Copy Member ID"
              >
                {copied ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="card-holder-name">{user.name}</div>
          </div>

          {/* Footer Row: Points Balance & Scan Action */}
          <div className="card-footer">
            <div className="points-badge">
              <div className="points-label">Available Balance</div>
              <div className="points-val">
                {(user.points || user.points_balance || 0).toLocaleString()} <span className="points-unit">PTS</span>
              </div>
            </div>

            <button
              type="button"
              className="card-scan-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenQrModal) onOpenQrModal();
                else setFlipped(true);
              }}
            >
              <QrCode size={15} />
              <span>Scan Pass</span>
            </button>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div className="card-face card-back">
          <div className="card-back-header">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Encrypted Digital Pass</span>
          </div>

          <div className="qr-container">
            <div className="qr-frame">
              <QRCodeSVG 
                value={user.qr_token || user.member_id || 'PG-000000'} 
                size={115}
                level="M"
                marginSize={1}
                bgColor="#ffffff"
                fgColor="#090d16"
              />
            </div>
          </div>

          <div className="card-back-footer">
            <div className="instructions">Present at Driving Range & Pro Shop</div>
            <div className="flip-hint">
              <RotateCw size={12} /> Tap card to flip
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


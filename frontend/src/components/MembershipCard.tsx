import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  RotateCw,
  Wifi,
  ShieldCheck,
  Copy,
  Check,
  Award,
  Crown,
  Trophy,
  Shield,
  Flag,
} from 'lucide-react';
import { User } from '../api';

interface Props {
  user: User;
  onOpenQrModal?: () => void;
  onShowQr?: () => void;
}

export type CardVisualTier = 'Green' | 'Silver' | 'Gold' | 'Platinum';

export function resolveCardVisualTier(user: User): CardVisualTier {
  const pts = Number(user.points ?? user.points_balance ?? 0);
  const rawTier = (user.tier || '').toLowerCase();

  if (pts >= 5000 || rawTier === 'platinum') return 'Platinum';
  if (pts >= 1000 || rawTier === 'gold') return 'Gold';
  if (pts > 500) return 'Silver';
  return 'Green';
}

export function MembershipCard({ user, onOpenQrModal, onShowQr }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const visualTier = resolveCardVisualTier(user);

  const getTierClass = (tier: CardVisualTier) => {
    switch (tier) {
      case 'Platinum':
        return 'card-tier-platinum';
      case 'Gold':
        return 'card-tier-gold';
      case 'Silver':
        return 'card-tier-silver';
      default:
        return 'card-tier-green';
    }
  };

  const getTierBadgeText = (tier: CardVisualTier) => {
    switch (tier) {
      case 'Platinum':
        return 'PLATINUM VIP';
      case 'Gold':
        return 'GOLD MEMBER';
      case 'Silver':
        return 'SILVER MEMBER';
      default:
        return 'CLUB MEMBER';
    }
  };

  const renderTierIcon = (tier: CardVisualTier) => {
    switch (tier) {
      case 'Platinum':
        return <Crown size={11} className="tier-pill-icon" />;
      case 'Gold':
        return <Trophy size={11} className="tier-pill-icon" />;
      case 'Silver':
        return <Shield size={11} className="tier-pill-icon" />;
      default:
        return <Flag size={11} className="tier-pill-icon" />;
    }
  };

  const renderTierWatermark = (tier: CardVisualTier) => {
    if (tier === 'Silver') {
      // Silver Card (> 500 pts): Crossed Golf Irons & Shield Crest
      return (
        <svg
          className="card-watermark-crest"
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="70" cy="70" r="58" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 5" />
          <path
            d="M70 24L108 38V68C108 94 90 112 70 120C50 112 32 94 32 68V38L70 24Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M46 98L94 42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M94 42C99 38 105 41 102 47L95 54" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M94 98L46 42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M46 42C41 38 35 41 38 47L45 54" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="70" cy="96" r="5" fill="currentColor" />
        </svg>
      );
    }

    if (tier === 'Gold') {
      // Gold Card (>= 1000 pts): Championship Trophy & Laurel Wreath
      return (
        <svg
          className="card-watermark-crest"
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="70" cy="70" r="60" stroke="currentColor" strokeWidth="1.4" strokeDasharray="6 4" />
          <circle cx="70" cy="70" r="48" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M36 90C26 74 30 48 48 34M104 90C114 74 110 48 92 34"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M52 40H88V60C88 72 80 80 70 80C60 80 52 72 52 60V40Z"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path
            d="M52 46H42C42 56 46 62 53 63M88 46H98C98 56 94 62 87 63"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M70 80V96M56 96H84M50 103H90" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    }

    if (tier === 'Platinum') {
      // Platinum Card (>= 5000 pts): Imperial Crown & Diamond Compass
      return (
        <svg
          className="card-watermark-crest"
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="70" cy="70" r="60" stroke="currentColor" strokeWidth="1.4" />
          <rect
            x="34"
            y="34"
            width="72"
            height="72"
            rx="6"
            transform="rotate(45 70 70)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M48 82L44 56L58 66L70 48L82 66L96 56L92 82H48Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M50 89H90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="70" cy="42" r="3.5" fill="currentColor" />
        </svg>
      );
    }

    // Green Card (<= 500 pts): Classic Fairway Flagstick & Putting Green
    return (
      <svg
        className="card-watermark-crest"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="60" cy="60" r="42" stroke="currentColor" strokeWidth="1" />
        <path
          d="M62 24V82M62 24L88 36L62 48"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx="62" cy="86" rx="22" ry="7" stroke="currentColor" strokeWidth="2" />
        <circle cx="52" cy="83" r="3.5" fill="currentColor" />
      </svg>
    );
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = user.member_id || 'PG-000000';
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateTilt = (clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const tiltX = (0.5 - y) * 24;
    const tiltY = (x - 0.5) * 28;
    const shadowX = (0.5 - x) * 26;
    const shadowY = (0.5 - y) * 20 + 24;

    el.style.setProperty('--rx', `${tiltX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${tiltY.toFixed(2)}deg`);
    el.style.setProperty('--shadow-x', `${shadowX.toFixed(1)}px`);
    el.style.setProperty('--shadow-y', `${shadowY.toFixed(1)}px`);
  };

  const resetTilt = () => {
    const el = cardRef.current;
    setIsInteracting(false);
    if (!el) return;
    el.style.setProperty('--rx', '4deg');
    el.style.setProperty('--ry', '-5deg');
    el.style.setProperty('--shadow-x', '8px');
    el.style.setProperty('--shadow-y', '24px');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteracting) setIsInteracting(true);
    updateTilt(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      if (!isInteracting) setIsInteracting(true);
      updateTilt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const openQrAction = onOpenQrModal || onShowQr;
  const pointsBalance = (user.points ?? user.points_balance ?? 0).toLocaleString();
  const memberId = user.member_id || 'PG-000000';

  return (
    <div
      className="membership-card-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      onTouchMove={handleTouchMove}
      onTouchEnd={resetTilt}
    >
      <div
        ref={cardRef}
        className={[
          'membership-card',
          getTierClass(visualTier),
          flipped ? 'is-flipped' : '',
          isInteracting ? 'is-interacting' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => setFlipped(!flipped)}
      >
        {/* 3D Physical Card Edge Extrusion Layer */}
        <div className="card-edge-3d" aria-hidden="true" />

        {/* FRONT OF CARD */}
        <div className="card-face card-front">
          {/* Deep Metallic Surface & Subtle Etched Tier Crest */}
          <div className="card-surface-effects" aria-hidden="true">
            <div className="card-topo-pattern" />
            <div className="card-mesh-pattern" />
            {renderTierWatermark(visualTier)}
            <div className="card-rim-bevel" />
          </div>

          {/* Header Row: Original PlayGolf Logo & 3D Tier Badge */}
          <div className="card-header">
            <div className="card-brand">
              <div className="card-logo-badge">
                <img
                  src="/playgolf-logo.png"
                  alt="PlayGolf Northwick Park"
                  className="card-brand-logo"
                />
              </div>
            </div>

            <div className="tier-pill-wrapper">
              <span className="tier-pill">
                {renderTierIcon(visualTier)}
                {getTierBadgeText(visualTier)}
              </span>
            </div>
          </div>

          {/* Middle Row: 3D Sculpted EMV Chip, Contactless NFC & Flip Hint */}
          <div className="card-chip-row">
            <div className="card-chip-left">
              <div className="card-chip">
                <div className="chip-pad chip-pad-tl" />
                <div className="chip-pad chip-pad-tr" />
                <div className="chip-pad chip-pad-bl" />
                <div className="chip-pad chip-pad-br" />
                <div className="chip-core" />
              </div>
              <Wifi size={18} className="rfid-waves" />
            </div>

            <div className="card-flip-pill">
              <RotateCw size={11} />
              <span>3D Flip</span>
            </div>
          </div>

          {/* Member Details: Floating 3D Embossed ID & Holder Name */}
          <div className="card-details">
            <div className="card-member-id-container">
              <span className="card-member-id">{memberId}</span>
              <button
                type="button"
                className="copy-id-btn"
                onClick={handleCopyId}
                title="Copy Member ID"
                aria-label="Copy Member ID"
              >
                {copied ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="card-holder-row">
              <div className="card-holder-name">{user.name}</div>
            </div>
          </div>

          {/* Footer Row: Floating 3D Points Balance & Tactile Scan Action */}
          <div className="card-footer">
            <div className="points-badge">
              <div className="points-label">
                <Award size={11} className="points-award-icon" /> Available Points
              </div>
              <div className="points-val">
                {pointsBalance} <span className="points-unit">PTS</span>
              </div>
            </div>

            <button
              type="button"
              className="card-scan-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (openQrAction) openQrAction();
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
          <div className="card-surface-effects" aria-hidden="true">
            <div className="card-magnetic-stripe" />
            <div className="card-mesh-pattern" />
            <div className="card-rim-bevel" />
          </div>

          <div className="card-back-header">
            <ShieldCheck size={14} className="back-shield-icon" />
            <span>ENCRYPTED DIGITAL PASS</span>
            <span className="card-back-id-tag">{memberId}</span>
          </div>

          <div className="qr-container">
            <div className="qr-frame">
              <QRCodeSVG
                value={user.qr_token || memberId}
                size={98}
                level="M"
                marginSize={1}
                bgColor="#ffffff"
                fgColor="#090d16"
              />
            </div>
          </div>

          <div className="card-back-footer">
            <div className="instructions">Present at Driving Range &amp; Pro Shop</div>
            <div className="flip-hint">
              <RotateCw size={11} /> Tap anywhere to flip back
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

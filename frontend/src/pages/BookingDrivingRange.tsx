import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  ExternalLink,
  ShieldCheck,
  Zap,
  Crosshair,
  Gauge,
  Compass,
  Sparkles,
  Clock,
  Users,
  Layers,
} from 'lucide-react';

const BALL_PACKAGES = [
  { id: '50-balls', balls: 50, label: 'Warm-Up', price: '£7.50', popular: false },
  { id: '100-balls', balls: 100, label: 'Pro Practice', price: '£11.00', popular: true },
  { id: '150-balls', balls: 150, label: 'Tour Session', price: '£14.50', popular: false },
];

const BAY_ZONES = [
  { id: 'ground-vip', name: 'Ground Floor Heated Bays', tag: 'Heated & Covered', specs: 'TrackMan 4 Dual Radar + 27" Touchscreen' },
  { id: 'upper-deck', name: 'Upper Deck Panoramic Bays', tag: 'Elevated View', specs: 'Full Flight Ball Tracking & Virtual Courses' },
];

export function BookingDrivingRange() {
  const navigate = useNavigate();
  const [selectedPkg, setSelectedPkg] = useState('100-balls');
  const [selectedZone, setSelectedZone] = useState('ground-vip');
  const [players, setPlayers] = useState(2);

  // Emerald Green Subtle Theme Accents
  const accent = '#047857';
  const accentLight = '#059669';
  const accentSoft = '#ecfdf5';
  const accentBorder = '#a7f3d0';

  const externalUrl = 'https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays';

  return (
    <div style={{ padding: '16px 16px 32px 16px', width: '100%' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => navigate('/booking')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '7px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={15} /> Back to Booking
        </button>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: accentSoft,
            border: `1px solid ${accentBorder}`,
            color: accent,
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Crosshair size={12} /> TrackMan 4 Live
        </span>
      </div>

      {/* Subtle Emerald Tinted Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: `1px solid ${accentBorder}`,
          borderRadius: '20px',
          padding: '18px 16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '13px',
              background: '#ffffff',
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(4, 120, 87, 0.12)',
              flexShrink: 0,
            }}
          >
            <Target size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              TOUR LAUNCH MONITOR BAYS
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '1px 0 0 0', lineHeight: 1.2 }}>
              Driving Range
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
          56 floodlit bays powered by TrackMan 4 radar telemetry. Track ball speed, launch angle, or play virtual tour courses.
        </p>

        {/* Clean Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <Gauge size={14} style={{ color: accent, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>TrackMan 4</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Dual Radar</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <Compass size={14} style={{ color: accent, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>56 Bays</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Heated & Lit</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <Zap size={14} style={{ color: accent, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>Up to 4</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Players / Bay</div>
          </div>
        </div>
      </div>

      {/* Step 1: Range Deck Preference */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Layers size={16} color={accent} /> 1. Range Deck Preference
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {BAY_ZONES.map((z) => {
            const active = selectedZone === z.id;
            return (
              <div
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                style={{
                  background: active ? accentSoft : '#ffffff',
                  border: active ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>{z.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{z.specs}</div>
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: active ? accent : 'var(--bg-subtle)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {z.tag}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Ball Bucket & Players */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Sparkles size={16} color={accent} /> 2. Range Ball Bucket & Bay Size
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {BALL_PACKAGES.map((pkg) => {
            const active = selectedPkg === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                style={{
                  background: active ? accentSoft : '#ffffff',
                  border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {pkg.popular && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: accent,
                      color: '#ffffff',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    POPULAR
                  </span>
                )}
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pkg.balls} Balls</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '2px 0 4px 0' }}>{pkg.label}</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: accent }}>{pkg.price}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} color={accent} /> Players in Bay:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPlayers(num)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: players === num ? `2px solid ${accent}` : '1px solid var(--border-color)',
                  background: players === num ? accentSoft : '#ffffff',
                  color: players === num ? accent : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Partner Booking Portal Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '20px 16px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '0.74rem',
            color: 'var(--slate-dark)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          <ShieldCheck size={15} style={{ color: accent }} /> Official Partner: YourGolfBooking
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
          Live bay numbers and TrackMan session timers are reserved directly on our partner portal.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} color={accent} /> Open Daily 08:00 – 22:00
          </span>
          <span>•</span>
          <span style={{ color: accent, fontWeight: 700 }}>{players} Player{players > 1 ? 's' : ''} Selected</span>
        </div>

        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            height: '48px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 800,
            background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 100%)`,
            borderRadius: '14px',
          }}
        >
          Book Bay on YourGolfBooking <ExternalLink size={17} />
        </a>
      </div>
    </div>
  );
}

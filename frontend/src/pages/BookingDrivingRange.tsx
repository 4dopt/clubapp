import React from 'react';
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
  Clock,
} from 'lucide-react';

export function BookingDrivingRange() {
  const navigate = useNavigate();

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
          56 shaded and floodlit bays powered by TrackMan 4 radar telemetry. Track ball speed, launch angle, or play virtual tour courses.
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
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>In Shade & Lit</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <Zap size={14} style={{ color: accent, marginBottom: '2px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>Up to 6</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Players / Bay</div>
          </div>
        </div>
      </div>

      {/* Partner Booking Portal Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '22px 18px',
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

        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Driving Range Bay Reservations
        </h3>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
          All TrackMan driving range bays at PlayGolf Northwick Park are booked directly via our official YourGolfBooking partner portal for live bay availability.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            marginBottom: '18px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} color={accent} /> Open Daily 08:00 – 22:00
          </span>
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

import React, { useState, useEffect } from 'react';
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
  CircleDot,
  Users,
} from 'lucide-react';

const BAY_PRICING_SCHEDULES = [
  {
    id: 'weekday-day',
    days: 'Monday – Friday',
    period: 'Morning & Daytime',
    timeRange: '9:00 AM – 5:00 PM',
    downstairsPrice: '£10',
    upstairsPrice: '£12.50',
  },
  {
    id: 'weekday-evening',
    days: 'Monday – Friday',
    period: 'Evening Sessions',
    timeRange: '5:00 PM – 9:00 PM',
    downstairsPrice: '£12.50',
    upstairsPrice: '£15',
  },
  {
    id: 'weekend-all-day',
    days: 'Saturday & Sunday',
    period: 'Weekend All Day',
    timeRange: 'All Day (9:00 AM – 9:00 PM)',
    downstairsPrice: '£15',
    upstairsPrice: '£17.50',
  },
];

function getActivePricingScheduleId(now: Date): string {
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    return 'weekend-all-day';
  }
  const hour = now.getHours();
  // Monday–Friday: 5:00 PM (17:00) onwards is evening rate; before 5:00 PM is morning/daytime rate
  if (hour >= 17) {
    return 'weekday-evening';
  }
  return 'weekday-day';
}

export function BookingDrivingRange() {
  const navigate = useNavigate();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeScheduleId = getActivePricingScheduleId(now);

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

      {/* Pricing & Bay Rates Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '18px 16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CircleDot size={18} color={accent} />
            <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Driving Range Bay Pricing
            </h2>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '999px',
              background: accentSoft,
              color: accent,
              border: `1px solid ${accentBorder}`,
            }}
          >
            Open 7 Days a Week
          </span>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
          Pricing varies by day, time of day, and bay level (Downstairs vs. Upstairs). TrackMan 4 is included in every bay.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {BAY_PRICING_SCHEDULES.map((slot) => {
            const isActiveNow = slot.id === activeScheduleId;
            return (
              <div
                key={slot.id}
                style={{
                  border: isActiveNow ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                  background: isActiveNow ? accentSoft : '#ffffff',
                  borderRadius: '16px',
                  padding: '13px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header row: Day & Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {slot.days}
                      </span>
                      <span
                        style={{
                          background: isActiveNow ? accent : 'var(--bg-subtle)',
                          color: isActiveNow ? '#ffffff' : accent,
                          border: isActiveNow ? 'none' : `1px solid ${accentBorder}`,
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {slot.period}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        marginTop: '3px',
                      }}
                    >
                      <Clock size={12} color={accent} /> {slot.timeRange}
                    </div>
                  </div>

                  {isActiveNow && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ffffff',
                        color: accent,
                        border: `1px solid ${accent}`,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: accent,
                          display: 'inline-block',
                        }}
                      />
                      Active Now
                    </span>
                  )}
                </div>

                {/* Two-column Bay Level Prices */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${isActiveNow ? accentBorder : 'var(--border-color)'}`,
                      borderRadius: '11px',
                      padding: '9px 11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Downstairs Bays
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Ground Level
                      </div>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: accent }}>
                      {slot.downstairsPrice}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${isActiveNow ? accentBorder : 'var(--border-color)'}`,
                      borderRadius: '11px',
                      padding: '9px 11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Upstairs Bays
                      </div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Upper Deck
                      </div>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: accent }}>
                      {slot.upstairsPrice}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Highlights */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: accent, fontWeight: 900 }}>✓</span>
            <span>TrackMan 4 radar screen & shot data in every bay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: accent, fontWeight: 900 }}>✓</span>
            <span>Premium Srixon range practice balls</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} style={{ color: accent, flexShrink: 0 }} />
            <span>Up to 6 players per bay with covered seating</span>
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
          Reserve Your Bay Online
        </h3>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
          All TrackMan driving range bays at PlayGolf Northwick Park are booked directly through our official partner portal for real-time live bay availability.
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
            <Clock size={13} color={accent} /> Open 7 Days a Week • 9:00 AM – 9:00 PM
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

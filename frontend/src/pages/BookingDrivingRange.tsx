import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  ExternalLink,
  Zap,
  Crosshair,
  Gauge,
  Compass,
  Clock,
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  QrCode,
  Award,
} from 'lucide-react';
import { useAuth } from '../auth';
import { BookingItem, createBooking } from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const RANGE_OPTIONS = [
  { id: '60-balls', label: '60 Balls + 60 Min Bay', price: 11.5, duration: '60 mins', balls: '60 Srixon Range Balls' },
  { id: '100-balls', label: '100 Balls + 60 Min Bay', price: 14.0, duration: '60 mins', balls: '100 Srixon Range Balls' },
  { id: '150-balls', label: '150 Balls + 90 Min Bay', price: 18.5, duration: '90 mins', balls: '150 Srixon Range Balls' },
];

const BAY_ZONES = [
  'TrackMan Ground Floor Bay',
  'TrackMan Upper Deck Bay',
  'VIP Covered Group Bay',
];

const QUICK_TIMES = ['09:00', '10:30', '12:00', '14:00', '16:00', '17:30', '19:00', '20:30'];

export function BookingDrivingRange() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Emerald Green Subtle Theme Accents
  const accent = '#047857';
  const accentLight = '#059669';
  const accentSoft = '#ecfdf5';
  const accentBorder = '#a7f3d0';

  const externalUrl = 'https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays';

  const [selectedPkgId, setSelectedPkgId] = useState<string>('100-balls');
  const [selectedZone, setSelectedZone] = useState<string>(BAY_ZONES[0]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('16:00');
  const [players, setPlayers] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  const activePkg = RANGE_OPTIONS.find((r) => r.id === selectedPkgId) || RANGE_OPTIONS[1];

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedNotes = [
      `Package: ${activePkg.balls} (${activePkg.duration})`,
      `Zone: ${selectedZone}`,
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    const newBk = createBooking({
      user_id: user?.id || 'usr_member_1',
      user_name: user?.name || 'Alex Morgan',
      user_member_id: user?.member_id || 'PG-2445B5',
      member_tier: user?.tier || 'Silver',
      activity_id: 'driving-range',
      activity_name: 'TrackMan 4 Driving Range Bay',
      date: selectedDate,
      time: selectedTime,
      duration: activePkg.duration,
      party_size: players,
      bay_assignment: selectedZone,
      payment_status: 'paid',
      price: `£${activePkg.price.toFixed(2)}`,
      notes: combinedNotes,
    });

    setCreatedBooking(newBk);
  };

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
          56 shaded and floodlit bays powered by TrackMan 4 radar telemetry. Reserve your bay below for instant reception check-in.
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

      {createdBooking ? (
        <div
          style={{
            background: '#ffffff',
            border: `1.5px solid ${accentBorder}`,
            borderRadius: '20px',
            padding: '24px 18px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: accentSoft,
              color: accent,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              border: `1px solid ${accentBorder}`,
            }}
          >
            <CheckCircle2 size={30} />
          </div>

          <h2 style={{ fontSize: '1.22rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Driving Range Bay Reserved!
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-grey)', fontWeight: 600, marginBottom: '16px' }}>
            Booking Ref:{' '}
            <span style={{ fontFamily: 'monospace', color: accent, fontWeight: 800 }}>
              {createdBooking.booking_code}
            </span>
          </p>

          <div
            style={{
              background: accentSoft,
              border: `1px solid ${accentBorder}`,
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'left',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Bay Zone:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.bay_assignment}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time:</span>
              <span style={{ color: accent, fontWeight: 800 }}>
                {createdBooking.date} at {createdBooking.time}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Package:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                {activePkg.label} ({createdBooking.price})
              </span>
            </div>
          </div>

          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '10px 12px',
              borderRadius: '12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '16px',
            }}
          >
            <Award size={16} /> +100 Loyalty Points earned on reception check-in!
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setPassModalBooking(createdBooking)}
              className="btn-primary"
              style={{
                height: '48px',
                background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 100%)`,
                borderRadius: '14px',
              }}
            >
              <QrCode size={17} /> Show Reception Pass
            </button>
            <button
              type="button"
              onClick={() => navigate('/booking?tab=my-bookings')}
              className="btn-secondary"
              style={{ height: '44px', borderRadius: '14px' }}
            >
              View All My Bookings
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Ball & Bay Package */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={16} color={accent} /> 1. Select Range Ball & Bay Package
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {RANGE_OPTIONS.map((pkg) => {
                const active = selectedPkgId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkgId(pkg.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pkg.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{pkg.balls} • TrackMan 4</div>
                    </div>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: accent }}>£{pkg.price.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Preferred Bay Zone */}
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Preferred Bay Area:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {BAY_ZONES.map((z) => {
                const active = selectedZone === z;
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setSelectedZone(z)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '11px',
                      border: active ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      color: active ? accent : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {z}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} color={accent} /> Players in Bay:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 4, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlayers(n)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: players === n ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: players === n ? accentSoft : '#ffffff',
                      color: players === n ? accent : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Date & Time */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={15} color={accent} /> 2. Select Date
              </label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color={accent} /> 3. Select Time Slot (08:00 – 22:00)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {QUICK_TIMES.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      style={{
                        minHeight: '40px',
                        borderRadius: '10px',
                        border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                        background: active ? accentSoft : '#ffffff',
                        color: active ? accent : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Left-handed bay preferred"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                height: '48px',
                background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 100%)`,
                borderRadius: '14px',
                fontSize: '0.92rem',
                fontWeight: 800,
                marginBottom: '10px',
              }}
            >
              Confirm Range Bay Booking (£{activePkg.price.toFixed(2)})
            </button>

            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                height: '42px',
                textDecoration: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '12px',
              }}
            >
              Or book via YourGolfBooking Partner Portal <ExternalLink size={14} />
            </a>
          </div>
        </form>
      )}

      {passModalBooking && (
        <BookingPassModal booking={passModalBooking} onClose={() => setPassModalBooking(null)} />
      )}
    </div>
  );
}

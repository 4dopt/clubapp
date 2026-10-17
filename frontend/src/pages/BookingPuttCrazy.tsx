import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle2,
  QrCode,
  Award,
  RotateCcw,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../auth';
import { BookingItem, createBooking } from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const PACKAGES = [
  {
    id: 'kid',
    label: 'Kids Pass',
    pax: 1,
    price: 6.95,
    badge: 'Junior Rate',
    sub: '1 Child • 2 Course Laps',
  },
  {
    id: 'adult',
    label: 'Adult Pass',
    pax: 1,
    price: 9.95,
    badge: 'Standard',
    sub: '1 Adult • 2 Course Laps',
  },
  {
    id: 'family',
    label: 'Family 4-Pack',
    pax: 4,
    price: 27.95,
    badge: 'Save £5.85+',
    sub: '4 Players (Indiv. £33.80+)',
  },
  {
    id: 'party',
    label: 'Group of 6',
    pax: 6,
    price: 44.95,
    badge: 'Save up to £14.75',
    sub: '6 Players • Best Group Deal',
  },
];

const QUICK_TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '21:00'];

export function BookingPuttCrazy() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Warm Amber Subtle Theme Accents
  const accent = '#d97706';
  const accentDark = '#b45309';
  const accentSoft = '#fffbeb';
  const accentBorder = '#fde68a';

  const [selectedPkgId, setSelectedPkgId] = useState<string>('family');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('14:30');
  const [timeError, setTimeError] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  const activePkg = PACKAGES.find((p) => p.id === selectedPkgId) || PACKAGES[2];

  const handleTimeChange = (val: string) => {
    setSelectedTime(val);
    if (val < '10:00' || val > '21:00') {
      setTimeError('Please select a time between 10:00 AM and 09:00 PM.');
    } else {
      setTimeError('');
    }
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTime < '10:00' || selectedTime > '21:00') {
      setTimeError('Please select a time between 10:00 AM and 09:00 PM.');
      return;
    }

    const combinedNotes = [
      `${activePkg.label} (2 Course Laps Included)`,
      'Includes Scorecard, Pencils & Age-Colored Putters',
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    const newBk = createBooking({
      user_id: user?.id || 'usr_member_1',
      user_name: user?.name || 'Alex Morgan',
      user_member_id: user?.member_id || 'PG-2445B5',
      member_tier: user?.tier || 'Silver',
      activity_id: 'putt-crazy',
      activity_name: 'Putt Crazy Adventure Minigolf',
      date: selectedDate,
      time: selectedTime,
      duration: '2 Course Laps',
      party_size: activePkg.pax,
      bay_assignment: 'Putt Crazy Course',
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
          <RotateCcw size={12} /> Play 2x Around!
        </span>
      </div>

      {/* Subtle Warm Amber Tinted Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
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
              boxShadow: '0 3px 10px rgba(217, 119, 6, 0.12)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ADVENTURE CRAZY GOLF
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '1px 0 0 0', lineHeight: 1.2 }}>
              Putt Crazy Minigolf
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
          Every ticket includes going around the course <strong>two times</strong>! Collect your official scorecard, pencils, and colored putters sized for every age group at reception.
        </p>

        {/* Course Perks Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Course Play</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: accent, marginTop: '2px' }}>2 Full Laps</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Putters</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>Color-Sized</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Included</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>Card & Pencil</div>
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
            Putt Crazy Reserved!
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-grey)', fontWeight: 600, marginBottom: '16px' }}>
            Booking Ref: <span style={{ fontFamily: 'monospace', color: accent, fontWeight: 800 }}>{createdBooking.booking_code}</span>
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
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time:</span>
              <span style={{ color: accent, fontWeight: 800 }}>{createdBooking.date} at {createdBooking.time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pass & Total:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{activePkg.label} ({createdBooking.price})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Included:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>2 Laps • Scorecard, Pencils & Colored Putters</span>
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
                background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
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
          {/* 1. Group & Individual Package Selector */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color={accent} /> 1. Select Player Pass
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: accent }}>
                Kids £6.95 • Adults £9.95
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PACKAGES.map((pkg) => {
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
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: active ? accent : 'var(--bg-subtle)',
                          color: active ? '#ffffff' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pkg.badge}
                      </span>
                      <span style={{ fontSize: '0.94rem', fontWeight: 800, color: accent }}>
                        £{pkg.price.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pkg.label}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{pkg.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Included Equipment & 2 Laps Info Banner */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: accentSoft,
                border: `1px solid ${accentBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
              }}
            >
              <ClipboardList size={16} color={accent} style={{ flexShrink: 0 }} />
              <span>
                Includes <strong>2 rounds around the course</strong>, official scorecard, pencils & age-colored putters for kids and adults!
              </span>
            </div>
          </div>

          {/* 2. Date, 3. Custom Time (10 AM to 9 PM) & Notes */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                  <Clock size={15} color={accent} /> 3. Select Custom Time
                </label>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accent }}>
                  Available: 10:00 AM – 9:00 PM
                </span>
              </div>

              <input
                type="time"
                className="form-input"
                min="10:00"
                max="21:00"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                required
                style={{
                  borderColor: timeError ? '#dc2626' : 'var(--border-color)',
                  fontWeight: 700,
                  marginBottom: '10px',
                }}
              />

              {timeError && (
                <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700, marginBottom: '10px' }}>
                  {timeError}
                </div>
              )}

              {/* Quick Preset Chips between 10 AM and 9 PM */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {QUICK_TIMES.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => handleTimeChange(t)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        border: active ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                        background: active ? accentSoft : 'var(--bg-subtle)',
                        color: active ? accent : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
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
                placeholder="e.g. Ages for colored putters, birthday group"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                height: '48px',
                background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
                borderRadius: '14px',
                fontSize: '0.92rem',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
              }}
            >
              Confirm Putt Crazy Booking (£{activePkg.price.toFixed(2)})
            </button>
          </div>
        </form>
      )}

      {passModalBooking && (
        <BookingPassModal booking={passModalBooking} onClose={() => setPassModalBooking(null)} />
      )}
    </div>
  );
}

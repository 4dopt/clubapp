import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Flag,
  Calendar as CalendarIcon,
  Clock,
  Award,
  CheckCircle2,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth';
import { BookingItem, createBooking } from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const ROUND_OPTIONS = [
  {
    id: '9-holes',
    label: '9 Holes',
    sub: 'Par 34 • ~2 Hours',
    weekdayPrice: 12.5,
    weekendPrice: 14,
    duration: '120 mins',
  },
  {
    id: '18-holes',
    label: '18 Holes',
    sub: 'Par 68 • ~4 Hours',
    weekdayPrice: 17.5,
    weekendPrice: 18,
    duration: '240 mins',
  },
];

const ADD_ONS = [
  { id: 'buggy', label: 'Electric Buggy Hire', price: 25 },
  { id: 'clubs', label: 'Club Hire', price: 10 },
  { id: 'balls-3', label: '3 Lake Balls', price: 5 },
  { id: 'balls-6', label: '6 Lake Balls', price: 10 },
];

const QUICK_TIMES = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'];

function formatGBP(amount: number): string {
  return Number.isInteger(amount) ? `£${amount}` : `£${amount.toFixed(2)}`;
}

export function BookingNineHoles() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Sky Blue Subtle Theme Accents
  const accent = '#0284c7';
  const accentDark = '#0369a1';
  const accentSoft = '#f0f9ff';
  const accentBorder = '#bae6fd';

  const [selectedRoundId, setSelectedRoundId] = useState<string>('9-holes');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [timeError, setTimeError] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  // Determine if selectedDate is Weekend (Saturday = 6, Sunday = 0) or Weekday (Mon–Fri)
  const dayOfWeek = selectedDate ? new Date(`${selectedDate}T12:00:00`).getDay() : 1;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const activeRound = ROUND_OPTIONS.find((r) => r.id === selectedRoundId) || ROUND_OPTIONS[0];
  const activeRoundPrice = isWeekend ? activeRound.weekendPrice : activeRound.weekdayPrice;

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const addOnsTotal = selectedAddOns.reduce((acc, id) => {
    const item = ADD_ONS.find((a) => a.id === id);
    return acc + (item ? item.price : 0);
  }, 0);
  const totalPrice = activeRoundPrice + addOnsTotal;

  const handleTimeChange = (val: string) => {
    setSelectedTime(val);
    if (val < '09:00' || val > '18:00') {
      setTimeError('Please select a tee time between 09:00 AM and 06:00 PM.');
    } else {
      setTimeError('');
    }
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTime < '09:00' || selectedTime > '18:00') {
      setTimeError('Please select a tee time between 09:00 AM and 06:00 PM.');
      return;
    }

    const addOnLabels = selectedAddOns
      .map((id) => ADD_ONS.find((a) => a.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const combinedNotes = [
      `Round: ${activeRound.label} (${isWeekend ? 'Weekend' : 'Weekday'} Rate)`,
      addOnLabels ? `Extras: ${addOnLabels}` : '',
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    const newBk = createBooking({
      user_id: user?.id || 'usr_member_1',
      user_name: user?.name || 'Alex Morgan',
      user_member_id: user?.member_id || 'PG-2445B5',
      member_tier: user?.tier || 'Silver',
      activity_id: 'nine-holes',
      activity_name: `${activeRound.label} Championship Course`,
      date: selectedDate,
      time: selectedTime,
      duration: activeRound.duration,
      party_size: 1,
      bay_assignment: 'Tee 1 (Championship)',
      payment_status: 'paid',
      price: `£${totalPrice.toFixed(2)}`,
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
          <Flag size={12} /> {activeRound.label} Course
        </span>
      </div>

      {/* Subtle Sky-Blue Tinted Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
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
              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.12)',
              flexShrink: 0,
            }}
          >
            <Flag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CHAMPIONSHIP EXECUTIVE ROUND
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '1px 0 0 0', lineHeight: 1.2 }}>
              9 Holes Course
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
          Play our signature parkland course featuring USGA-spec greens, sculpted bunkers, and water hazards. Choose between a 9-hole or full 18-hole round.
        </p>

        {/* Scorecard Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mon – Fri</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: accent, marginTop: '2px' }}>£12.50 / £17.50</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sat – Sun</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>£14 / £18</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tee Times</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>9AM – 6PM</div>
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
            Tee Time Reserved!
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
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Round Option:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                {activeRound.label} ({isWeekend ? 'Weekend' : 'Weekday'})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time:</span>
              <span style={{ color: accent, fontWeight: 800 }}>{createdBooking.date} at {createdBooking.time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Fee:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.price}</span>
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
          {/* 1. 9 Holes vs 18 Holes */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flag size={16} color={accent} /> 1. Select Course Option
              </span>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: accentSoft,
                  color: accent,
                  border: `1px solid ${accentBorder}`,
                }}
              >
                {isWeekend ? 'Weekend Rate (Sat–Sun)' : 'Weekday Rate (Mon–Fri)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {ROUND_OPTIONS.map((opt, idx) => {
                const active = selectedRoundId === opt.id;
                const displayPrice = isWeekend ? opt.weekendPrice : opt.weekdayPrice;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRoundId(opt.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      color: active ? accent : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {idx + 1}. {opt.label}
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: accent }}>
                        {formatGBP(displayPrice)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Weekday {formatGBP(opt.weekdayPrice)} • Weekend {formatGBP(opt.weekendPrice)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date & 3. Custom Tee Time (9 AM to 6 PM) */}
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                  <Clock size={15} color={accent} /> 3. Select Custom Time
                </label>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accent }}>
                  Available: 9:00 AM – 6:00 PM
                </span>
              </div>

              <input
                type="time"
                className="form-input"
                min="09:00"
                max="18:00"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                required
                style={{
                  borderColor: timeError ? '#dc2626' : `var(--border-color)`,
                  fontWeight: 700,
                  marginBottom: '10px',
                }}
              />

              {timeError && (
                <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700, marginBottom: '10px' }}>
                  {timeError}
                </div>
              )}

              {/* Quick Preset Chips between 9 AM and 6 PM */}
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
          </div>

          {/* 4. Equipment Hire & Lake Balls */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Sparkles size={15} color={accent} /> 4. Equipment Hire & Lake Balls (Optional)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {ADD_ONS.map((addon) => {
                const checked = selectedAddOns.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddOn(addon.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: checked ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                      background: checked ? accentSoft : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{addon.label}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: checked ? accent : 'var(--text-secondary)' }}>
                      +£{addon.price} {checked ? '✓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Left-handed rental set needed"
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
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
              }}
            >
              Confirm {activeRound.label} Booking (£{totalPrice.toFixed(2)})
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

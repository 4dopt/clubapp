import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Flag,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Award,
  CheckCircle2,
  QrCode,
  Compass,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth';
import { BookingItem, createBooking } from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const TEE_BOXES = [
  { id: 'Tee 1 (Championship)', name: 'Championship Blue Tees', par: 'Par 34 • 2,680 Yds', desc: 'Signature water hazards & tour-spec greens' },
  { id: 'Tee 1 (Executive)', name: 'Executive White Tees', par: 'Par 34 • 2,340 Yds', desc: 'Ideal distance for mid-handicap flights' },
  { id: 'Tee 10 (Back Nine)', name: 'Twilight / Academy Loop', par: 'Par 32 • 2,050 Yds', desc: 'Fast-paced 90-minute scoring loop' },
];

const ADD_ONS = [
  { id: 'buggy', label: 'Electric Golf Buggy', price: 18 },
  { id: 'trolley', label: '3-Wheel Push Trolley', price: 6 },
  { id: 'clubs', label: 'TaylorMade Club Hire', price: 15 },
];

const TEE_TIMES = ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'];

export function BookingNineHoles() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Sky Blue Subtle Theme Accents
  const accent = '#0284c7';
  const accentDark = '#0369a1';
  const accentSoft = '#f0f9ff';
  const accentBorder = '#bae6fd';

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [selectedTee, setSelectedTee] = useState<string>(TEE_BOXES[0].id);
  const [players, setPlayers] = useState<number>(2);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const baseGreenFee = 28;
  const addOnsTotal = selectedAddOns.reduce((acc, id) => {
    const item = ADD_ONS.find((a) => a.id === id);
    return acc + (item ? item.price : 0);
  }, 0);
  const totalPrice = players * baseGreenFee + addOnsTotal;

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addOnLabels = selectedAddOns
      .map((id) => ADD_ONS.find((a) => a.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const combinedNotes = [
      `${players}-Ball Flight`,
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
      activity_name: '9 Holes Championship Course',
      date: selectedDate,
      time: selectedTime,
      duration: '120 mins',
      party_size: players,
      bay_assignment: selectedTee,
      payment_status: 'paid',
      price: `£${totalPrice}.00`,
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
          <Flag size={12} /> Par 34 Course
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
          Play our signature 9-hole parkland course featuring USGA-spec greens, sculpted bunkers, and water hazards.
        </p>

        {/* Scorecard Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Course Par</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: accent, marginTop: '2px' }}>Par 34</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Length</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>2,680 Yds</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Duration</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>~2 Hours</div>
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
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Starting Tee:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.bay_assignment}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time:</span>
              <span style={{ color: accent, fontWeight: 800 }}>{createdBooking.date} at {createdBooking.time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Players & Total:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.party_size} Golfers ({createdBooking.price})</span>
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
          {/* Flight Size & Tee Box */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color={accent} /> 1. Flight Size (Golfers)
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: accent }}>£{baseGreenFee} / Golfer</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4].map((n) => {
                const active = players === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlayers(n)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '11px',
                      border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      color: active ? accent : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {n}-Ball
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Compass size={16} color={accent} /> 2. Starting Tee Box
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TEE_BOXES.map((tee) => {
                const active = selectedTee === tee.id;
                return (
                  <div
                    key={tee.id}
                    onClick={() => setSelectedTee(tee.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: active ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>{tee.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{tee.desc}</div>
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
                      {tee.par}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date & Tee Time */}
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
                <CalendarIcon size={15} color={accent} /> 3. Select Date
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
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color={accent} /> 4. Select Tee Time
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {TEE_TIMES.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      style={{
                        minHeight: '42px',
                        borderRadius: '11px',
                        border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                        background: active ? accentSoft : '#ffffff',
                        color: active ? accent : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
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

          {/* Equipment Hire & Submit */}
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
              <Sparkles size={15} color={accent} /> 5. Equipment Hire (Optional)
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
              Confirm 9 Holes Booking (£{totalPrice}.00)
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CircleDot,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Gamepad2,
  Wine,
  CheckCircle2,
  QrCode,
  Award,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth';
import { BookingItem, createBooking } from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const AR_GAME_MODES = [
  { id: 'killer', name: 'Killer AR', tag: 'Party Mode', desc: 'Knock out rivals in interactive target play' },
  { id: '501-pro', name: '501 Pro Tour', tag: 'Classic', desc: 'Auto-scored double-out with instant replay' },
  { id: 'shanghai', name: 'Shanghai Blitz', tag: 'Arcade', desc: 'Fast-paced target race around the board' },
  { id: 'halve-it', name: 'Halve-It', tag: 'Competitive', desc: 'Hit the lit target or halve your score' },
];

const DARTS_LANES = [
  { id: 'AR Darts Lane 1', name: 'AR Darts Lane 1', capacity: '2–6 Players • Main Social Lounge' },
  { id: 'AR Darts Lane 2', name: 'AR Darts Lane 2', capacity: '2–6 Players • Bar-Side High Table' },
  { id: 'AR Darts Lane 3', name: 'AR Darts Lane 3', capacity: '2–6 Players • Panoramic Screen' },
  { id: 'AR Darts VIP Booth', name: 'AR Darts VIP Booth', capacity: 'Up to 8 Players • Private Sofa & Table Service' },
];

const DURATIONS = [
  { label: '60 mins', price: 20 },
  { label: '90 mins', price: 28 },
  { label: '120 mins', price: 35 },
];

const TIME_SLOTS = ['11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30', '21:30'];

export function BookingDarts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Royal Purple Subtle Theme Accents
  const accent = '#7c3aed';
  const accentDark = '#6d28d9';
  const accentSoft = '#f5f3ff';
  const accentBorder = '#ddd6fe';

  const [selectedLane, setSelectedLane] = useState<string>(DARTS_LANES[1].id);
  const [selectedGame, setSelectedGame] = useState<string>('killer');
  const [selectedDuration, setSelectedDuration] = useState<string>('60 mins');
  const [players, setPlayers] = useState<number>(4);
  const [drinksPackage, setDrinksPackage] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('19:00');
  const [notes, setNotes] = useState<string>('');
  const [createdBooking, setCreatedBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  const activeDur = DURATIONS.find((d) => d.label === selectedDuration) || DURATIONS[0];
  const vipSurcharge = selectedLane === 'AR Darts VIP Booth' ? 10 : 0;
  const drinksAddon = drinksPackage ? 24 : 0;
  const totalPrice = activeDur.price + vipSurcharge + drinksAddon;

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameObj = AR_GAME_MODES.find((g) => g.id === selectedGame);
    const combinedNotes = [
      `Starting Mode: ${gameObj?.name || 'Killer AR'}`,
      drinksPackage ? 'Clubhouse Pitchers & Sharing Nachos (+£24)' : '',
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    const newBk = createBooking({
      user_id: user?.id || 'usr_member_1',
      user_name: user?.name || 'Alex Morgan',
      user_member_id: user?.member_id || 'PG-2445B5',
      member_tier: user?.tier || 'Silver',
      activity_id: 'darts-interactive',
      activity_name: 'Darts Interactive Lane',
      date: selectedDate,
      time: selectedTime,
      duration: selectedDuration,
      party_size: players,
      bay_assignment: selectedLane,
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
          <CircleDot size={12} /> Smart AR Lanes
        </span>
      </div>

      {/* Subtle Purple Tinted Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
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
              boxShadow: '0 3px 10px rgba(124, 58, 237, 0.12)',
              flexShrink: 0,
            }}
          >
            <CircleDot size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              SMART AR DIGITAL TARGET DARTS
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '1px 0 0 0', lineHeight: 1.2 }}>
              Darts Interactive
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
          Real steel-tip darts with optical laser tracking, projection-mapped targets, and automatic scoring.
        </p>

        {/* Quick Info Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Scoring</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: accent, marginTop: '2px' }}>Optical AR</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Capacity</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>2–8 Players</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '8px', textAlign: 'center', border: `1px solid ${accentBorder}` }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Service</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>Lane Bar</div>
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
            Darts Lane Reserved!
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
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Lane:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.bay_assignment}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time:</span>
              <span style={{ color: accent, fontWeight: 800 }}>{createdBooking.date} at {createdBooking.time}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Duration & Group:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{createdBooking.duration} • {createdBooking.party_size} Players ({createdBooking.price})</span>
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
          {/* 1. AR Game Mode */}
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
              <Gamepad2 size={16} color={accent} /> 1. Choose Starting AR Game Mode
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {AR_GAME_MODES.map((g) => {
                const active = selectedGame === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    style={{
                      padding: '11px',
                      borderRadius: '14px',
                      border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{g.name}</span>
                      <span
                        style={{
                          fontSize: '0.56rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: active ? accent : 'var(--bg-subtle)',
                          color: active ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        {g.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{g.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Lane, Duration & Group Size */}
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
              <Sparkles size={16} color={accent} /> 2. Select Duration & Lane
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {DURATIONS.map((d) => {
                const active = selectedDuration === d.label;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setSelectedDuration(d.label)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      border: active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{d.label}</div>
                    <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 800 }}>£{d.price} / Lane</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {DARTS_LANES.map((lane) => {
                const active = selectedLane === lane.id;
                return (
                  <div
                    key={lane.id}
                    onClick={() => setSelectedLane(lane.id)}
                    style={{
                      padding: '11px 12px',
                      borderRadius: '13px',
                      border: active ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                      background: active ? accentSoft : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{lane.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lane.capacity}</div>
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: active ? accent : 'var(--slate-grey)' }}>
                      {lane.id === 'AR Darts VIP Booth' ? '+£10 VIP' : 'Standard'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} color={accent} /> Players in Lane:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[2, 4, 6, 8].map((n) => (
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

          {/* 3. Date, Time & Drinks Add-on */}
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

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color={accent} /> 4. Select Time Slot
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {TIME_SLOTS.map((t) => {
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

            <div
              onClick={() => setDrinksPackage(!drinksPackage)}
              style={{
                padding: '11px 12px',
                borderRadius: '12px',
                border: drinksPackage ? `1.5px solid ${accent}` : '1px solid var(--border-color)',
                background: drinksPackage ? accentSoft : 'var(--bg-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wine size={16} color={accent} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Clubhouse Pitchers & Sharing Nachos
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    Served to your lane on arrival
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: drinksPackage ? accent : 'var(--text-secondary)' }}>
                +£24 {drinksPackage ? '✓' : ''}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Team names or table requests"
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
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
              }}
            >
              Confirm Darts Booking (£{totalPrice}.00)
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

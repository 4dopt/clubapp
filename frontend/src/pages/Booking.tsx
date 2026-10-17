import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Target,
  Flag,
  Sparkles,
  CircleDot,
  Award,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Clock,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../auth';
import {
  BookingItem,
  getStoredBookings,
  createBooking,
} from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

interface ActivityOption {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  bgGradient: string;
  externalUrl?: string;
  isExternal?: boolean;
}

export function Booking() {
  const { user } = useAuth();

  const options: ActivityOption[] = [
    {
      id: 'driving-range',
      name: 'Driving Range',
      subtitle: 'TrackMan Range Bays',
      icon: <Target size={22} />,
      accentColor: '#047857',
      bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      externalUrl: 'https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays',
      isExternal: true,
    },
    {
      id: 'nine-holes',
      name: '9 Holes Course',
      subtitle: 'Championship Executive Round',
      icon: <Flag size={22} />,
      accentColor: '#0284c7',
      bgGradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    },
    {
      id: 'putt-crazy',
      name: 'Putt Crazy Minigolf',
      subtitle: '18-Hole Adventure Crazy Golf',
      icon: <Sparkles size={22} />,
      accentColor: '#d97706',
      bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    },
    {
      id: 'darts-interactive',
      name: 'Darts Interactive',
      subtitle: 'Smart AR Digital Target Darts',
      icon: <CircleDot size={22} />,
      accentColor: '#7c3aed',
      bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    },
  ];

  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings'>('book');
  const [selectedId, setSelectedId] = useState<string>('nine-holes');
  const activeOption = options.find((o) => o.id === selectedId) || options[1];

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('14:30');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [lastCreatedBooking, setLastCreatedBooking] = useState<BookingItem | null>(null);

  const [userBookings, setUserBookings] = useState<BookingItem[]>([]);
  const [selectedPassBooking, setSelectedPassBooking] = useState<BookingItem | null>(null);

  const timeSlots = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'];

  const reloadUserBookings = () => {
    const all = getStoredBookings();
    if (user?.id) {
      setUserBookings(all.filter((b) => b.user_id === user.id || b.user_member_id === user.member_id));
    } else {
      setUserBookings(all);
    }
  };

  useEffect(() => {
    reloadUserBookings();
  }, [user]);

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeOption.isExternal && activeOption.externalUrl) {
      window.open(activeOption.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const newBk = createBooking({
      user_id: user?.id || 'usr_member_1',
      user_name: user?.name || 'Alex Morgan',
      user_member_id: user?.member_id || 'PG-2445B5',
      activity_id: activeOption.id,
      activity_name: activeOption.name,
      date: selectedDate,
      time: selectedTime,
      notes: bookingNotes,
    });

    setLastCreatedBooking(newBk);
    setBookingNotes('');
    reloadUserBookings();
  };

  return (
    <div style={{ padding: '16px 16px 28px 16px', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            lineHeight: 1.2,
          }}
        >
          <CalendarIcon style={{ color: 'var(--brand-green)', flexShrink: 0 }} size={22} /> Club Reservations
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
          Book activities & view digital check-in passes for reception
        </p>
      </div>

      {/* Mode Switcher Segment Tabs */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          marginBottom: '18px',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('book');
            setLastCreatedBooking(null);
          }}
          style={{
            flex: 1,
            minHeight: '40px',
            padding: '8px 10px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'book' ? '#ffffff' : 'transparent',
            color: activeTab === 'book' ? 'var(--brand-green)' : 'var(--slate-grey)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'book' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          Book Activity
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('my-bookings');
            reloadUserBookings();
          }}
          style={{
            flex: 1,
            minHeight: '40px',
            padding: '8px 10px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'my-bookings' ? '#ffffff' : 'transparent',
            color: activeTab === 'my-bookings' ? 'var(--brand-green)' : 'var(--slate-grey)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: activeTab === 'my-bookings' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Ticket size={15} /> My Bookings
          {userBookings.length > 0 && (
            <span
              style={{
                background: 'var(--brand-green)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '9999px',
              }}
            >
              {userBookings.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'my-bookings' ? (
        /* MY BOOKINGS LIST SCREEN */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {userBookings.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '36px 20px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <CalendarIcon size={36} style={{ color: 'var(--slate-grey)', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No Bookings Yet
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-grey)', marginBottom: '16px', lineHeight: 1.45 }}>
                You don't have any active reservations. Select "Book Activity" to reserve a round or game!
              </p>
              <button
                onClick={() => setActiveTab('book')}
                className="btn-primary"
                style={{ height: '44px', fontSize: '0.88rem' }}
              >
                Book An Activity Now
              </button>
            </div>
          ) : (
            userBookings.map((bk) => (
              <div
                key={bk.id}
                style={{
                  background: '#ffffff',
                  border: bk.status === 'confirmed' ? '1px solid var(--brand-green-light)' : '1px solid var(--border-color)',
                  borderRadius: '18px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--brand-green)',
                        background: 'var(--brand-green-subtle)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    >
                      {bk.booking_code}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', marginBottom: '2px', lineHeight: 1.25 }}>
                      {bk.activity_name}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background:
                        bk.status === 'confirmed'
                          ? 'var(--brand-green-subtle)'
                          : bk.status === 'completed'
                          ? 'rgba(2, 132, 199, 0.12)'
                          : 'rgba(220, 38, 38, 0.12)',
                      color:
                        bk.status === 'confirmed'
                          ? 'var(--brand-green)'
                          : bk.status === 'completed'
                          ? '#0284c7'
                          : '#dc2626',
                    }}
                  >
                    {bk.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--slate-grey)', fontWeight: 600, marginBottom: bk.notes ? '8px' : '14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarIcon size={14} /> {bk.date}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--brand-green)', fontWeight: 700 }}>
                    <Clock size={14} /> {bk.time}
                  </span>
                </div>

                {bk.notes && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: '8px', marginBottom: '14px' }}>
                    Note: {bk.notes}
                  </div>
                )}

                {/* Show at Reception Button */}
                <button
                  onClick={() => setSelectedPassBooking(bk)}
                  className="btn-primary"
                  style={{
                    height: '44px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    borderRadius: '12px',
                  }}
                >
                  <QrCode size={17} /> Show Pass at Reception
                </button>
              </div>
            ))
          )}
        </div>
      ) : lastCreatedBooking ? (
        /* CONFIRMATION SCREEN FOR NEWLY CREATED BOOKING */
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '24px 18px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              color: '#047857',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.2)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h3 style={{ fontSize: '1.22rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {lastCreatedBooking.activity_name} Reserved!
          </h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate-grey)', marginBottom: '16px', fontWeight: 600 }}>
            Booking Pass Ref: <span style={{ fontFamily: 'monospace', color: 'var(--brand-green)', fontWeight: 800 }}>{lastCreatedBooking.booking_code}</span>
          </div>

          <div
            style={{
              background: activeOption.bgGradient,
              border: `1px solid ${activeOption.accentColor}33`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: activeOption.accentColor, flexShrink: 0 }}>{activeOption.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {lastCreatedBooking.activity_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
                  {lastCreatedBooking.date} at {lastCreatedBooking.time}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '11px 12px',
              borderRadius: '12px',
              color: '#047857',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '18px',
            }}
          >
            <Award size={16} style={{ flexShrink: 0 }} /> +100 Loyalty Points earned on reception check-in!
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setSelectedPassBooking(lastCreatedBooking)}
              className="btn-primary"
              style={{ height: '48px', fontSize: '0.88rem' }}
            >
              <QrCode size={17} /> Show Reception Pass
            </button>
            <button
              onClick={() => {
                setLastCreatedBooking(null);
                setActiveTab('my-bookings');
              }}
              className="btn-secondary"
              style={{ height: '44px', fontSize: '0.85rem' }}
            >
              View All My Bookings
            </button>
          </div>
        </div>
      ) : (
        /* BOOKING FORM SCREEN */
        <div>
          {/* THE 4 OPTIONS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            {options.map((opt) => {
              const isSelected = opt.id === selectedId;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedId(opt.id)}
                  style={{
                    background: isSelected ? opt.bgGradient : '#ffffff',
                    border: isSelected ? `2px solid ${opt.accentColor}` : '1px solid var(--border-color)',
                    borderRadius: '18px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? `0 8px 20px -4px ${opt.accentColor}30` : 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: isSelected ? '#ffffff' : 'var(--bg-subtle)',
                        color: opt.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 3px 10px rgba(0,0,0,0.07)' : 'none',
                        flexShrink: 0,
                      }}
                    >
                      {opt.icon}
                    </div>

                    {opt.isExternal ? (
                      <span
                        style={{
                          background: 'rgba(4, 120, 87, 0.12)',
                          color: 'var(--brand-green)',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          padding: '3px 7px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ExternalLink size={9} /> Partner
                      </span>
                    ) : isSelected ? (
                      <span
                        style={{
                          background: opt.accentColor,
                          color: '#ffffff',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Selected
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.22' }}>
                      {opt.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.3' }}>
                      {opt.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conditional Details Box: External Portal for Driving Range vs In-App Form for others */}
          {activeOption.isExternal ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '22px 18px',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '15px',
                  background: 'var(--brand-green-subtle)',
                  color: 'var(--brand-green)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Target size={26} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Driving Range Bay Reservations
              </h3>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                All TrackMan driving range bays at PlayGolf Northwick Park are booked directly via our official YourGolfBooking partner portal for live bay availability.
              </p>

              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '0.76rem',
                  color: 'var(--slate-dark)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '18px',
                }}
              >
                <ShieldCheck size={15} style={{ color: 'var(--brand-green)', flexShrink: 0 }} /> Official Partner: YourGolfBooking
              </div>

              <a
                href={activeOption.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  height: '48px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderRadius: '14px',
                }}
              >
                Book Bay on YourGolfBooking <ExternalLink size={17} />
              </a>
            </div>
          ) : (
            <form onSubmit={handleBookSubmit}>
              {/* In-App Booking Details Box */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  padding: '18px 16px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="form-group">
                  <label className="form-label">Select Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                {/* Time Slot Selector */}
                <div className="form-group">
                  <label className="form-label">Select Time Slot</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {timeSlots.map((t) => {
                      const active = selectedTime === t;
                      return (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          style={{
                            minHeight: '42px',
                            padding: '8px 4px',
                            borderRadius: '11px',
                            border: active ? `2px solid ${activeOption.accentColor}` : '1px solid var(--border-color)',
                            background: active ? `${activeOption.accentColor}15` : '#ffffff',
                            color: active ? activeOption.accentColor : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Notes Input */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label">Notes / Players (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2 players, club hire needed"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    height: '48px',
                    background: `linear-gradient(135deg, ${activeOption.accentColor}, ${activeOption.accentColor}dd)`,
                    borderRadius: '14px',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                  }}
                >
                  Confirm {activeOption.name} Booking
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal digital reception pass */}
      {selectedPassBooking && (
        <BookingPassModal
          booking={selectedPassBooking}
          onClose={() => setSelectedPassBooking(null)}
        />
      )}
    </div>
  );
}

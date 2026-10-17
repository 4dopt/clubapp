import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Target,
  Flag,
  Sparkles,
  CircleDot,
  QrCode,
  Clock,
  Ticket,
  ChevronRight,
  Award,
  Users,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../auth';
import {
  BookingItem,
  getStoredBookings,
} from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

interface ActivityOption {
  id: string;
  route: string;
  name: string;
  subtitle: string;
  tag: string;
  priceTag: string;
  icon: React.ReactNode;
  accentColor: string;
  accentSoft: string;
  accentBorder: string;
  bgGradient: string;
}

export function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'my-bookings' ? 'my-bookings' : 'book';
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings'>(initialTab);

  useEffect(() => {
    if (searchParams.get('tab') === 'my-bookings') {
      setActiveTab('my-bookings');
    }
  }, [searchParams]);

  const options: ActivityOption[] = [
    {
      id: 'driving-range',
      route: '/booking/driving-range',
      name: 'Driving Range',
      subtitle: 'TrackMan 4 Radar Range Bays',
      tag: 'TrackMan Live',
      priceTag: 'From £7.50',
      icon: <Target size={22} />,
      accentColor: '#047857',
      accentSoft: '#ecfdf5',
      accentBorder: '#a7f3d0',
      bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
    },
    {
      id: 'nine-holes',
      route: '/booking/nine-holes',
      name: '9 Holes Course',
      subtitle: 'Championship Executive Round',
      tag: 'Par 34 Course',
      priceTag: 'From £12.50',
      icon: <Flag size={22} />,
      accentColor: '#0284c7',
      accentSoft: '#f0f9ff',
      accentBorder: '#bae6fd',
      bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
    },
    {
      id: 'putt-crazy',
      route: '/booking/putt-crazy',
      name: 'Putt Crazy Minigolf',
      subtitle: '18-Hole Adventure Crazy Golf',
      tag: '18 Holes',
      priceTag: 'From £6.95',
      icon: <Sparkles size={22} />,
      accentColor: '#d97706',
      accentSoft: '#fffbeb',
      accentBorder: '#fde68a',
      bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
    },
    {
      id: 'darts-interactive',
      route: '/booking/darts-interactive',
      name: 'Darts Interactive',
      subtitle: 'Smart AR Digital Target Darts',
      tag: 'AR Lanes',
      priceTag: '£20 / Lane',
      icon: <CircleDot size={22} />,
      accentColor: '#7c3aed',
      accentSoft: '#f5f3ff',
      accentBorder: '#ddd6fe',
      bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
    },
  ];

  const [userBookings, setUserBookings] = useState<BookingItem[]>([]);
  const [selectedPassBooking, setSelectedPassBooking] = useState<BookingItem | null>(null);

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
  }, [user, activeTab]);

  const switchTab = (tab: 'book' | 'my-bookings') => {
    setActiveTab(tab);
    if (tab === 'my-bookings') {
      setSearchParams({ tab: 'my-bookings' });
      reloadUserBookings();
    } else {
      setSearchParams({});
    }
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
          onClick={() => switchTab('book')}
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
          onClick={() => switchTab('my-bookings')}
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
                onClick={() => switchTab('book')}
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: 'var(--slate-grey)', fontWeight: 600, marginBottom: bk.notes ? '8px' : '14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarIcon size={14} /> {bk.date}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--brand-green)', fontWeight: 700 }}>
                    <Clock size={14} /> {bk.time}
                  </span>
                  {bk.bay_assignment && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {bk.bay_assignment}
                    </span>
                  )}
                  {bk.party_size && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> {bk.party_size} Pax {bk.price ? `(${bk.price})` : ''}
                    </span>
                  )}
                </div>

                {bk.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: '8px', marginBottom: '14px' }}>
                    {bk.notes}
                  </div>
                )}

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
      ) : (
        /* THE 4 OPTIONS GRID WITH SUBTLE COLORED ACCENTS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {options.map((opt) => (
              <div
                key={opt.id}
                onClick={() => navigate(opt.route)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(opt.route);
                }}
                style={{
                  background: opt.bgGradient,
                  border: `1.5px solid ${opt.accentBorder}`,
                  borderRadius: '18px',
                  padding: '15px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '172px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: opt.accentSoft,
                        border: `1px solid ${opt.accentBorder}`,
                        color: opt.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {opt.icon}
                    </div>

                    <span
                      style={{
                        background: opt.accentSoft,
                        color: opt.accentColor,
                        border: `1px solid ${opt.accentBorder}`,
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.priceTag}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.22 }}>
                    {opt.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.35 }}>
                    {opt.subtitle}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '9px',
                    borderTop: `1px solid ${opt.accentBorder}80`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: opt.accentColor,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  <span>Book {opt.tag}</span>
                  <ChevronRight size={15} />
                </div>
              </div>
            ))}
          </div>

          {/* Subtle Loyalty Note */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: 'var(--brand-green-subtle)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={17} />
            </div>
            <span>
              Earn <strong style={{ color: 'var(--brand-green)' }}>+100 Loyalty Points</strong> on reception check-in for every reservation.
            </span>
          </div>
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

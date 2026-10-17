import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Calendar, QrCode, TrendingUp, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../auth';
import { MembershipCard, resolveCardVisualTier } from '../components/MembershipCard';
import { OfferOfTheDaySection } from '../components/OfferOfTheDaySection';
import { OffersSlider } from '../components/OffersSlider';
import { QrModal } from '../components/QrModal';
import { BookingPassModal } from '../components/BookingPassModal';
import { BookingItem, getStoredBookings } from '../bookingsStore';
import { api, Transaction } from '../api';

export function Dashboard() {
  const { user, token } = useAuth();
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedBookingPass, setSelectedBookingPass] = useState<BookingItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.history(token)
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  if (!user) return null;

  const currentPoints = user.points ?? user.points_balance ?? 0;
  const visualTier = resolveCardVisualTier(user);
  const nextTierName = visualTier === 'Green' ? 'Silver' : visualTier === 'Silver' ? 'Gold' : 'Platinum';
  const nextTierTarget = visualTier === 'Green' ? 500 : visualTier === 'Silver' ? 1000 : 5000;
  const progressPct = Math.min(100, Math.round((currentPoints / nextTierTarget) * 100));
  const pointsRemaining = Math.max(0, nextTierTarget - currentPoints + (visualTier === 'Green' ? 1 : 0));

  return (
    <div style={{ padding: '16px 0 28px 0' }}>
      {/* Greeting Header */}
      <div
        style={{
          padding: '0 16px 6px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Hello, {(user.name || 'Member').split(' ')[0]} 👋
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Welcome to PlayGolf Northwick Park
          </p>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          style={{
            background: 'var(--brand-green-subtle)',
            border: '1px solid rgba(4, 120, 87, 0.3)',
            color: 'var(--brand-green)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.76rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <QrCode size={15} /> QR Pass
        </button>
      </div>

      {/* Digital Membership Card */}
      <MembershipCard user={user} onOpenQrModal={() => setShowQrModal(true)} />

      {/* Tier Progress Indicator */}
      {visualTier !== 'Platinum' && (
        <div
          style={{
            margin: '0 16px 16px 16px',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontWeight: 700,
              gap: '8px',
            }}
          >
            <span>Progress to {nextTierName} Tier</span>
            <span style={{ color: 'var(--brand-green)', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {currentPoints.toLocaleString()} / {nextTierTarget.toLocaleString()} PTS
            </span>
          </div>
          <div style={{ width: '100%', height: '7px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--brand-green), var(--brand-green-light))',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          {pointsRemaining > 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--slate-grey)', marginTop: '6px', fontWeight: 600 }}>
              Earn <strong>{pointsRemaining.toLocaleString()} more PTS</strong> to unlock {nextTierName} benefits
            </div>
          )}
        </div>
      )}

      {/* Quick Action Grid */}
      <div
        style={{
          padding: '0 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <Link
          to="/booking"
          className="btn-secondary"
          style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            padding: '14px',
            textDecoration: 'none',
            background: 'var(--brand-green-subtle)',
            borderColor: 'rgba(4, 120, 87, 0.22)',
            borderRadius: 'var(--radius-lg)',
            gap: '10px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div
              style={{
                background: '#ffffff',
                color: 'var(--brand-green)',
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Calendar size={20} />
            </div>
            <ChevronRight size={16} style={{ color: 'var(--brand-green)', opacity: 0.7 }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--brand-green)', marginBottom: '2px' }}>
              Book Activity
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', lineHeight: 1.3, fontWeight: 600 }}>
              Range, Golf & Games
            </div>
          </div>
        </Link>

        <Link
          to="/rewards"
          className="btn-secondary"
          style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            padding: '14px',
            textDecoration: 'none',
            background: '#fffbeb',
            borderColor: '#fde68a',
            borderRadius: 'var(--radius-lg)',
            gap: '10px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div
              style={{
                background: '#ffffff',
                color: '#d97706',
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Gift size={20} />
            </div>
            <ChevronRight size={16} style={{ color: '#b45309', opacity: 0.7 }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309', marginBottom: '2px' }}>
              Browse Rewards
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', lineHeight: 1.3, fontWeight: 600 }}>
              Balls, Gear & Coaching
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Reservation Card */}
      {(() => {
        const bookings = getStoredBookings();
        const upcoming = bookings.find(
          (b) => (b.user_id === user.id || b.user_member_id === user.member_id) && b.status === 'confirmed'
        );
        if (!upcoming) return null;

        return (
          <div
            style={{
              margin: '0 16px 18px 16px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              boxShadow: '0 8px 20px rgba(4, 120, 87, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'inline-block',
                    marginBottom: '6px',
                  }}
                >
                  Upcoming Reservation
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.25 }}>
                  {upcoming.activity_name}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#d1fae5', fontWeight: 600, marginTop: '3px' }}>
                  {upcoming.date} at {upcoming.time} &bull; Ref: {upcoming.booking_code}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBookingPass(upcoming)}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#047857',
                border: 'none',
                borderRadius: '12px',
                padding: '11px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            >
              <QrCode size={16} /> Show Reception Pass
            </button>
          </div>
        );
      })()}

      {/* Offer of the Day Section */}
      <OfferOfTheDaySection />

      {/* Exclusive Offers Slider */}
      <OffersSlider />

      {/* Recent Activity Section */}
      <div style={{ padding: '12px 16px 0 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '8px',
          }}
        >
          <h3
            style={{
              fontSize: '1.02rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: 0,
            }}
          >
            <TrendingUp size={17} style={{ color: 'var(--brand-green)' }} /> Recent Activity
          </h3>
          <Link
            to="/profile"
            style={{
              fontSize: '0.76rem',
              color: 'var(--brand-green)',
              textDecoration: 'none',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            Full History <ChevronRight size={14} />
          </Link>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {transactions.length === 0 ? (
            <div style={{ padding: '26px 16px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.84rem' }}>
              No transactions recorded yet. Visit the driving range to earn your first points!
            </div>
          ) : (
            transactions.slice(0, 3).map((t, idx, arr) => (
              <div
                key={t.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: t.type === 'earn' ? 'var(--brand-green-subtle)' : '#fef2f2',
                      color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {t.type === 'earn' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', marginTop: '2px' }}>
                      {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {t.type === 'earn' ? `+${t.points}` : `-${t.points}`} PTS
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showQrModal && <QrModal user={user} onClose={() => setShowQrModal(false)} />}
      {selectedBookingPass && (
        <BookingPassModal
          booking={selectedBookingPass}
          onClose={() => setSelectedBookingPass(null)}
        />
      )}
    </div>
  );
}

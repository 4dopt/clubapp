import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Calendar, QrCode, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth';
import { MembershipCard } from '../components/MembershipCard';
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
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: '20px 0 32px 0' }}>
      {/* Greeting Header */}
      <div style={{ padding: '0 20px 14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Hello, {user.name.split(' ')[0]} 👋
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Welcome to PlayGolf Club
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
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <QrCode size={16} /> QR Pass
        </button>
      </div>

      {/* Digital Membership Card */}
      <MembershipCard user={user} onOpenQrModal={() => setShowQrModal(true)} />

      {/* Tier Progress Indicator */}
      {user.tier !== 'Platinum' && (
        <div style={{ margin: '0 20px 20px 20px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 700 }}>
            <span>Progress to {user.tier === 'Silver' ? 'Gold' : 'Platinum'} Tier</span>
            <span style={{ color: 'var(--brand-green)', fontWeight: 800 }}>{user.points} / {user.tier === 'Silver' ? 1000 : 5000} PTS</span>
          </div>
          <div style={{ width: '100%', height: '7px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.round((user.points / (user.tier === 'Silver' ? 1000 : 5000)) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-green), var(--brand-green-light))', borderRadius: '4px' }} />
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        <Link
          to="/booking"
          className="btn-secondary"
          style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '18px 16px', textDecoration: 'none', background: 'var(--brand-green-subtle)', borderColor: 'rgba(4, 120, 87, 0.25)', borderRadius: 'var(--radius-lg)' }}
        >
          <div style={{ background: '#ffffff', color: 'var(--brand-green)', padding: '9px', borderRadius: '12px', marginBottom: '10px', boxShadow: 'var(--shadow-sm)' }}>
            <Calendar size={22} />
          </div>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--brand-green)', marginBottom: '2px' }}>Book Activity</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', lineHeight: 1.3 }}>Range, Golf & Games</span>
        </Link>

        <Link
          to="/rewards"
          className="btn-secondary"
          style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '18px 16px', textDecoration: 'none', background: '#fffbeb', borderColor: '#fde68a', borderRadius: 'var(--radius-lg)' }}
        >
          <div style={{ background: '#ffffff', color: '#d97706', padding: '9px', borderRadius: '12px', marginBottom: '10px', boxShadow: 'var(--shadow-sm)' }}>
            <Gift size={22} />
          </div>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#b45309', marginBottom: '2px' }}>Browse Rewards</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', lineHeight: 1.3 }}>Redeem balls & coaching</span>
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
              margin: '0 20px 20px 20px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              boxShadow: '0 8px 20px rgba(4, 120, 87, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px' }}>
                Upcoming Reservation
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {upcoming.activity_name}
              </h4>
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0', fontWeight: 600, marginTop: '2px' }}>
                {upcoming.date} at {upcoming.time} &bull; Ref: {upcoming.booking_code}
              </div>
            </div>

            <button
              onClick={() => setSelectedBookingPass(upcoming)}
              style={{
                background: '#ffffff',
                color: '#047857',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              <QrCode size={16} /> Show Reception Pass
            </button>
          </div>
        );
      })()}

      {/* Exclusive Offers Slider */}
      <OffersSlider />

      {/* Recent Activity Section */}
      <div style={{ padding: '16px 20px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--brand-green)' }} /> Recent Activity
          </h3>
          <Link to="/profile" style={{ fontSize: '0.78rem', color: 'var(--brand-green)', textDecoration: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
            View Profile & History <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {transactions.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--slate-grey)', fontSize: '0.85rem' }}>
              No transactions recorded yet. Visit the driving range to earn your first points!
            </div>
          ) : (
            transactions.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '16px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', marginTop: '3px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
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


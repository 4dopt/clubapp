import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Calendar,
  Gift,
  Users,
  BarChart3,
  ChevronRight,
  Clock,
  UserCheck,
  Bell,
} from 'lucide-react';
import { adminApi, AdminStats, getStoredRedemptions } from '../api';
import { getStoredBookings, syncBookingsFromSupabase, BookingItem } from '../bookingsStore';
import { useAuth } from '../auth';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>(() => getStoredBookings());
  const [pendingVouchersCount, setPendingVouchersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Simple Quick Check-In state
  const [memberIdInput, setMemberIdInput] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = async () => {
    try {
      const [data, syncedBookings, syncedRedemptions] = await Promise.all([
        adminApi.stats(token || 'demo-admin-token'),
        syncBookingsFromSupabase(),
        adminApi.listRedemptions(token || 'demo-admin-token'),
      ]);
      setStats(data);
      setBookings(syncedBookings);
      setPendingVouchersCount(syncedRedemptions.filter((r) => !r.fulfilled).length);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setBookings(getStoredBookings());
      const redemptions = getStoredRedemptions();
      setPendingVouchersCount(redemptions.filter((r) => !r.fulfilled).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const handleSync = () => setBookings(getStoredBookings());
    window.addEventListener('playgolf-bookings-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('playgolf-bookings-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [token]);

  const handleQuickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = memberIdInput.trim().toUpperCase();
    if (!trimmed) return;

    setSubmitting(true);
    setCheckinMessage(null);
    try {
      const res = await adminApi.logVisit(token || 'demo-admin-token', trimmed);
      setCheckinMessage({
        type: 'success',
        text: `Checked in ${res.member_name || trimmed}! Added +100 points.`,
      });
      setMemberIdInput('');
      await loadDashboard();
    } catch (err: any) {
      setCheckinMessage({
        type: 'error',
        text: err?.message || 'Could not find that Member ID. Please check and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayReadable = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const todaysBookings = bookings.filter((b) => b.date === todayIso && b.status === 'confirmed');

  if (loading) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
        Loading Staff Home...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 18px 44px 18px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. FRIENDLY GREETING & PRIMARY ACTION */}
      <div
        style={{
          background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '22px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
            {todayReadable}
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            Hello, {user?.name?.split(' ')[0] || 'Staff'} 👋
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Welcome to the reception desk. Scan a member's pass or choose a section below.
          </p>
        </div>

        {/* Big Primary Scan Button */}
        <button
          onClick={() => navigate('/admin/scan')}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.28)',
          }}
        >
          <QrCode size={22} />
          <span>Scan QR Code (Member, Booking or Voucher)</span>
        </button>

        {/* Simple Quick Check-In by Member ID */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#e2e8f0',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserCheck size={16} style={{ color: '#34d399' }} />
            <span>Or type a Member ID to check them in (+100 pts):</span>
          </div>

          <form onSubmit={handleQuickCheckIn} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. PG-398459"
              value={memberIdInput}
              onChange={(e) => setMemberIdInput(e.target.value)}
              style={{
                flex: '1 1 180px',
                minHeight: '46px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            />

            <button
              type="submit"
              disabled={submitting || !memberIdInput.trim()}
              style={{
                minHeight: '46px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                background: memberIdInput.trim() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: memberIdInput.trim() ? '#34d399' : '#64748b',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: memberIdInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Checking in...' : 'Check In'}
            </button>
          </form>

          {checkinMessage && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background:
                  checkinMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: checkinMessage.type === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${
                  checkinMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
                }`,
              }}
            >
              {checkinMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* 2. TODAY'S SNAPSHOT (4 SPACIOUS, EASY-TO-READ CARDS) */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
          Today at a Glance
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
          Tap any box below to view full details.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <div
            onClick={() => navigate('/admin/analytics')}
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '20px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
              Visits Today
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {stats?.visits_today ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              Members checked in
            </div>
          </div>

          <div
            onClick={() => navigate('/admin/bookings')}
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '20px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
              Bookings Today
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {todaysBookings.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              Waiting to arrive
            </div>
          </div>

          <div
            onClick={() => navigate('/admin/rewards')}
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '20px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
              Waiting Vouchers
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {pendingVouchersCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              Ready to hand out
            </div>
          </div>

          <div
            onClick={() => navigate('/admin/members')}
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '18px',
              padding: '20px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>
              Total Members
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {stats?.total_members ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
              Registered accounts
            </div>
          </div>
        </div>
      </div>

      {/* 3. NEEDS YOUR ATTENTION TODAY (SIMPLE REMINDERS) */}
      {(todaysBookings.length > 0 || pendingVouchersCount > 0) && (
        <div>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Bell size={18} style={{ color: '#fbbf24' }} /> To-Do List for Reception
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
            Items that need a quick check from staff today.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todaysBookings.length > 0 && (
              <div
                onClick={() => navigate('/admin/bookings')}
                style={{
                  background: 'rgba(56, 189, 248, 0.09)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                    {todaysBookings.length} {todaysBookings.length === 1 ? 'Booking' : 'Bookings'} Arriving Today
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Tap here to see who is playing and check them in when they arrive.
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
              </div>
            )}

            {pendingVouchersCount > 0 && (
              <div
                onClick={() => navigate('/admin/rewards')}
                style={{
                  background: 'rgba(245, 158, 11, 0.09)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                    {pendingVouchersCount} Reward {pendingVouchersCount === 1 ? 'Voucher' : 'Vouchers'} Waiting
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Members have claimed rewards in the app. Tap to verify their code.
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MAIN STAFF MENU (BIG, CLEAR NAVIGATION CARDS) */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
          Manage the Club
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
          Choose what you would like to view or update.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            {
              title: 'Bookings & Tee Sheet',
              desc: 'See today’s schedule, check players in, or change bay numbers.',
              path: '/admin/bookings',
              icon: <Calendar size={22} />,
              color: '#38bdf8',
              bg: 'rgba(56, 189, 248, 0.14)',
            },
            {
              title: 'Club Reports & Insights',
              desc: 'Simple charts for busy hours, popular games, and top members.',
              path: '/admin/analytics',
              icon: <BarChart3 size={22} />,
              color: '#34d399',
              bg: 'rgba(16, 185, 129, 0.14)',
            },
            {
              title: 'Rewards & Vouchers',
              desc: 'Check member voucher codes or add new perks to the rewards shop.',
              path: '/admin/rewards',
              icon: <Gift size={22} />,
              color: '#fbbf24',
              bg: 'rgba(245, 158, 11, 0.14)',
            },
            {
              title: 'Offer of the Day (Mon–Sun)',
              desc: 'Customize daily offers like Monday Mornings Off-Peak & Wednesday Golf & Wings.',
              path: '/admin/rewards?tab=daily',
              icon: <Clock size={22} />,
              color: '#f97316',
              bg: 'rgba(249, 115, 22, 0.14)',
            },
            {
              title: 'Member Directory',
              desc: 'Look up any member by name and add or adjust loyalty points.',
              path: '/admin/members',
              icon: <Users size={22} />,
              color: '#c084fc',
              bg: 'rgba(192, 132, 252, 0.14)',
            },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '18px',
                padding: '20px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: item.bg,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.83rem', color: '#94a3b8', lineHeight: 1.45 }}>
                  {item.desc}
                </div>
              </div>

              <ChevronRight size={20} style={{ color: '#64748b', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* 5. RECENT ACTIVITY (SIMPLE, CLEAN LIST) */}
      <div
        style={{
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '20px',
          padding: '22px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
            Recent Club Activity
          </h2>
          <Clock size={16} style={{ color: '#64748b' }} />
        </div>
        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '16px' }}>
          The latest member visits and reward claims.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(stats?.recent || []).length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '12px 0' }}>
              No recent activity recorded yet.
            </div>
          ) : (
            (stats?.recent || []).slice(0, 4).map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff' }}>
                    {c.member_name || 'Club Member'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    {c.title} • {c.member_id || ''}
                  </div>
                </div>

                <div
                  style={{
                    background: c.type === 'earn' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                    color: c.type === 'earn' ? '#34d399' : '#fbbf24',
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.type === 'earn' ? `+${c.points} pts` : `-${c.points} pts`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

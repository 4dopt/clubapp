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
  Receipt,
  Send,
  Shield,
  CheckCircle2,
  Sparkles,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { adminApi, AdminStats, getStoredRedemptions } from '../api';
import { getStoredBookings, syncBookingsFromSupabase, BookingItem, updateBookingStatus } from '../bookingsStore';
import { useAuth } from '../auth';
import { sendPushNotification } from '../utils/pushNotifications';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>(() => getStoredBookings());
  const [pendingVouchersCount, setPendingVouchersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Separate Reception Desk vs Manager Tools mode
  const [deskMode, setDeskMode] = useState<'reception' | 'manager'>('reception');

  // Simple Quick Check-In state
  const [memberIdInput, setMemberIdInput] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Admin Push Broadcast Composer state
  const [pushAudience, setPushAudience] = useState<'ALL' | 'TIER_VIP' | 'SINGLE'>('ALL');
  const [pushTargetMember, setPushTargetMember] = useState('');
  const [pushTitle, setPushTitle] = useState('⚡ Quiet-Time 2× Points Active Now!');
  const [pushBody, setPushBody] = useState(
    'Drop into PlayGolf Northwick Park over the next 3 hours to earn DOUBLE loyalty points on all Driving Range bays!'
  );
  const [pushFeedback, setPushFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sendingPush, setSendingPush] = useState(false);

  const handleSendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setSendingPush(true);
    setPushFeedback(null);
    try {
      const targetUserId =
        pushAudience === 'ALL'
          ? null
          : pushAudience === 'TIER_VIP'
          ? 'TIER_VIP'
          : pushTargetMember.trim().toUpperCase() || null;

      await sendPushNotification({
        user_id: targetUserId,
        category: 'offer',
        title: pushTitle,
        body: pushBody,
        action_url: '/booking',
        isBroadcast: true,
      });

      setPushFeedback({
        type: 'success',
        text: `Push notification delivered to ${
          pushAudience === 'ALL'
            ? 'All Club Members'
            : pushAudience === 'TIER_VIP'
            ? 'Gold & Platinum VIPs'
            : pushTargetMember.trim().toUpperCase()
        }!`,
      });
    } catch (err: any) {
      setPushFeedback({
        type: 'error',
        text: err?.message || 'Failed to send push broadcast.',
      });
    } finally {
      setSendingPush(false);
    }
  };

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

  const handleFastArrivalCheckIn = async (booking: BookingItem) => {
    updateBookingStatus(booking.id, 'completed');
    if (token && booking.user_id) {
      try {
        await adminApi.adjustPoints(
          token,
          booking.user_id,
          100,
          `Reception check-in: ${booking.activity_name} (${booking.booking_code})`
        );
      } catch {
        /* ignore */
      }
    }
    setCheckinMessage({
      type: 'success',
      text: `Checked in ${booking.user_name} for ${booking.activity_name} (${booking.bay_assignment || 'Main Facility'})!`,
    });
    setBookings(getStoredBookings());
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayReadable = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  function parsePriceValue(priceStr?: string): number {
    if (!priceStr) return 14;
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 14 : num;
  }

  const todaysBookings = bookings.filter((b) => b.date === todayIso && b.status === 'confirmed');
  const todaysActiveBookings = bookings.filter(
    (b) => (b.date === todayIso || b.created_at?.startsWith(todayIso)) && b.status !== 'cancelled'
  );
  const todaysRevenue = todaysActiveBookings.reduce((sum, b) => sum + parsePriceValue(b.price), 0);

  if (loading) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
        Loading Reception Desk...
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      {/* TOP BAR: FRIENDLY GREETING & MODE SWITCHER (RECEPTION DESK vs MANAGER TOOLS) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            {todayReadable}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Hello, {user?.name?.split(' ')[0] || 'Staff'} 👋
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '2px' }}>
            {deskMode === 'reception'
              ? 'Daily Reception Desk — Quick check-ins, arrivals, and member vouchers.'
              : 'Manager Tools — End-of-day till takings, daily offers, reports, and push alerts.'}
          </p>
        </div>

        {/* Simple Mode Pill Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '5px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setDeskMode('reception')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: deskMode === 'reception' ? '#047857' : 'transparent',
              color: deskMode === 'reception' ? '#ffffff' : '#475569',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: deskMode === 'reception' ? '0 4px 10px rgba(4, 120, 87, 0.22)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <QrCode size={16} />
            <span>Reception Desk</span>
          </button>

          <button
            type="button"
            onClick={() => setDeskMode('manager')}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: deskMode === 'manager' ? '#0f172a' : 'transparent',
              color: deskMode === 'manager' ? '#ffffff' : '#475569',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: deskMode === 'manager' ? '0 4px 10px rgba(15, 23, 42, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={16} />
            <span>Manager Tools</span>
          </button>
        </div>
      </div>

      {/* ==========================================================================
          MODE 1: RECEPTION DESK (NON-TECH FRIENDLY, ZERO CLUTTER, 3 DAILY TASKS)
         ========================================================================== */}
      {deskMode === 'reception' && (
        <>
          {/* 1. PRIMARY ACTION: BIG SCAN PASS BUTTON + TYPE MEMBER ID */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
              border: '1.5px solid #a7f3d0',
              borderRadius: '22px',
              padding: '24px 20px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="admin-hero-grid">
              {/* Left Column: Big Easy Scan Button */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#d1fae5',
                      color: '#065f46',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '8px',
                    }}
                  >
                    Step 1 • Fastest Way to Check In
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    Scan a Guest’s QR Code
                  </h2>
                  <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                    Works for <strong>Member Cards</strong>, <strong>Booking Passes</strong>, and <strong>Reward Vouchers</strong>.
                  </p>
                </div>

                <button
                  onClick={() => navigate('/admin/scan')}
                  style={{
                    width: '100%',
                    minHeight: '58px',
                    padding: '16px 22px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
                    color: '#ffffff',
                    fontSize: '1.08rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(4, 120, 87, 0.25)',
                  }}
                >
                  <QrCode size={24} />
                  <span>Open Camera Scanner</span>
                </button>
              </div>

              {/* Right Column: Simple Type Member ID Box */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <UserCheck size={18} style={{ color: '#047857' }} />
                  <span>No camera? Type Member ID</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                  Ask the guest for the ID on their card (e.g. PG-2445B5) to add +100 visit points.
                </p>

                <form onSubmit={handleQuickCheckIn} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Type ID (e.g. PG-2445B5)"
                    value={memberIdInput}
                    onChange={(e) => setMemberIdInput(e.target.value)}
                    style={{
                      flex: '1 1 170px',
                      minHeight: '48px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.96rem',
                      fontWeight: 700,
                    }}
                  />

                  <button
                    type="submit"
                    disabled={submitting || !memberIdInput.trim()}
                    style={{
                      minHeight: '48px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      background: memberIdInput.trim() ? '#047857' : '#e2e8f0',
                      color: memberIdInput.trim() ? '#ffffff' : '#94a3b8',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: memberIdInput.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {submitting ? 'Checking in...' : 'Check In (+100 pts)'}
                  </button>
                </form>

                {checkinMessage && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      background: checkinMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      color: checkinMessage.type === 'success' ? '#065f46' : '#b91c1c',
                      border: `1px solid ${checkinMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    }}
                  >
                    {checkinMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. THREE CLEAR DAILY RECEPTION CARDS */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Daily Reception Tasks
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '14px' }}>
              Tap any card below to open that screen.
            </p>

            <div className="admin-menu-grid">
              {/* Task 1: Today's Arrivals & Bookings */}
              <button
                onClick={() => navigate('/admin/bookings')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#ffffff',
                  border: todaysBookings.length > 0 ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={26} />
                  </div>
                  <span
                    style={{
                      background: todaysBookings.length > 0 ? '#0284c7' : '#f1f5f9',
                      color: todaysBookings.length > 0 ? '#ffffff' : '#475569',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    {todaysBookings.length} {todaysBookings.length === 1 ? 'Arrival' : 'Arrivals'} Today
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    1. Bookings & Tee Sheet
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                    See who is booked today, check players in, or add a walk-in guest.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontSize: '0.85rem', fontWeight: 800 }}>
                  <span>Open Today’s Schedule</span>
                  <ChevronRight size={18} />
                </div>
              </button>

              {/* Task 2: Hand Out Member Vouchers */}
              <button
                onClick={() => navigate('/admin/rewards')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#ffffff',
                  border: pendingVouchersCount > 0 ? '2px solid #d97706' : '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Gift size={26} />
                  </div>
                  <span
                    style={{
                      background: pendingVouchersCount > 0 ? '#d97706' : '#f1f5f9',
                      color: pendingVouchersCount > 0 ? '#ffffff' : '#475569',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    {pendingVouchersCount} Waiting
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    2. Vouchers & Rewards
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                    Check off a member’s reward voucher (like free range balls or coffee).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.85rem', fontWeight: 800 }}>
                  <span>Verify Vouchers</span>
                  <ChevronRight size={18} />
                </div>
              </button>

              {/* Task 3: Look Up a Member */}
              <button
                onClick={() => navigate('/admin/members')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: '#f3e8ff',
                      color: '#7e22ce',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={26} />
                  </div>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    {stats?.total_members ?? 0} Members
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    3. Find a Member by Name
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                    Forgot their card? Search any member by name to check them in or add points.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7e22ce', fontSize: '0.85rem', fontWeight: 800 }}>
                  <span>Search Member List</span>
                  <ChevronRight size={18} />
                </div>
              </button>
            </div>
          </div>

          {/* 3. NEXT ARRIVALS TODAY (1-TAP CHECK-IN RIGHT FROM HOME SCREEN) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Players Arriving Today ({todaysBookings.length})
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '2px' }}>
                  Tap <strong>"Check In"</strong> when a guest arrives at the desk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/bookings')}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                See Full Schedule →
              </button>
            </div>

            {todaysBookings.length === 0 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.9rem',
                }}
              >
                <CheckCircle2 size={28} style={{ color: '#10b981', margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                  All caught up for today!
                </div>
                <div>No waiting bookings right now. You can add a walk-in booking from the Bookings screen.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todaysBookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 900,
                            fontSize: '0.82rem',
                            padding: '3px 9px',
                            borderRadius: '8px',
                          }}
                        >
                          {b.time}
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {b.user_name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 700 }}>
                          ({b.booking_code})
                        </span>
                        {b.payment_status === 'pay_at_desk' && (
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            Collect {b.price} at Desk
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                        {b.activity_name} • <strong>{b.bay_assignment || 'Assign Bay'}</strong> • {b.party_size || 2} Players
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFastArrivalCheckIn(b)}
                      style={{
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={16} /> Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. RECENT CHECK-INS (SIMPLE READABLE LIST) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Recent Desk Activity ({stats?.visits_today ?? 0} visits today)
              </h2>
              <Clock size={16} style={{ color: '#64748b' }} />
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
              The latest member check-ins and voucher claims at reception.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(stats?.recent || []).length === 0 ? (
                <div style={{ fontSize: '0.86rem', color: '#64748b', padding: '12px 0' }}>
                  No recent activity recorded yet today.
                </div>
              ) : (
                (stats?.recent || []).slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        {c.member_name || 'Club Member'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        {c.title} • {c.member_id || ''}
                      </div>
                    </div>

                    <div
                      style={{
                        background: c.type === 'earn' ? '#ecfdf5' : '#fef3c7',
                        color: c.type === 'earn' ? '#047857' : '#b45309',
                        border: `1px solid ${c.type === 'earn' ? '#a7f3d0' : '#fde68a'}`,
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
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
        </>
      )}

      {/* ==========================================================================
          MODE 2: MANAGER TOOLS (TILL REPORT, DAILY OFFERS, ANALYTICS, PUSH ALERTS)
         ========================================================================== */}
      {deskMode === 'manager' && (
        <>
          {/* 1. END-OF-DAY TAKINGS & TILL SUMMARY BANNER */}
          <div
            onClick={() => navigate('/admin/analytics?tab=payments')}
            style={{
              background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              borderRadius: '22px',
              padding: '24px 22px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(4, 120, 87, 0.25)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Receipt size={16} /> TODAY'S END-OF-DAY APP TAKINGS
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }}>
                £{todaysRevenue.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#ecfdf5', marginTop: '6px' }}>
                From {todaysActiveBookings.length} {todaysActiveBookings.length === 1 ? 'booking' : 'bookings'} today • Tap to print or download Z-Report
              </div>
            </div>
            <div
              style={{
                background: '#ffffff',
                color: '#047857',
                padding: '12px 18px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.88rem',
                fontWeight: 800,
              }}
            >
              <span>Open Till Report</span>
              <ChevronRight size={18} />
            </div>
          </div>

          {/* 2. MANAGER QUICK MODULES */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Club Management & Marketing
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '14px' }}>
              Update daily promotions, add new rewards, or view club performance reports.
            </p>

            <div className="admin-menu-grid">
              {[
                {
                  title: 'Daily Payments & Till Report',
                  desc: 'End-of-day takings, online vs desk payments, and CSV export.',
                  path: '/admin/analytics?tab=payments',
                  icon: <Receipt size={24} />,
                  color: '#047857',
                  bg: '#ecfdf5',
                },
                {
                  title: 'Offer of the Day (Mon–Sun)',
                  desc: 'Edit daily deals like Monday Off-Peak Range or Wednesday Golf & Wings.',
                  path: '/admin/rewards?tab=daily',
                  icon: <Sparkles size={24} />,
                  color: '#d97706',
                  bg: '#fef3c7',
                },
                {
                  title: 'Club Reports & Busy Hours',
                  desc: 'Simple charts for busy times, popular activities, and top members.',
                  path: '/admin/analytics',
                  icon: <BarChart3 size={24} />,
                  color: '#0284c7',
                  bg: '#e0f2fe',
                },
                {
                  title: 'Rewards Shop Catalog',
                  desc: 'Add new perks, change point prices, or pause out-of-stock items.',
                  path: '/admin/rewards',
                  icon: <Gift size={24} />,
                  color: '#b45309',
                  bg: '#fef3c7',
                },
                {
                  title: 'Member Directory & CSV',
                  desc: 'View all registered members, adjust points, or export the mailing list.',
                  path: '/admin/members',
                  icon: <Users size={24} />,
                  color: '#7e22ce',
                  bg: '#f3e8ff',
                },
                {
                  title: 'Bookings & Tee Sheet',
                  desc: 'Full reservation calendar across all bays, courses, and coaching.',
                  path: '/admin/bookings',
                  icon: <Calendar size={24} />,
                  color: '#0369a1',
                  bg: '#e0f2fe',
                },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '20px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
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
                    <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>
                      {item.desc}
                    </div>
                  </div>

                  <ChevronRight size={20} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

          {/* 3. PUSH NOTIFICATION BROADCAST COMPOSER (CLEAN LIGHT CARD) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} style={{ color: '#047857' }} />
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Send Push Alert to Members’ Phones
                </h2>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                INSTANT PHONE NOTIFICATION
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '14px' }}>
              Tap a quick template below or write your own message to invite members in during quiet hours.
            </p>

            {/* 1-Tap Quick Templates */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[
                {
                  label: '⚡ 2× Quiet-Time Points',
                  title: '⚡ Quiet-Time 2× Points Active Now!',
                  body: 'Drop into PlayGolf Northwick Park over the next 3 hours to earn DOUBLE loyalty points on all Driving Range bays!',
                },
                {
                  label: '🍔 Golf & Wings Deal',
                  title: '🍔 Clubhouse Special: Free Drink with Range Bucket',
                  body: 'Book any TrackMan bay this evening and claim a complimentary drink or basket of wings at the Clubhouse Bar!',
                },
                {
                  label: '🏌️ Open TrackMan Bays Now',
                  title: '🏌️ Prime TrackMan 4 Bays Open Right Now',
                  body: 'Looking for a quick practice session? Floodlit TrackMan bays are open with zero wait time — tap to reserve.',
                },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setPushTitle(tpl.title);
                    setPushBody(tpl.body);
                  }}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '7px 13px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendPushBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginRight: '4px' }}>Send to:</span>
                {[
                  { id: 'ALL', label: 'All Club Members' },
                  { id: 'TIER_VIP', label: 'Gold & Platinum VIPs Only' },
                  { id: 'SINGLE', label: 'Single Member ID' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setPushAudience(aud.id as any)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: pushAudience === aud.id ? '1.5px solid #047857' : '1px solid #cbd5e1',
                      background: pushAudience === aud.id ? '#ecfdf5' : '#ffffff',
                      color: pushAudience === aud.id ? '#047857' : '#475569',
                    }}
                  >
                    {aud.label}
                  </button>
                ))}

                {pushAudience === 'SINGLE' && (
                  <input
                    type="text"
                    placeholder="Member ID (e.g. PG-2445B5)"
                    value={pushTargetMember}
                    onChange={(e) => setPushTargetMember(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  />
                )}
              </div>

              <input
                type="text"
                placeholder="Headline Title"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                maxLength={90}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                }}
              />

              <textarea
                placeholder="Message to members..."
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                rows={2}
                maxLength={240}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={sendingPush || !pushTitle.trim() || !pushBody.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '12px 22px',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
                  }}
                >
                  <Send size={16} />
                  <span>{sendingPush ? 'Sending Alert...' : 'Send Alert to Members'}</span>
                </button>
              </div>

              {pushFeedback && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: pushFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: pushFeedback.type === 'success' ? '#065f46' : '#b91c1c',
                    border: `1px solid ${pushFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  {pushFeedback.text}
                </div>
              )}
            </form>
          </div>
        </>
      )}

      {/* ALWAYS-VISIBLE FOOTER: SWITCH TO MEMBER APP OR SIGN OUT */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '20px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
            Finished at the Reception Desk?
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
            Switch over to the Member App view or sign out of this staff account.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#f1f5f9',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <Smartphone size={16} />
            <span>Open Member App</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out of Staff Desk</span>
          </button>
        </div>
      </div>
    </div>
  );
}

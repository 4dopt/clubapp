import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Clock,
  User,
  Plus,
  X,
  Sparkles,
  CheckCheck,
  Ban,
  Activity,
  Target,
  Flag,
  CircleDot,
  Users,
  MapPin,
  CreditCard,
  Edit3,
  AlertTriangle,
  QrCode,
  List,
  LayoutGrid,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, User as MemberUser } from '../api';
import {
  BookingItem,
  getStoredBookings,
  syncBookingsFromSupabase,
  createBooking,
  updateBookingStatus,
  updateBookingDetails,
  parseBookingQrPayload,
  ACTIVITY_METADATA,
} from '../bookingsStore';
import { BookingPassModal } from '../components/BookingPassModal';

const BAY_OPTIONS_BY_ACTIVITY: Record<string, string[]> = {
  'driving-range': ['TrackMan Bay 7', 'TrackMan Bay 8', 'TrackMan Bay 12', 'VIP Covered Bay 1'],
  'nine-holes': ['Tee 1 (Championship)', 'Tee 1 (Executive)', 'Tee 10 (Back Nine)'],
  'putt-crazy': ['Adventure Course A', 'Adventure Course B', 'VIP Party Zone'],
  'darts-interactive': ['AR Darts Lane 1', 'AR Darts Lane 2', 'AR Darts Lane 3', 'AR Darts VIP Booth'],
  'golf-coaching': ['TrackMan Studio 1', 'TrackMan Studio 2', 'Short Game Academy'],
  'club-fitting': ['Fitting Lab Bay 1', 'Custom Tour Van Bay'],
};

const TIME_SLOTS = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'];

export function AdminBookings() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingItem[]>(() => getStoredBookings());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'>('all');
  const [dateScope, setDateScope] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [message, setMessage] = useState('');
  const [activeServiceBooking, setActiveServiceBooking] = useState<BookingItem | null>(null);

  // Quick Booking Code Verification Bar
  const [quickVerifyCode, setQuickVerifyCode] = useState('');

  // Manual New Booking Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('nine-holes');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('14:30');
  const [partySize, setPartySize] = useState(2);
  const [duration, setDuration] = useState('120 mins');
  const [bayAssignment, setBayAssignment] = useState('Tee 1 (Championship)');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pay_at_desk' | 'comp'>('paid');
  const [bookingNotes, setBookingNotes] = useState('');

  // Edit / Reschedule Modal state
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<BookingItem | null>(null);

  const reloadBookings = async () => {
    setBookings(getStoredBookings());
    const synced = await syncBookingsFromSupabase();
    setBookings(synced);
  };

  useEffect(() => {
    reloadBookings();
    const handleStorageOrSync = () => {
      setBookings(getStoredBookings());
    };
    window.addEventListener('playgolf-bookings-updated', handleStorageOrSync);
    window.addEventListener('storage', handleStorageOrSync);

    if (token) {
      adminApi
        .listMembers(token)
        .then((m) => {
          setMembers(m);
          if (m.length > 0) setSelectedMemberId(m[0].id);
        })
        .catch(() => setMembers([]));
    }

    return () => {
      window.removeEventListener('playgolf-bookings-updated', handleStorageOrSync);
      window.removeEventListener('storage', handleStorageOrSync);
    };
  }, [token]);

  const handleActivityChange = (actId: string) => {
    setSelectedActivity(actId);
    const meta = ACTIVITY_METADATA[actId];
    if (meta) {
      setDuration(meta.defaultDuration);
      setBayAssignment(meta.defaultBay);
    }
  };

  const handleCheckin = async (booking: BookingItem) => {
    const updated = updateBookingStatus(booking.id, 'completed') || { ...booking, status: 'completed' as const };
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
    setActiveServiceBooking(updated);
    setMessage(
      `✅ Checked in ${booking.user_name} for ${booking.activity_name} [${booking.bay_assignment || 'Main Bay'}]! +100 PTS credited.`
    );
    setBookings(getStoredBookings());
  };

  const handleQuickCodeCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickVerifyCode.trim();
    if (!raw) return;

    const synced = await syncBookingsFromSupabase();
    setBookings(synced);

    const parsedQr = parseBookingQrPayload(raw);
    const clean = (parsedQr?.booking_code || raw).trim().toUpperCase();

    const match = synced.find(
      (b) =>
        b.booking_code.toUpperCase() === clean ||
        b.booking_code.toUpperCase().endsWith(clean) ||
        b.user_member_id.toUpperCase() === clean
    );
    if (!match) {
      setMessage(`❌ No booking found matching code "${quickVerifyCode}".`);
      return;
    }
    if (match.status === 'completed') {
      setActiveServiceBooking(match);
      setMessage(`ℹ️ Booking ${match.booking_code} (${match.user_name}) is already checked in. Showing guest service details below.`);
      setQuickVerifyCode('');
      return;
    }
    await handleCheckin(match);
    setQuickVerifyCode('');
  };

  const handleCancelBooking = (booking: BookingItem) => {
    const updated = updateBookingStatus(booking.id, 'cancelled');
    if (updated) {
      setMessage(`Booking ${booking.booking_code} (${booking.activity_name}) marked as cancelled.`);
      setBookings(getStoredBookings());
    }
  };

  const handleNoShowBooking = (booking: BookingItem) => {
    const updated = updateBookingStatus(booking.id, 'no-show');
    if (updated) {
      setMessage(`⚠️ Booking ${booking.booking_code} marked as No-Show.`);
      setBookings(getStoredBookings());
    }
  };

  const handleMarkPaid = (booking: BookingItem) => {
    const updated = updateBookingDetails(booking.id, { payment_status: 'paid' });
    if (activeServiceBooking && activeServiceBooking.id === booking.id && updated) {
      setActiveServiceBooking(updated);
    }
    setMessage(`💳 Payment collected at reception for ${booking.booking_code} (${booking.price}).`);
    setBookings(getStoredBookings());
  };

  const handleCreateManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === selectedMemberId) || {
      id: 'usr_member_1',
      name: 'Alex Morgan',
      member_id: 'PG-2445B5',
      tier: 'Silver' as const,
    };

    const meta = ACTIVITY_METADATA[selectedActivity];

    const newBk = createBooking({
      user_id: member.id,
      user_name: member.name,
      user_member_id: member.member_id,
      member_tier: member.tier,
      activity_id: selectedActivity,
      activity_name: meta?.name || selectedActivity,
      date: selectedDate,
      time: selectedTime,
      duration,
      party_size: partySize,
      bay_assignment: bayAssignment,
      payment_status: paymentStatus,
      price: meta?.defaultPrice || '£25.00',
      notes: bookingNotes,
    });

    setMessage(`✅ Created ${newBk.activity_name} booking (${newBk.booking_code}) for ${newBk.user_name}!`);
    setShowAddModal(false);
    setBookingNotes('');
    setBookings(getStoredBookings());
  };

  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    updateBookingDetails(editingBooking.id, {
      date: editingBooking.date,
      time: editingBooking.time,
      party_size: editingBooking.party_size,
      duration: editingBooking.duration,
      bay_assignment: editingBooking.bay_assignment,
      payment_status: editingBooking.payment_status,
      notes: editingBooking.notes,
    });
    setMessage(`✅ Updated reservation details for ${editingBooking.booking_code}.`);
    setEditingBooking(null);
    setBookings(getStoredBookings());
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const getRelativeDateBadge = (dateStr: string) => {
    if (dateStr === todayStr) {
      return { label: 'TODAY', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)' };
    }
    if (dateStr === tomorrowStr) {
      return { label: 'TOMORROW', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.4)' };
    }
    const diffDays = Math.ceil((new Date(dateStr).getTime() - new Date(todayStr).getTime()) / 86400000);
    if (diffDays > 1) {
      return { label: `IN ${diffDays} DAYS`, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.16)', border: 'rgba(167, 139, 250, 0.35)' };
    }
    if (diffDays < 0) {
      return { label: 'PAST DATE', color: '#64748b', bg: 'rgba(100, 116, 139, 0.16)', border: 'rgba(100, 116, 139, 0.3)' };
    }
    return { label: dateStr, color: '#cbd5e1', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)' };
  };

  const filteredBookings = bookings.filter((b) => {
    const q = query.toLowerCase();
    const matchesQuery =
      b.user_name.toLowerCase().includes(q) ||
      b.user_member_id.toLowerCase().includes(q) ||
      b.booking_code.toLowerCase().includes(q) ||
      b.activity_name.toLowerCase().includes(q) ||
      (b.bay_assignment || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesActivity = activityFilter === 'All' || b.activity_id === activityFilter;

    let matchesDate = true;
    if (dateScope === 'today') matchesDate = b.date === todayStr;
    else if (dateScope === 'tomorrow') matchesDate = b.date === tomorrowStr;
    else if (dateScope === 'upcoming') matchesDate = b.date >= todayStr;

    return matchesQuery && matchesStatus && matchesActivity && matchesDate;
  });

  const todayTotal = bookings.filter((b) => b.date === todayStr).length;
  const awaitingArrivalCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const payAtDeskCount = bookings.filter((b) => b.status === 'confirmed' && b.payment_status === 'pay_at_desk').length;

  const getActivityIcon = (actId: string, size = 20) => {
    const color = ACTIVITY_METADATA[actId]?.color || '#10b981';
    switch (actId) {
      case 'driving-range':
        return <Target size={size} style={{ color }} />;
      case 'nine-holes':
        return <Flag size={size} style={{ color }} />;
      case 'putt-crazy':
        return <Sparkles size={size} style={{ color }} />;
      case 'darts-interactive':
        return <CircleDot size={size} style={{ color }} />;
      case 'golf-coaching':
        return <User size={size} style={{ color }} />;
      case 'club-fitting':
        return <Activity size={size} style={{ color }} />;
      default:
        return <Calendar size={size} style={{ color }} />;
    }
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', flex: 1, padding: '24px 18px 44px 18px' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#cbd5e1',
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={15} /> Back to Staff Home
      </button>

      {/* Top Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            <Calendar size={22} style={{ color: '#10b981', flexShrink: 0 }} /> Bookings & Schedule
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.45 }}>
            See who is playing today, check players in, or add a walk-in booking.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: '44px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> Add Walk-In Booking
        </button>
      </div>

      {message && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.85rem',
            marginBottom: '18px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spacious 2x2 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div
          onClick={() => setDateScope(dateScope === 'today' ? 'all' : 'today')}
          style={{
            background: dateScope === 'today' ? 'rgba(56, 189, 248, 0.16)' : '#111827',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>Today's Bookings</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>{todayTotal}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Tap to filter today</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          style={{
            background: statusFilter === 'confirmed' ? 'rgba(16, 185, 129, 0.18)' : '#111827',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 700 }}>Waiting to Arrive</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>{awaitingArrivalCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Not checked in yet</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          style={{
            background: statusFilter === 'completed' ? 'rgba(167, 139, 250, 0.18)' : '#111827',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#a78bfa', fontWeight: 700 }}>Already Checked In</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', marginTop: '4px' }}>{completedCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Completed sessions</div>
        </div>

        <div
          style={{
            background: '#111827',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: 700 }}>Pay at Reception</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>{payAtDeskCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Payment due on arrival</div>
        </div>
      </div>

      {/* Fast Reception Pass Code Lookup Bar */}
      <form
        onSubmit={handleQuickCodeCheckin}
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          borderRadius: '14px',
          padding: '10px 12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <QrCode size={18} color="#10b981" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={quickVerifyCode}
          onChange={(e) => setQuickVerifyCode(e.target.value)}
          placeholder="Fast Check-in: Enter Booking Ref (e.g. PG-BK109283)..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: '#10b981',
            color: '#090d16',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Verify & Check-In
        </button>
      </form>

      {/* Active Guest Reception Service Sheet */}
      {activeServiceBooking && (
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.14), rgba(15, 23, 42, 0.96))',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            borderRadius: '18px',
            padding: '18px',
            marginBottom: '18px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ✓ Reception Guest Service Sheet • {activeServiceBooking.booking_code}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: '4px 0 0 0' }}>
                {activeServiceBooking.activity_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveServiceBooking(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Close ✕
            </button>
          </div>

          <div
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px' }}>
              How to Serve This Guest
            </div>
            <div style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600, lineHeight: 1.45 }}>
              {ACTIVITY_METADATA[activeServiceBooking.activity_id]?.serviceInstructions ||
                'Verify guest name, assign bay/lane, and provide required equipment at reception.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: 'rgba(9, 13, 22, 0.75)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Guest & Member ID</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{activeServiceBooking.user_name}</div>
              <div style={{ fontSize: '0.74rem', color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>
                {activeServiceBooking.user_member_id} ({activeServiceBooking.member_tier || 'Silver'})
              </div>
            </div>

            <div style={{ background: 'rgba(9, 13, 22, 0.75)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Bay / Spot</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {activeServiceBooking.bay_assignment || 'Assign at Desk'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600 }}>
                {activeServiceBooking.date} at {activeServiceBooking.time} ({activeServiceBooking.duration || '60 mins'})
              </div>
            </div>

            <div style={{ background: 'rgba(9, 13, 22, 0.75)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Party Size</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                {activeServiceBooking.party_size || 2} Players
              </div>
            </div>

            <div style={{ background: 'rgba(9, 13, 22, 0.75)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Payment & Total</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {activeServiceBooking.price || '£25.00'} •{' '}
                <span style={{ color: activeServiceBooking.payment_status === 'pay_at_desk' ? '#fbbf24' : '#34d399' }}>
                  {activeServiceBooking.payment_status === 'pay_at_desk' ? 'COLLECT AT DESK' : 'PAID'}
                </span>
              </div>
              {activeServiceBooking.payment_status === 'pay_at_desk' && (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(activeServiceBooking)}
                  style={{
                    marginTop: '6px',
                    background: '#f59e0b',
                    color: '#090d16',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Mark Paid Now
                </button>
              )}
            </div>
          </div>

          {activeServiceBooking.notes && (
            <div style={{ marginTop: '10px', background: 'rgba(9, 13, 22, 0.75)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: '#e2e8f0' }}>
              <strong style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', marginRight: '6px' }}>
                Extras & Notes:
              </strong>
              {activeServiceBooking.notes}
            </div>
          )}
        </div>
      )}

      {/* Date Horizon + View Mode Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '2px',
          }}
        >
          {(
            [
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'tomorrow', label: 'Tomorrow' },
              { id: 'upcoming', label: 'Upcoming' },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDateScope(d.id)}
              style={{
                flex: 1,
                padding: '6px 6px',
                borderRadius: '8px',
                border: 'none',
                background: dateScope === d.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: dateScope === d.id ? '#38bdf8' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Detailed Cards vs Tee-Sheet Timeline */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '2px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Detailed Booking Cards"
            style={{
              padding: '6px 9px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'cards' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: viewMode === 'cards' ? '#10b981' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            title="Chronological Tee-Sheet Schedule"
            style={{
              padding: '6px 9px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'timeline' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: viewMode === 'timeline' ? '#10b981' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Activity Type Filter Chips (Color-coded so staff can filter by Course, Minigolf, Darts, Coaching, Fitting) */}
      <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActivityFilter('All')}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: activityFilter === 'All' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            background: activityFilter === 'All' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)',
            color: activityFilter === 'All' ? '#10b981' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All Activities ({bookings.length})
        </button>

        {Object.entries(ACTIVITY_METADATA).map(([actId, meta]) => {
          const isSelected = activityFilter === actId;
          const count = bookings.filter((b) => b.activity_id === actId).length;
          return (
            <button
              key={actId}
              type="button"
              onClick={() => setActivityFilter(actId)}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                border: isSelected ? `1px solid ${meta.color}` : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? meta.bgTint : 'rgba(15, 23, 42, 0.7)',
                color: isSelected ? meta.color : '#cbd5e1',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color }} />
              {meta.shortTag} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Status Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search member name, ID, booking ref, bay or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              paddingLeft: '40px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#ffffff',
              marginBottom: 0,
              minHeight: '44px',
            }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '2px',
          }}
        >
          {(['all', 'confirmed', 'completed', 'cancelled', 'no-show'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                flex: 1,
                minHeight: '34px',
                padding: '5px 4px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: statusFilter === st ? '#10b981' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {st === 'confirmed' ? 'Awaiting' : st}
            </button>
          ))}
        </div>
      </div>

      {/* TIMELINE TEE-SHEET VIEW vs DETAILED CARDS VIEW */}
      {viewMode === 'timeline' ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="#10b981" /> Daily Tee-Sheet & Bay Schedule
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
              {filteredBookings.length} Reservations Shown
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TIME_SLOTS.map((slotTime) => {
              const slotBookings = filteredBookings.filter((b) => b.time === slotTime);
              return (
                <div
                  key={slotTime}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '10px',
                    borderRadius: '12px',
                    background: slotBookings.length > 0 ? 'rgba(9, 13, 22, 0.75)' : 'rgba(9, 13, 22, 0.3)',
                    border: slotBookings.length > 0 ? '1px solid rgba(255,255,255,0.1)' : '1px dashed rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    style={{
                      width: '54px',
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      color: slotBookings.length > 0 ? '#10b981' : '#64748b',
                      paddingTop: '2px',
                    }}
                  >
                    {slotTime}
                  </div>

                  {slotBookings.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, paddingTop: '2px' }}>
                      Open Slot — Available for walk-in
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                      {slotBookings.map((bk) => {
                        const meta = ACTIVITY_METADATA[bk.activity_id];
                        return (
                          <div
                            key={bk.id}
                            style={{
                              borderLeft: `3px solid ${meta?.color || '#10b981'}`,
                              background: 'rgba(15, 23, 42, 0.9)',
                              padding: '8px 10px',
                              borderRadius: '0 10px 10px 0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: meta?.color || '#10b981' }}>
                                  {meta?.shortTag || bk.activity_name}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>• {bk.bay_assignment}</span>
                                <span style={{ fontSize: '0.62rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                  ({bk.date})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                                {bk.user_name} ({bk.party_size || 2} Pax) — <span style={{ color: '#34d399' }}>{bk.price}</span>
                              </div>
                            </div>

                            {bk.status === 'confirmed' ? (
                              <button
                                type="button"
                                onClick={() => handleCheckin(bk)}
                                style={{
                                  background: '#10b981',
                                  color: '#090d16',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '6px 10px',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                Check In
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                                {bk.status}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ULTRA-CLEAR BOOKING CARDS LIST */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          {filteredBookings.length === 0 ? (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                borderRadius: '16px',
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.84rem',
              }}
            >
              No bookings found matching your current filter criteria.
            </div>
          ) : (
            filteredBookings.map((b) => {
              const meta = ACTIVITY_METADATA[b.activity_id] || {
                name: b.activity_name,
                shortTag: 'CLUB ACTIVITY',
                category: 'Reservation',
                defaultDuration: '60 mins',
                defaultBay: 'Main Facility',
                defaultPrice: '£25.00',
                color: '#10b981',
                bgTint: 'rgba(16, 185, 129, 0.14)',
              };
              const dateBadge = getRelativeDateBadge(b.date);

              return (
                <div
                  key={b.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border:
                      b.status === 'confirmed'
                        ? `1px solid ${meta.color}55`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: `5px solid ${meta.color}`,
                    borderRadius: '16px',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  {/* Top Category Strip: Immediately identifies WHAT booking this is + Date Urgency + Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Prominent Activity Type Pill */}
                      <span
                        style={{
                          background: meta.bgTint,
                          color: meta.color,
                          border: `1px solid ${meta.color}44`,
                          padding: '3px 9px',
                          borderRadius: '7px',
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          letterSpacing: '0.05em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {getActivityIcon(b.activity_id, 13)}
                        {meta.shortTag}
                      </span>

                      {/* Relative Date Badge (TODAY / TOMORROW) */}
                      <span
                        style={{
                          background: dateBadge.bg,
                          color: dateBadge.color,
                          border: `1px solid ${dateBadge.border}`,
                          padding: '3px 8px',
                          borderRadius: '7px',
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {dateBadge.label}
                      </span>

                      {/* Booking Reference Code */}
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#cbd5e1',
                          background: 'rgba(255, 255, 255, 0.07)',
                          padding: '2px 7px',
                          borderRadius: '6px',
                        }}
                      >
                        {b.booking_code}
                      </span>
                    </div>

                    {/* Booking Status Pill */}
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        background:
                          b.status === 'confirmed'
                            ? 'rgba(16, 185, 129, 0.16)'
                            : b.status === 'completed'
                            ? 'rgba(56, 189, 248, 0.16)'
                            : b.status === 'no-show'
                            ? 'rgba(245, 158, 11, 0.18)'
                            : 'rgba(239, 68, 68, 0.16)',
                        color:
                          b.status === 'confirmed'
                            ? '#10b981'
                            : b.status === 'completed'
                            ? '#38bdf8'
                            : b.status === 'no-show'
                            ? '#fbbf24'
                            : '#f87171',
                        border:
                          b.status === 'confirmed'
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : b.status === 'completed'
                            ? '1px solid rgba(56, 189, 248, 0.35)'
                            : b.status === 'no-show'
                            ? '1px solid rgba(245, 158, 11, 0.35)'
                            : '1px solid rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      {b.status === 'confirmed' ? '● Confirmed' : b.status === 'completed' ? '✓ Checked In' : b.status}
                    </span>
                  </div>

                  {/* Main Title & Member Profile Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0', lineHeight: 1.25 }}>
                        {b.activity_name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        <span style={{ color: '#f8fafc', fontWeight: 800 }}>{b.user_name}</span>
                        <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                          ({b.user_member_id})
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: '999px',
                            background:
                              b.member_tier === 'Platinum'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : b.member_tier === 'Gold'
                                ? 'rgba(251, 191, 36, 0.2)'
                                : 'rgba(148, 163, 184, 0.2)',
                            color:
                              b.member_tier === 'Platinum'
                                ? '#34d399'
                                : b.member_tier === 'Gold'
                                ? '#fbbf24'
                                : '#cbd5e1',
                          }}
                        >
                          {b.member_tier || 'Silver'} Tier
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPassModalBooking(b)}
                      title="Show QR Pass"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#cbd5e1',
                        borderRadius: '10px',
                        padding: '7px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <QrCode size={14} color={meta.color} /> Pass
                    </button>
                  </div>

                  {/* Structured 4-Box Operational Grid: WHEN, DURATION & PAX, WHERE (BAY), PAYMENT */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      background: 'rgba(9, 13, 22, 0.65)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {/* 1. Date & Time Slot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color={meta.color} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                          Date & Tee Time
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>
                          {b.date} @ <span style={{ color: meta.color }}>{b.time}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Party Size & Duration */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                          Players & Duration
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>
                          {b.party_size || 2} {b.party_size === 1 ? 'Player' : 'Players'} &bull; {b.duration || '60 mins'}
                        </div>
                      </div>
                    </div>

                    {/* 3. Assigned Facility / Bay / Tee */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={15} color="#a78bfa" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                          Assigned Location
                        </div>
                        <div
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#e2e8f0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {b.bay_assignment || meta.defaultBay}
                        </div>
                      </div>
                    </div>

                    {/* 4. Payment & Tariff Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard
                        size={15}
                        color={b.payment_status === 'pay_at_desk' ? '#fbbf24' : '#10b981'}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                          Tariff & Payment
                        </div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: '#ffffff' }}>{b.price || meta.defaultPrice}</span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background:
                                b.payment_status === 'pay_at_desk'
                                  ? 'rgba(251, 191, 36, 0.2)'
                                  : 'rgba(16, 185, 129, 0.2)',
                              color: b.payment_status === 'pay_at_desk' ? '#fbbf24' : '#34d399',
                            }}
                          >
                            {b.payment_status === 'pay_at_desk'
                              ? 'COLLECT @ DESK'
                              : b.payment_status === 'comp'
                              ? 'VIP COMP'
                              : 'PRE-PAID'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Staff Special Requests / Equipment Notes */}
                  {b.notes && (
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#fde68a',
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.22)',
                        padding: '8px 11px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                      <span>
                        <strong style={{ color: '#fbbf24' }}>Guest / Equipment Note:</strong> {b.notes}
                      </span>
                    </div>
                  )}

                  {b.status === 'completed' && b.checked_in_at && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={14} /> Checked in at reception at{' '}
                      {new Date(b.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (+100 PTS awarded)
                    </div>
                  )}

                  {/* Reception Action Controls */}
                  {b.status === 'confirmed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleCheckin(b)}
                          style={{
                            flex: 2,
                            minHeight: '42px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          <CheckCheck size={16} /> Check-In (+100 PTS)
                        </button>

                        <button
                          onClick={() => setEditingBooking({ ...b })}
                          style={{
                            flex: 1,
                            minHeight: '42px',
                            background: 'rgba(56, 189, 248, 0.14)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={14} /> Edit / Bay
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {b.payment_status === 'pay_at_desk' && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(b)}
                            style={{
                              flex: 1,
                              minHeight: '34px',
                              background: 'rgba(251, 191, 36, 0.15)',
                              border: '1px solid rgba(251, 191, 36, 0.35)',
                              color: '#fbbf24',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <CreditCard size={13} /> Mark Paid ({b.price})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleNoShowBooking(b)}
                          style={{
                            flex: 1,
                            minHeight: '34px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            color: '#fbbf24',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <AlertTriangle size={13} /> No-Show
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b)}
                          style={{
                            flex: 1,
                            minHeight: '34px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Ban size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingBooking({ ...b })}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Edit3 size={13} /> Edit Details
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBookingStatus(b.id, 'confirmed');
                          setMessage(`Re-opened booking ${b.booking_code} as Confirmed.`);
                          reloadBookings();
                        }}
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#10b981',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Restore to Confirmed
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Driving Range Partner Note Banner */}
      <div
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.22)',
          borderRadius: '14px',
          padding: '12px 14px',
          fontSize: '0.75rem',
          color: '#a7f3d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          lineHeight: 1.4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Target size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#ffffff' }}>TrackMan Driving Range Bays:</strong> Managed via YourGolfBooking live bay sheet.
          </div>
        </div>
        <a
          href="https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#10b981',
            fontWeight: 800,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Portal <ExternalLink size={13} />
        </a>
      </div>

      {/* Manual Walk-In / Reception Booking Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#ffffff', maxWidth: '430px' }}
          >
            <button
              onClick={() => setShowAddModal(false)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
              <Plus size={18} style={{ color: '#10b981', flexShrink: 0 }} /> New Reception Reservation
            </h3>

            <form onSubmit={handleCreateManualBooking}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Select Club Member</label>
                <select
                  className="form-input"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.member_id}) - {m.tier}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Activity Type</label>
                <select
                  className="form-input"
                  value={selectedActivity}
                  onChange={(e) => handleActivityChange(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <option value="nine-holes">9 Holes Championship Course (£28)</option>
                  <option value="putt-crazy">Putt Crazy Adventure Minigolf (£12)</option>
                  <option value="darts-interactive">Darts Interactive Lane (£20)</option>
                  <option value="golf-coaching">PGA Golf Coaching & Lesson (£65)</option>
                  <option value="club-fitting">Custom Club Fitting Session (£50)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                  <select
                    className="form-input"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Party Size (Pax)</label>
                  <select
                    className="form-input"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {[1, 2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Player' : 'Players'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Payment Status</label>
                  <select
                    className="form-input"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <option value="paid">Pre-Paid / Settled</option>
                    <option value="pay_at_desk">Pay at Reception</option>
                    <option value="comp">VIP Complimentary</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Assigned Bay / Tee / Studio</label>
                <select
                  className="form-input"
                  value={bayAssignment}
                  onChange={(e) => setBayAssignment(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {(BAY_OPTIONS_BY_ACTIVITY[selectedActivity] || ['Main Facility']).map((bay) => (
                    <option key={bay} value={bay}>{bay}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Guest / Equipment Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Left-handed club hire, electric buggy..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px', background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 800 }}>
                Confirm & Issue Booking Pass
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Reschedule / Assign Bay Modal */}
      {editingBooking && (
        <div className="modal-overlay" onClick={() => setEditingBooking(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#ffffff', maxWidth: '430px' }}
          >
            <button
              onClick={() => setEditingBooking(null)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Manage Booking: {editingBooking.booking_code}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, marginBottom: '14px' }}>
              {editingBooking.activity_name} &bull; {editingBooking.user_name}
            </p>

            <form onSubmit={handleSaveEditBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingBooking.date}
                    onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                    required
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                  <select
                    className="form-input"
                    value={editingBooking.time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, time: e.target.value })}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Players</label>
                  <select
                    className="form-input"
                    value={editingBooking.party_size || 2}
                    onChange={(e) => setEditingBooking({ ...editingBooking, party_size: Number(e.target.value) })}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {[1, 2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Player' : 'Players'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Payment Status</label>
                  <select
                    className="form-input"
                    value={editingBooking.payment_status || 'paid'}
                    onChange={(e) => setEditingBooking({ ...editingBooking, payment_status: e.target.value as any })}
                    style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <option value="paid">Pre-Paid / Settled</option>
                    <option value="pay_at_desk">Pay at Reception</option>
                    <option value="comp">VIP Complimentary</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Assigned Bay / Tee / Studio</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.bay_assignment || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, bay_assignment: e.target.value })}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Staff Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.notes || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                  style={{ background: 'rgba(30, 41, 59, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', height: '46px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', fontWeight: 800 }}>
                Save Reservation Updates
              </button>
            </form>
          </div>
        </div>
      )}

      {passModalBooking && (
        <BookingPassModal booking={passModalBooking} onClose={() => setPassModalBooking(null)} />
      )}
    </div>
  );
}

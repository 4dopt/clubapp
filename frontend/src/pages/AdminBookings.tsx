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
  Utensils,
  BellRing,
  PackageCheck,
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
  parseBookingAddons,
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
    const addons = parseBookingAddons(updated.notes);
    setMessage(
      addons.hasAnyAddons
        ? `🚨 Checked in ${booking.user_name} (${booking.booking_code})! Guest has PRE-ORDERED ITEMS — please send order to Kitchen/Bar below.`
        : `✅ Checked in ${booking.user_name} for ${booking.activity_name} [${booking.bay_assignment || 'Main Bay'}]! +100 Points added.`
    );
    setBookings(getStoredBookings());
  };

  const handleMarkKitchenOrdered = (booking: BookingItem) => {
    const updated = updateBookingDetails(booking.id, { kitchen_order_placed: true });
    if (activeServiceBooking && activeServiceBooking.id === booking.id && updated) {
      setActiveServiceBooking(updated);
    }
    setMessage(`🍽️ Kitchen/Bar order sent & equipment handed out for ${booking.user_name} (${booking.booking_code}).`);
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
      setMessage(`ℹ️ Booking ${match.booking_code} (${match.user_name}) is already checked in. Showing guest details below.`);
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
      return { label: 'TODAY', color: '#047857', bg: '#d1fae5', border: '#6ee7b7' };
    }
    if (dateStr === tomorrowStr) {
      return { label: 'TOMORROW', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' };
    }
    const diffDays = Math.ceil((new Date(dateStr).getTime() - new Date(todayStr).getTime()) / 86400000);
    if (diffDays > 1) {
      return { label: `IN ${diffDays} DAYS`, color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd' };
    }
    if (diffDays < 0) {
      return { label: 'PAST DATE', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
    }
    return { label: dateStr, color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' };
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

  const getActivityIcon = (actId: string, size = 18) => {
    const color = ACTIVITY_METADATA[actId]?.color || '#047857';
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

  const activeServiceAddons = activeServiceBooking ? parseBookingAddons(activeServiceBooking.notes) : null;

  return (
    <div className="admin-page-container" style={{ color: '#0f172a', flex: 1 }}>
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '9px 16px',
            borderRadius: '999px',
            fontSize: '0.84rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </button>
      </div>

      {/* Top Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            <Calendar size={24} style={{ color: '#047857', flexShrink: 0 }} /> Bookings & Tee Sheet
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.45 }}>
            See who is playing today, check guests in when they arrive, or add a walk-in booking.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: '48px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #047857, #10b981)',
            boxShadow: '0 4px 14px rgba(4, 120, 87, 0.25)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={18} /> Add Walk-In Booking
        </button>
      </div>

      {message && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '14px 16px',
            borderRadius: '14px',
            fontSize: '0.9rem',
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
            style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spacious 4 Summary Cards (Tap to Filter) */}
      <div className="admin-kpi-grid">
        <div
          onClick={() => setDateScope(dateScope === 'today' ? 'all' : 'today')}
          style={{
            background: dateScope === 'today' ? '#e0f2fe' : '#ffffff',
            border: dateScope === 'today' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 800 }}>Today's Bookings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{todayTotal}</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Tap to show today only</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          style={{
            background: statusFilter === 'confirmed' ? '#ecfdf5' : '#ffffff',
            border: statusFilter === 'confirmed' ? '2px solid #047857' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>Waiting to Arrive</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>{awaitingArrivalCount}</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Tap to filter waiting</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          style={{
            background: statusFilter === 'completed' ? '#f3e8ff' : '#ffffff',
            border: statusFilter === 'completed' ? '2px solid #7e22ce' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#7e22ce', fontWeight: 800 }}>Already Checked In</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7e22ce', marginTop: '4px' }}>{completedCount}</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Completed sessions</div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fde68a',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 800 }}>Pay at Reception</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>{payAtDeskCount}</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Payment due on arrival</div>
        </div>
      </div>

      {/* Fast Reception Pass Code Lookup Bar */}
      <form
        onSubmit={handleQuickCodeCheckin}
        style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '16px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <QrCode size={20} color="#047857" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={quickVerifyCode}
          onChange={(e) => setQuickVerifyCode(e.target.value)}
          placeholder="Quick Check-In by Booking Code (e.g. PG-BK109283)..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            color: '#0f172a',
            fontSize: '0.9rem',
            fontWeight: 700,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: '#047857',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 16px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Check In Now
        </button>
      </form>

      {/* Active Guest Reception Service Sheet */}
      {activeServiceBooking && (
        <div
          style={{
            background: '#ffffff',
            border: '2px solid #047857',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✓ Guest Checked In • {activeServiceBooking.booking_code}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                {activeServiceBooking.activity_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveServiceBooking(null)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Close ✕
            </button>
          </div>

          {/* 🚨 PRE-ORDERED FOOD & ADD-ONS HIGHLIGHT IN SERVICE SHEET 🚨 */}
          {activeServiceAddons && activeServiceAddons.hasAnyAddons && (
            <div
              style={{
                background: activeServiceBooking.kitchen_order_placed ? '#ecfdf5' : '#fffbeb',
                border: activeServiceBooking.kitchen_order_placed ? '2px solid #10b981' : '2px solid #f59e0b',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  color: activeServiceBooking.kitchen_order_placed ? '#065f46' : '#b45309',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}
              >
                <BellRing size={16} />
                {activeServiceBooking.kitchen_order_placed
                  ? '✓ Kitchen / Bar Order Sent & Add-Ons Issued'
                  : '🚨 Staff To-Do — Guest Has Pre-Ordered Food/Equipment:'}
              </div>

              {activeServiceAddons.hasFoodPreOrders && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Utensils size={14} /> Send to Kitchen / Bar:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeServiceAddons.foodPreOrders.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #f59e0b',
                          color: '#0f172a',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                        }}
                      >
                        🍽️ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeServiceAddons.hasEquipmentAddons && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <PackageCheck size={14} /> Equipment to Hand Over:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeServiceAddons.equipmentAddons.map((addon, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #38bdf8',
                          color: '#0369a1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                        }}
                      >
                        ⛳ {addon}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!activeServiceBooking.kitchen_order_placed && (
                <button
                  type="button"
                  onClick={() => handleMarkKitchenOrdered(activeServiceBooking)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #d97706, #ea580c)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCheck size={16} /> Confirm Kitchen/Bar Order Sent & Add-Ons Handed Out
                </button>
              )}
            </div>
          )}

          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
              How to Serve This Guest
            </div>
            <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.45 }}>
              {ACTIVITY_METADATA[activeServiceBooking.activity_id]?.serviceInstructions ||
                'Verify guest name, assign bay/lane, and provide required equipment at reception.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Guest & Member ID</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{activeServiceBooking.user_name}</div>
              <div style={{ fontSize: '0.78rem', color: '#047857', fontFamily: 'monospace', fontWeight: 700 }}>
                {activeServiceBooking.user_member_id} ({activeServiceBooking.member_tier || 'Silver'})
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Bay / Spot</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
                {activeServiceBooking.bay_assignment || 'Assign at Desk'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                {activeServiceBooking.date} at {activeServiceBooking.time} ({activeServiceBooking.duration || '60 mins'})
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Party Size</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {activeServiceBooking.party_size || 2} Players
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Payment & Total</div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                {activeServiceBooking.price || '£25.00'} •{' '}
                <span style={{ color: activeServiceBooking.payment_status === 'pay_at_desk' ? '#d97706' : '#047857' }}>
                  {activeServiceBooking.payment_status === 'pay_at_desk' ? 'COLLECT AT DESK' : 'PAID'}
                </span>
              </div>
              {activeServiceBooking.payment_status === 'pay_at_desk' && (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(activeServiceBooking)}
                  style={{
                    marginTop: '6px',
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Mark Paid Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter & View Controls */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Date Horizon + View Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              gap: '4px',
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
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: dateScope === d.id ? '#047857' : 'transparent',
                  color: dateScope === d.id ? '#ffffff' : '#475569',
                  fontSize: '0.78rem',
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
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Booking Cards"
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#047857' : '#64748b',
                boxShadow: viewMode === 'cards' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                fontWeight: 800,
              }}
            >
              <LayoutGrid size={15} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              title="Time Schedule"
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                color: viewMode === 'timeline' ? '#047857' : '#64748b',
                boxShadow: viewMode === 'timeline' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                fontWeight: 800,
              }}
            >
              <List size={15} /> Schedule
            </button>
          </div>
        </div>

        {/* Activity Type Filter Chips */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setActivityFilter('All')}
            style={{
              padding: '7px 14px',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              border: activityFilter === 'All' ? '1.5px solid #047857' : '1px solid #cbd5e1',
              background: activityFilter === 'All' ? '#ecfdf5' : '#f8fafc',
              color: activityFilter === 'All' ? '#047857' : '#475569',
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
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: isSelected ? '1.5px solid #047857' : '1px solid #cbd5e1',
                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                  color: isSelected ? '#047857' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color }} />
                {meta.shortTag} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search guest name, Member ID, booking code, or bay..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                paddingLeft: '42px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                marginBottom: 0,
                minHeight: '46px',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              gap: '4px',
            }}
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'confirmed', label: 'Waiting to Arrive' },
                { id: 'completed', label: 'Checked In' },
                { id: 'cancelled', label: 'Cancelled' },
                { id: 'no-show', label: 'No-Show' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                style={{
                  flex: 1,
                  minHeight: '36px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: statusFilter === st.id ? '#ffffff' : 'transparent',
                  color: statusFilter === st.id ? '#047857' : '#475569',
                  boxShadow: statusFilter === st.id ? 'var(--shadow-sm)' : 'none',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TIMELINE TEE-SHEET VIEW vs DETAILED CARDS VIEW */}
      {viewMode === 'timeline' ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '18px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#047857" /> Daily Tee-Sheet & Bay Schedule
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
              {filteredBookings.length} Bookings Shown
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
                    padding: '12px',
                    borderRadius: '12px',
                    background: slotBookings.length > 0 ? '#f8fafc' : '#ffffff',
                    border: slotBookings.length > 0 ? '1px solid #cbd5e1' : '1px dashed #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      fontWeight: 900,
                      color: slotBookings.length > 0 ? '#047857' : '#94a3b8',
                      paddingTop: '2px',
                    }}
                  >
                    {slotTime}
                  </div>

                  {slotBookings.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, paddingTop: '2px' }}>
                      Open Time Slot — Free for walk-ins
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                      {slotBookings.map((bk) => {
                        const meta = ACTIVITY_METADATA[bk.activity_id];
                        return (
                          <div
                            key={bk.id}
                            style={{
                              borderLeft: `4px solid ${meta?.color || '#047857'}`,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              padding: '10px 12px',
                              borderRadius: '0 10px 10px 0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#047857' }}>
                                  {meta?.shortTag || bk.activity_name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>• {bk.bay_assignment}</span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  ({bk.date})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                {bk.user_name} ({bk.party_size || 2} Players) — <span style={{ color: '#047857' }}>{bk.price}</span>
                              </div>
                            </div>

                            {bk.status === 'confirmed' ? (
                              <button
                                type="button"
                                onClick={() => handleCheckin(bk)}
                                style={{
                                  background: '#047857',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                Check In
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                                {bk.status === 'completed' ? '✓ Checked In' : bk.status}
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
        /* ULTRA-CLEAR BOOKING CARDS LIST (CLEAN LIGHT MODE) */
        <div className="admin-cards-grid">
          {filteredBookings.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '36px 16px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.92rem',
              }}
            >
              No bookings match your current filter.
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
                color: '#047857',
                bgTint: '#ecfdf5',
              };
              const dateBadge = getRelativeDateBadge(b.date);
              const cardAddons = parseBookingAddons(b.notes);

              return (
                <div
                  key={b.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${meta.color}`,
                    borderRadius: '18px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Top Category Strip */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Relative Date Badge */}
                      <span
                        style={{
                          background: dateBadge.bg,
                          color: dateBadge.color,
                          border: `1px solid ${dateBadge.border}`,
                          padding: '3px 9px',
                          borderRadius: '7px',
                          fontSize: '0.7rem',
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
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          color: '#334155',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {b.booking_code}
                      </span>

                      {/* Pre-Order Badge if booking has food or equipment add-ons */}
                      {cardAddons.hasAnyAddons && (
                        <span
                          style={{
                            background: b.kitchen_order_placed ? '#d1fae5' : '#fef3c7',
                            color: b.kitchen_order_placed ? '#065f46' : '#b45309',
                            border: b.kitchen_order_placed ? '1px solid #6ee7b7' : '1px solid #fcd34d',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Utensils size={12} />
                          {b.kitchen_order_placed ? 'PRE-ORDER SENT ✓' : 'PRE-ORDER ITEMS'}
                        </span>
                      )}
                    </div>

                    {/* Booking Status Pill */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                        background:
                          b.status === 'confirmed'
                            ? '#ecfdf5'
                            : b.status === 'completed'
                            ? '#e0f2fe'
                            : b.status === 'no-show'
                            ? '#fef3c7'
                            : '#fef2f2',
                        color:
                          b.status === 'confirmed'
                            ? '#047857'
                            : b.status === 'completed'
                            ? '#0369a1'
                            : b.status === 'no-show'
                            ? '#b45309'
                            : '#b91c1c',
                        border:
                          b.status === 'confirmed'
                            ? '1px solid #a7f3d0'
                            : b.status === 'completed'
                            ? '1px solid #bae6fd'
                            : b.status === 'no-show'
                            ? '1px solid #fde68a'
                            : '1px solid #fecaca',
                      }}
                    >
                      {b.status === 'confirmed' ? '● Waiting' : b.status === 'completed' ? '✓ Checked In' : b.status}
                    </span>
                  </div>

                  {/* Main Title & Guest Profile Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                        {b.user_name}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getActivityIcon(b.activity_id, 15)}
                        <span>{b.activity_name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPassModalBooking(b)}
                      title="Show QR Pass"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        borderRadius: '10px',
                        padding: '7px 11px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <QrCode size={15} color="#047857" /> QR Pass
                    </button>
                  </div>

                  {/* Clean 2x2 Key Info Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                        Date & Time
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {b.time} <span style={{ color: '#64748b', fontWeight: 600 }}>({b.date})</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                        Bay / Location
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0369a1', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.bay_assignment || meta.defaultBay}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                        Players
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {b.party_size || 2} {b.party_size === 1 ? 'Player' : 'Players'} ({b.duration || '60m'})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
                        Payment
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ color: '#0f172a' }}>{b.price || meta.defaultPrice}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: b.payment_status === 'pay_at_desk' ? '#fef3c7' : '#d1fae5',
                            color: b.payment_status === 'pay_at_desk' ? '#b45309' : '#065f46',
                            fontWeight: 900,
                          }}
                        >
                          {b.payment_status === 'pay_at_desk' ? 'PAY AT DESK' : 'PAID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Highlighted Pre-Order Food & Add-Ons Box on Card */}
                  {cardAddons.hasAnyAddons ? (
                    <div
                      style={{
                        background: b.kitchen_order_placed ? '#ecfdf5' : '#fffbeb',
                        border: b.kitchen_order_placed ? '1px solid #6ee7b7' : '1.5px solid #f59e0b',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          color: b.kitchen_order_placed ? '#065f46' : '#b45309',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Utensils size={14} />
                          {b.kitchen_order_placed ? '✓ Kitchen Order Sent' : '🚨 Pre-Ordered Items:'}
                        </span>
                        {!b.kitchen_order_placed && (
                          <button
                            type="button"
                            onClick={() => handleMarkKitchenOrdered(b)}
                            style={{
                              background: '#d97706',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Sent ✓
                          </button>
                        )}
                      </div>

                      {cardAddons.hasFoodPreOrders && (
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                          🍽️ <strong>Food/Drinks:</strong> {cardAddons.foodPreOrders.join(' • ')}
                        </div>
                      )}
                      {cardAddons.hasEquipmentAddons && (
                        <div style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 700 }}>
                          ⛳ <strong>Equipment:</strong> {cardAddons.equipmentAddons.join(' • ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    b.notes && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#334155',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontWeight: 600,
                        }}
                      >
                        <strong>Note:</strong> {b.notes}
                      </div>
                    )
                  )}

                  {/* Simple, Big Reception Action Controls */}
                  {b.status === 'confirmed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleCheckin(b)}
                          style={{
                            flex: 2,
                            minHeight: '46px',
                            background: 'linear-gradient(135deg, #047857, #10b981)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.22)',
                          }}
                        >
                          <CheckCheck size={18} /> Check In (+100 pts)
                        </button>

                        <button
                          onClick={() => setEditingBooking({ ...b })}
                          style={{
                            flex: 1,
                            minHeight: '46px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={15} /> Change Bay
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {b.payment_status === 'pay_at_desk' && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(b)}
                            style={{
                              flex: 1.5,
                              minHeight: '38px',
                              background: '#fffbeb',
                              border: '1px solid #f59e0b',
                              color: '#b45309',
                              borderRadius: '9px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <CreditCard size={14} /> Mark Paid ({b.price})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleNoShowBooking(b)}
                          style={{
                            flex: 1,
                            minHeight: '38px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#64748b',
                            borderRadius: '9px',
                            fontSize: '0.75rem',
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
                            minHeight: '38px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: '9px',
                            fontSize: '0.75rem',
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
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Edit3 size={14} /> Edit Booking
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBookingStatus(b.id, 'confirmed');
                          setMessage(`Re-opened booking ${b.booking_code} as Waiting to Arrive.`);
                          reloadBookings();
                        }}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Undo Check-In
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
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '14px',
          padding: '14px 16px',
          fontSize: '0.82rem',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          lineHeight: 1.4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={18} style={{ color: '#047857', flexShrink: 0 }} />
          <div>
            <strong>TrackMan Driving Range Bays:</strong> Connected to YourGolfBooking live bay sheet.
          </div>
        </div>
        <a
          href="https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#047857',
            fontWeight: 800,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Open Bay Sheet <ExternalLink size={14} />
        </a>
      </div>

      {/* Manual Walk-In / Reception Booking Modal (Clean Light Modal) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
          >
            <button
              onClick={() => setShowAddModal(false)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#f1f5f9',
                border: 'none',
                color: '#334155',
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

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
              <Plus size={20} style={{ color: '#047857', flexShrink: 0 }} /> Add Walk-In Booking
            </h3>

            <form onSubmit={handleCreateManualBooking}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Member</label>
                <select
                  className="form-input"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.member_id}) - {m.tier}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Activity</label>
                <select
                  className="form-input"
                  value={selectedActivity}
                  onChange={(e) => handleActivityChange(e.target.value)}
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
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Time</label>
                  <select
                    className="form-input"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Number of Players</label>
                  <select
                    className="form-input"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Player' : 'Players'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Payment Status</label>
                  <select
                    className="form-input"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                  >
                    <option value="paid">Already Paid</option>
                    <option value="pay_at_desk">Pay at Reception Desk</option>
                    <option value="comp">VIP Complimentary (Free)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assigned Bay / Tee / Lane</label>
                <select
                  className="form-input"
                  value={bayAssignment}
                  onChange={(e) => setBayAssignment(e.target.value)}
                >
                  {(BAY_OPTIONS_BY_ACTIVITY[selectedActivity] || ['Main Facility']).map((bay) => (
                    <option key={bay} value={bay}>{bay}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Notes or Equipment Extras (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electric Buggy Hire or Pre-Order Food"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', minHeight: '50px', fontWeight: 800 }}>
                Save Walk-In Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Reschedule / Assign Bay Modal */}
      {editingBooking && (
        <div className="modal-overlay" onClick={() => setEditingBooking(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
          >
            <button
              onClick={() => setEditingBooking(null)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#f1f5f9',
                border: 'none',
                color: '#334155',
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

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Edit Booking: {editingBooking.booking_code}
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#047857', fontWeight: 700, marginBottom: '14px' }}>
              {editingBooking.activity_name} • {editingBooking.user_name}
            </p>

            <form onSubmit={handleSaveEditBooking}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingBooking.date}
                    onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Time</label>
                  <select
                    className="form-input"
                    value={editingBooking.time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, time: e.target.value })}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Players</label>
                  <select
                    className="form-input"
                    value={editingBooking.party_size || 2}
                    onChange={(e) => setEditingBooking({ ...editingBooking, party_size: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Player' : 'Players'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Payment Status</label>
                  <select
                    className="form-input"
                    value={editingBooking.payment_status || 'paid'}
                    onChange={(e) => setEditingBooking({ ...editingBooking, payment_status: e.target.value as any })}
                  >
                    <option value="paid">Already Paid</option>
                    <option value="pay_at_desk">Pay at Reception Desk</option>
                    <option value="comp">VIP Complimentary</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assigned Bay / Tee / Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.bay_assignment || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, bay_assignment: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.notes || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', minHeight: '48px', fontWeight: 800 }}>
                Save Changes
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

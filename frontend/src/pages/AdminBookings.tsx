import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  CheckCircle, 
  Clock, 
  User, 
  Plus, 
  LogOut, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Tag, 
  CheckCheck, 
  Ban, 
  Activity, 
  Target, 
  Flag, 
  CircleDot 
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, User as MemberUser } from '../api';
import { 
  BookingItem, 
  getStoredBookings, 
  saveStoredBookings, 
  createBooking, 
  updateBookingStatus 
} from '../bookingsStore';

export function AdminBookings() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('All');
  const [message, setMessage] = useState('');

  // Manual New Booking Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('nine-holes');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('14:30');
  const [bookingNotes, setBookingNotes] = useState('');

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const reloadBookings = () => {
    setBookings(getStoredBookings());
  };

  useEffect(() => {
    reloadBookings();
    if (token) {
      adminApi.listMembers(token)
        .then((m) => {
          setMembers(m);
          if (m.length > 0) setSelectedMemberId(m[0].id);
        })
        .catch(() => setMembers([]));
    }
  }, [token]);

  const handleCheckin = async (booking: BookingItem) => {
    const updated = updateBookingStatus(booking.id, 'completed');
    if (updated) {
      // Award +100 PTS bonus to member for check-in if token available
      if (token && booking.user_id) {
        try {
          await adminApi.adjustPoints(token, booking.user_id, 100, `Reception check-in: ${booking.activity_name}`);
        } catch { /* ignore */ }
      }
      setMessage(`✅ Reception check-in completed for ${booking.user_name} (${booking.booking_code})! +100 PTS credited.`);
      reloadBookings();
    }
  };

  const handleCancelBooking = (booking: BookingItem) => {
    const updated = updateBookingStatus(booking.id, 'cancelled');
    if (updated) {
      setMessage(`Booking ${booking.booking_code} marked as cancelled.`);
      reloadBookings();
    }
  };

  const handleCreateManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === selectedMemberId) || {
      id: 'usr_member_1',
      name: 'Alex Morgan',
      member_id: 'PG-2445B5',
    };

    const activityNameMap: Record<string, string> = {
      'nine-holes': '9 Holes Course',
      'putt-crazy': 'Putt Crazy Adventure Minigolf',
      'darts-interactive': 'Darts Interactive',
      'golf-coaching': 'PGA Golf Coaching & Lesson',
      'club-fitting': 'Custom Club Fitting Session',
    };

    const newBk = createBooking({
      user_id: member.id,
      user_name: member.name,
      user_member_id: member.member_id,
      activity_id: selectedActivity,
      activity_name: activityNameMap[selectedActivity] || selectedActivity,
      date: selectedDate,
      time: selectedTime,
      notes: bookingNotes,
    });

    setMessage(`✅ Created booking ${newBk.booking_code} for ${newBk.user_name}!`);
    setShowAddModal(false);
    setBookingNotes('');
    reloadBookings();
  };

  const filteredBookings = bookings.filter((b) => {
    const q = query.toLowerCase();
    const matchesQuery = 
      b.user_name.toLowerCase().includes(q) ||
      b.user_member_id.toLowerCase().includes(q) ||
      b.booking_code.toLowerCase().includes(q) ||
      b.activity_name.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesActivity = activityFilter === 'All' || b.activity_id === activityFilter;

    return matchesQuery && matchesStatus && matchesActivity;
  });

  const totalCount = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  const getActivityIcon = (actId: string) => {
    switch (actId) {
      case 'nine-holes': return <Flag size={18} style={{ color: '#38bdf8' }} />;
      case 'putt-crazy': return <Sparkles size={18} style={{ color: '#fbbf24' }} />;
      case 'darts-interactive': return <CircleDot size={18} style={{ color: '#a78bfa' }} />;
      case 'golf-coaching': return <User size={18} style={{ color: '#34d399' }} />;
      case 'club-fitting': return <Activity size={18} style={{ color: '#f472b6' }} />;
      default: return <Calendar size={18} style={{ color: '#10b981' }} />;
    }
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 20px 40px 20px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ color: '#10b981' }} /> Member Bookings Terminal
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            View in-app reservations, check-in members at reception & handle schedule updates
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
          >
            <Plus size={16} /> New Booking
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '10px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Bookings</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{totalCount}</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>Confirmed</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{confirmedCount}</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Completed</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{completedCount}</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>Cancelled</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>{cancelledCount}</div>
        </div>
      </div>

      {/* Driving Range Partner Note Banner */}
      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.8rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Target size={20} style={{ color: '#10b981', flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#ffffff' }}>Note on Driving Range Bays:</strong> Range bays are reserved via our partner portal (YourGolfBooking). Below are in-app member bookings for Course, Minigolf, Darts & Coaching.
        </div>
      </div>

      {/* Search & Status Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by member, booking code (PG-BK...) or activity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: '40px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', marginBottom: 0 }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: statusFilter === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: statusFilter === st ? '#10b981' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredBookings.length === 0 ? (
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No bookings found matching your search criteria.
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: b.status === 'confirmed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getActivityIcon(b.activity_id)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {b.activity_name}
                    </h4>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {b.booking_code}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>{b.user_name}</span> ({b.user_member_id})
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {b.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a7f3d0' }}>
                      <Clock size={13} /> {b.time}
                    </span>
                    {b.notes && <span>&bull; {b.notes}</span>}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background:
                      b.status === 'confirmed'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : b.status === 'completed'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color:
                      b.status === 'confirmed'
                        ? '#10b981'
                        : b.status === 'completed'
                        ? '#38bdf8'
                        : '#f87171',
                    border:
                      b.status === 'confirmed'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : b.status === 'completed'
                        ? '1px solid rgba(56, 189, 248, 0.3)'
                        : '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {b.status}
                </span>

                {b.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => handleCheckin(b)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                      title="Check-in member at reception Desk"
                    >
                      <CheckCheck size={15} /> Check-in Reception
                    </button>

                    <button
                      onClick={() => handleCancelBooking(b)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <Ban size={14} /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual New Booking Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#ffffff', maxWidth: '440px' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus style={{ color: '#10b981' }} /> Create Manual Reception Booking
            </h3>

            <form onSubmit={handleCreateManualBooking}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Select Club Member</label>
                <select
                  className="form-input"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.member_id}) - {m.tier}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Activity Type</label>
                <select
                  className="form-input"
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <option value="nine-holes">9 Holes Championship Course</option>
                  <option value="putt-crazy">Putt Crazy Adventure Minigolf</option>
                  <option value="darts-interactive">Darts Interactive</option>
                  <option value="golf-coaching">PGA Golf Coaching & Lesson</option>
                  <option value="club-fitting">Custom Club Fitting Session</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#94a3b8' }}>Time Slot</label>
                  <select
                    className="form-input"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Staff Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. VIP guest booking at desk"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', height: '46px', background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 800 }}>
                Confirm & Add Booking
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

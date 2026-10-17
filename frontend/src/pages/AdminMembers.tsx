import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Award,
  Zap,
  ShieldAlert,
  CheckCircle2,
  QrCode,
  Calendar,
  ArrowUpDown,
  Download,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, User } from '../api';
import { getStoredBookings, BookingItem } from '../bookingsStore';
import { QRCodeSVG } from 'qrcode.react';

export function AdminMembers() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'Silver' | 'Gold' | 'Platinum'>('All');
  const [sortBy, setSortBy] = useState<'points_desc' | 'name_asc' | 'recent'>('points_desc');
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(100);
  const [reason, setReason] = useState('Manual staff loyalty credit');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setBookings(getStoredBookings());
    if (token) {
      adminApi
        .listMembers(token, query)
        .then(setMembers)
        .catch(() => setMembers([]))
        .finally(() => setLoading(false));
    }
  }, [token, query]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;
    try {
      const res = await adminApi.adjustPoints(token, selectedUser.id, adjustPoints, reason);
      setMessage(`✅ Adjusted points for ${selectedUser.name}! New Balance: ${res.new_points.toLocaleString()} PTS (${res.tier} Tier)`);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedUser.id ? { ...m, points: res.new_points, tier: res.tier as any } : m))
      );
      setSelectedUser(null);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to adjust points'}`);
    }
  };

  const handleQuickLogVisit = async (member: User) => {
    if (!token) return;
    try {
      const res = await adminApi.logVisit(token, member.member_id || member.id);
      setMessage(`✅ Logged visit for ${member.name} (+100 PTS). New Balance: ${res.new_points} PTS`);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, points: res.new_points } : m))
      );
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to log visit'}`);
    }
  };

  const handleToggleSuspend = (member: User) => {
    const nextSuspended = !member.suspended;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, suspended: nextSuspended } : m))
    );
    setMessage(
      nextSuspended
        ? `⚠️ Account suspended for ${member.name} (${member.member_id}).`
        : `✅ Account reactivated for ${member.name}.`
    );
  };

  const handleExportMembersCsv = () => {
    const rows = [
      ['Member ID', 'Name', 'Email', 'Tier', 'Points Balance', 'YTD Points', 'Status'],
      ...members.map((m) => [
        m.member_id,
        `"${m.name}"`,
        m.email,
        m.tier,
        String(m.points ?? 0),
        String(m.points_ytd ?? m.points ?? 0),
        m.suspended ? 'Suspended' : 'Active',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `playgolf_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage('📊 Member roster exported to CSV.');
  };

  const filteredMembers = members
    .filter((m) => (tierFilter === 'All' ? true : m.tier === tierFilter))
    .sort((a, b) => {
      if (sortBy === 'points_desc') return (b.points || 0) - (a.points || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPointsPool = members.reduce((acc, m) => acc + (m.points || 0), 0);

  return (
    <div className="admin-page-container" style={{ color: '#f8fafc', flex: 1 }}>
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.2, marginBottom: '6px' }}>
            <Users size={22} style={{ color: '#38bdf8', flexShrink: 0 }} /> Member Directory
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.45 }}>
            Look up any member by name, log a visit, or add bonus points.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportMembersCsv}
          style={{
            background: 'rgba(56, 189, 248, 0.14)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Download size={15} /> Download List (CSV)
        </button>
      </div>

      {message && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38bdf8',
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

      {/* Spacious 2-Column Summary Strip */}
      <div className="admin-two-col" style={{ marginBottom: '20px' }}>
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Total Members</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>{members.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Registered accounts</div>
        </div>
        <div style={{ background: '#111827', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>Total Member Points</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
            {totalPointsPool.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Combined balance</div>
        </div>
      </div>

      {/* Search & Tier Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email or Member ID (PG-...)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              paddingLeft: '40px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              marginBottom: 0,
              minHeight: '44px',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['All', 'Platinum', 'Gold', 'Silver'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: tierFilter === tier ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  background: tierFilter === tier ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                  color: tierFilter === tier ? '#10b981' : '#94a3b8',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {tier}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '5px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            <option value="points_desc">Sort: Highest Points</option>
            <option value="name_asc">Sort: Name (A–Z)</option>
            <option value="recent">Sort: Newest Joined</option>
          </select>
        </div>
      </div>

      {/* Member Cards List */}
      <div className="admin-cards-grid">
        {loading ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Loading member directory...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', background: 'rgba(15,23,42,0.85)', borderRadius: '16px' }}>
            No members found matching search.
          </div>
        ) : (
          filteredMembers.map((m) => {
            const memberBookingsCount = bookings.filter(
              (b) => b.user_id === m.id || b.user_member_id === m.member_id
            ).length;
            const tierColor =
              m.tier === 'Platinum' ? '#10b981' : m.tier === 'Gold' ? '#fbbf24' : '#94a3b8';

            return (
              <div
                key={m.id}
                style={{
                  padding: '14px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: m.suspended
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderLeft: `4px solid ${m.suspended ? '#ef4444' : tierColor}`,
                  borderRadius: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  opacity: m.suspended ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div
                    onClick={() => setInspectUser(m)}
                    style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: `${tierColor}22`,
                          color: tierColor,
                          border: `1px solid ${tierColor}44`,
                          textTransform: 'uppercase',
                        }}
                      >
                        {m.tier}
                      </span>
                      {m.suspended && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '2px 6px', borderRadius: '6px' }}>
                          SUSPENDED
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 700 }}>{m.member_id}</span> &bull; {m.email}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981', whiteSpace: 'nowrap' }}>
                      {(m.points ?? 0).toLocaleString()} PTS
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                      {memberBookingsCount} bookings
                    </div>
                  </div>
                </div>

                {/* Quick Action Bar */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogVisit(m)}
                    style={{
                      flex: 1,
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Zap size={13} /> +100 Check-In
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUser(m)}
                    style={{
                      flex: 1,
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Adjust Points
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectUser(m)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <QrCode size={13} /> Profile
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Member 360 Profile Inspector Modal */}
      {inspectUser && (
        <div className="modal-overlay" onClick={() => setInspectUser(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(56, 189, 248, 0.35)' }}
          >
            <button
              type="button"
              onClick={() => setInspectUser(null)}
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

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
              {inspectUser.name}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>
              {inspectUser.member_id} &bull; {inspectUser.email}
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(9,13,22,0.8)', padding: '12px', borderRadius: '14px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ background: '#ffffff', padding: '6px', borderRadius: '10px', flexShrink: 0 }}>
                <QRCodeSVG value={inspectUser.qr_token || inspectUser.member_id} size={74} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Current Balance
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981' }}>
                  {(inspectUser.points ?? 0).toLocaleString()} PTS
                </div>
                <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, marginTop: '2px' }}>
                  {inspectUser.tier} Tier &bull; YTD: {(inspectUser.points_ytd ?? inspectUser.points ?? 0).toLocaleString()} PTS
                </div>
              </div>
            </div>

            {/* Member's Recent Bookings */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '6px' }}>
                Member Bookings
              </div>
              {(() => {
                const userBks = bookings.filter(
                  (b) => b.user_id === inspectUser.id || b.user_member_id === inspectUser.member_id
                );
                if (userBks.length === 0) {
                  return (
                    <div style={{ fontSize: '0.76rem', color: '#64748b', padding: '10px', background: 'rgba(9,13,22,0.5)', borderRadius: '10px' }}>
                      No reservations recorded for this member.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {userBks.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        style={{
                          background: 'rgba(9,13,22,0.65)',
                          padding: '8px 10px',
                          borderRadius: '9px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#ffffff' }}>{b.activity_name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                            {b.date} @ {b.time} ({b.booking_code})
                          </div>
                        </div>
                        <span style={{ color: '#10b981', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  handleToggleSuspend(inspectUser);
                  setInspectUser(null);
                }}
                style={{
                  flex: 1,
                  minHeight: '42px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <ShieldAlert size={14} /> {inspectUser.suspended ? 'Reactivate' : 'Suspend'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const u = inspectUser;
                  setInspectUser(null);
                  setSelectedUser(u);
                }}
                className="btn-primary"
                style={{ flex: 1.4, minHeight: '42px', fontSize: '0.78rem' }}
              >
                Adjust Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Adjust Points: {selectedUser.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Current Balance: <strong style={{ color: '#10b981' }}>{selectedUser.points} PTS</strong> ({selectedUser.tier} Tier)
            </p>

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[50, 100, 250, -100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAdjustPoints(val)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: adjustPoints === val ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                    background: adjustPoints === val ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.7)',
                    color: val > 0 ? '#34d399' : '#f87171',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {val > 0 ? `+${val}` : val} PTS
                </button>
              ))}
            </div>

            <form onSubmit={handleAdjustPoints}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Points Delta (+ or -)</label>
                <input
                  type="number"
                  className="form-input"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  required
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Reason / Reference</label>
                <input
                  type="text"
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary"
                  style={{ background: 'transparent', color: '#94a3b8', borderColor: '#334155' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Save Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

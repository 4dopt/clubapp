import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Zap,
  ShieldAlert,
  QrCode,
  Download,
  X,
  ArrowLeft,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, User } from '../api';
import { getStoredBookings, BookingItem } from '../bookingsStore';
import { setMemberSuspendedInSupabase } from '../supabaseService';
import { sanitizeCsvCell } from '../utils/securityGuard';
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
  const [reason, setReason] = useState('Added by reception staff');
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
      setMessage(`✅ Updated points for ${selectedUser.name}! New Balance: ${res.new_points.toLocaleString()} PTS (${res.tier} Member)`);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedUser.id ? { ...m, points: res.new_points, tier: res.tier as any } : m))
      );
      setSelectedUser(null);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Could not update points'}`);
    }
  };

  const handleQuickLogVisit = async (member: User) => {
    if (!token) return;
    try {
      const res = await adminApi.logVisit(token, member.member_id || member.id);
      setMessage(`✅ Checked in ${member.name} (+100 Points). New Balance: ${res.new_points} PTS`);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, points: res.new_points } : m))
      );
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Could not check in member'}`);
    }
  };

  const handleToggleSuspend = async (member: User) => {
    const nextSuspended = !member.suspended;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, suspended: nextSuspended } : m))
    );
    await setMemberSuspendedInSupabase(member.id, nextSuspended);
    setMessage(
      nextSuspended
        ? `⚠️ Account paused in database for ${member.name} (${member.member_id}).`
        : `✅ Account re-activated in database for ${member.name}.`
    );
  };

  const handleExportMembersCsv = () => {
    const rows = [
      ['Member ID', 'Name', 'Email', 'Tier', 'Points Balance', 'Total Points Earned', 'Status'],
      ...members.map((m) => [
        sanitizeCsvCell(m.member_id),
        `"${sanitizeCsvCell(m.name).replace(/"/g, '""')}"`,
        sanitizeCsvCell(m.email),
        sanitizeCsvCell(m.tier),
        String(m.points ?? 0),
        String(m.points_ytd ?? m.points ?? 0),
        m.suspended ? 'Paused' : 'Active',
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
    setMessage('📊 Member list downloaded as CSV.');
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.2, marginBottom: '6px' }}>
            <Users size={24} style={{ color: '#047857', flexShrink: 0 }} /> Find a Member
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.45 }}>
            Search any member by name to check them in (+100 pts) or add bonus loyalty points.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportMembersCsv}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Download size={16} /> Download List (CSV)
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

      {/* Spacious 2-Column Summary Strip */}
      <div className="admin-two-col">
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800 }}>Total Club Members</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{members.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Registered in the app</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>Total Member Points</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
            {totalPointsPool.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Available to spend on rewards</div>
        </div>
      </div>

      {/* Search & Tier Filter Controls */}
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
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Type member's name, email, or Member ID (e.g. Alex or PG-...)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              paddingLeft: '42px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              marginBottom: 0,
              minHeight: '48px',
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['All', 'Platinum', 'Gold', 'Silver'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: tierFilter === tier ? '1.5px solid #047857' : '1px solid #cbd5e1',
                  background: tierFilter === tier ? '#ecfdf5' : '#f8fafc',
                  color: tierFilter === tier ? '#047857' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {tier === 'All' ? 'All Members' : `${tier} Tier`}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '7px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <option value="points_desc">Sort: Most Points</option>
            <option value="name_asc">Sort: Name (A–Z)</option>
            <option value="recent">Sort: Newest Joined</option>
          </select>
        </div>
      </div>

      {/* Member Cards List */}
      <div className="admin-cards-grid">
        {loading ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>
            Loading member list...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            No members found matching your search.
          </div>
        ) : (
          filteredMembers.map((m) => {
            const memberBookingsCount = bookings.filter(
              (b) => b.user_id === m.id || b.user_member_id === m.member_id
            ).length;
            const tierColor =
              m.tier === 'Platinum' ? '#047857' : m.tier === 'Gold' ? '#d97706' : '#475569';
            const tierBg =
              m.tier === 'Platinum' ? '#ecfdf5' : m.tier === 'Gold' ? '#fef3c7' : '#f1f5f9';

            return (
              <div
                key={m.id}
                style={{
                  padding: '18px',
                  background: '#ffffff',
                  border: m.suspended ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                  borderLeft: `5px solid ${m.suspended ? '#ef4444' : tierColor}`,
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  opacity: m.suspended ? 0.75 : 1,
                  boxShadow: 'var(--shadow-sm)',
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
                          fontSize: '1.08rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: tierBg,
                          color: tierColor,
                          textTransform: 'uppercase',
                        }}
                      >
                        {m.tier}
                      </span>
                      {m.suspended && (
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '6px' }}>
                          PAUSED
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 800 }}>{m.member_id}</span> • {m.email}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#047857', whiteSpace: 'nowrap' }}>
                      {(m.points ?? 0).toLocaleString()} PTS
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      {memberBookingsCount} {memberBookingsCount === 1 ? 'booking' : 'bookings'}
                    </div>
                  </div>
                </div>

                {/* Big Easy Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogVisit(m)}
                    style={{
                      flex: 1.3,
                      minHeight: '42px',
                      background: '#047857',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Zap size={15} /> Check In (+100)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUser(m)}
                    style={{
                      flex: 1,
                      minHeight: '42px',
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      color: '#0369a1',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <PlusCircle size={15} /> Add Points
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectUser(m)}
                    style={{
                      minHeight: '42px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <QrCode size={15} /> Card
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Member Card & Profile Modal (Clean Light Mode) */}
      {inspectUser && (
        <div className="modal-overlay" onClick={() => setInspectUser(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
          >
            <button
              type="button"
              onClick={() => setInspectUser(null)}
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

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
              {inspectUser.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Member ID: <strong>{inspectUser.member_id}</strong> • {inspectUser.email}
            </p>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ background: '#ffffff', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                <QRCodeSVG value={inspectUser.qr_token || inspectUser.member_id} size={80} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  Current Points Balance
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#047857' }}>
                  {(inspectUser.points ?? 0).toLocaleString()} PTS
                </div>
                <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 800, marginTop: '2px' }}>
                  {inspectUser.tier} Member
                </div>
              </div>
            </div>

            {/* Member's Recent Bookings */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Member's Bookings
              </div>
              {(() => {
                const userBks = bookings.filter(
                  (b) => b.user_id === inspectUser.id || b.user_member_id === inspectUser.member_id
                );
                if (userBks.length === 0) {
                  return (
                    <div style={{ fontSize: '0.84rem', color: '#64748b', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      No bookings recorded for this member yet.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userBks.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.activity_name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.76rem' }}>
                            {b.date} at {b.time} ({b.booking_code})
                          </div>
                        </div>
                        <span style={{ color: '#047857', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                          {b.status === 'completed' ? 'Checked In' : b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleToggleSuspend(inspectUser);
                  setInspectUser(null);
                }}
                style={{
                  flex: 1,
                  minHeight: '46px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={16} /> {inspectUser.suspended ? 'Reactivate Member' : 'Pause Account'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const u = inspectUser;
                  setInspectUser(null);
                  setSelectedUser(u);
                }}
                className="btn-primary"
                style={{ flex: 1.4, minHeight: '46px', fontSize: '0.88rem' }}
              >
                Add or Adjust Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal (Clean Light Mode) */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Add or Adjust Points: {selectedUser.name}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '16px' }}>
              Current Balance: <strong style={{ color: '#047857' }}>{selectedUser.points} PTS</strong> ({selectedUser.tier} Member)
            </p>

            {/* Quick Presets */}
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>
              Quick Tap Presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[50, 100, 250, -100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAdjustPoints(val)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: adjustPoints === val ? '2px solid #047857' : '1px solid #cbd5e1',
                    background: adjustPoints === val ? '#ecfdf5' : '#f8fafc',
                    color: val > 0 ? '#047857' : '#dc2626',
                    fontSize: '0.84rem',
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
                <label className="form-label">Points to Add (or use minus - to deduct)</label>
                <input
                  type="number"
                  className="form-input"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Short Note / Reason</label>
                <input
                  type="text"
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
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

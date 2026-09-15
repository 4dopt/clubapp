import React, { useEffect, useState } from 'react';
import { Users, Search, Award, Plus, Edit } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, User } from '../api';

export function AdminMembers() {
  const { token } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(100);
  const [reason, setReason] = useState('Manual staff adjustment');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      adminApi.listMembers(token, query)
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
      setMessage(`✅ Adjusted points! New Balance: ${res.new_points} PTS (${res.tier} Tier)`);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedUser.id ? { ...m, points: res.new_points, tier: res.tier as any } : m))
      );
      setSelectedUser(null);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to adjust points'}`);
    }
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 20px 40px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users style={{ color: '#38bdf8' }} /> Staff Member Roster & Points
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Search active members, credit rewards, and adjust loyalty points balance
        </p>
      </div>

      {message && (
        <div style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email or Member ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: '40px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
        />
      </div>

      {/* Member List */}
      <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading member directory...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No members found matching search.</div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.name}
                  <span className="tier-pill" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    {m.tier}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  ID: {m.member_id} &bull; {m.email}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                  {m.points} PTS
                </div>
                <button
                  onClick={() => setSelectedUser(m)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginTop: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Adjust Points
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Adjust Points Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '4px' }}>
              Adjust Points: {selectedUser.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              Current Balance: {selectedUser.points} PTS ({selectedUser.tier} Tier)
            </p>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setSelectedUser(null)} className="btn-secondary" style={{ background: 'transparent', color: '#94a3b8', borderColor: '#334155' }}>
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

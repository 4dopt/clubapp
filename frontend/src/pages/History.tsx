import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../auth';
import { api, Transaction } from '../api';

export function History() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.history(token)
        .then(setTransactions)
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HistoryIcon style={{ color: 'var(--brand-green)' }} /> Points & Visit History
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Detailed record of earned points and reward redemptions
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-grey)' }}>Loading activity log...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-grey)' }}>No transactions recorded yet.</div>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: t.type === 'earn' ? 'var(--brand-green-subtle)' : '#fef2f2',
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {t.type === 'earn' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', marginTop: '2px' }}>
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: t.type === 'earn' ? 'var(--brand-green)' : '#dc2626',
                  }}
                >
                  {t.type === 'earn' ? `+${t.points}` : `-${t.points}`} PTS
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--slate-grey)', textTransform: 'uppercase', marginTop: '2px', fontWeight: 700 }}>
                  {t.type === 'earn' ? 'EARNED' : 'REDEEMED'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

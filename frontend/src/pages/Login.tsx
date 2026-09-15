import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, ArrowRight, UserCheck } from 'lucide-react';
import { api, adminApi } from '../api';
import { useAuth } from '../auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'admin'>('request');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter an email address');
    setError('');
    setLoading(true);
    try {
      await api.requestOtp(email, name);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(email, otp, name);
      await signIn(res.token, res.user);
      if (res.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.login(adminPin);
      const adminUser = {
        id: 'usr_admin_jay',
        email: 'jay@gmail.com',
        name: 'Jay (Admin)',
        role: 'admin' as const,
        member_id: 'PG-000001',
        tier: 'Platinum' as const,
        points: 12500,
        points_ytd: 12500,
        qr_token: 'QR_ADMIN_JAY',
        created_at: '2026-01-01T00:00:00.000Z',
      };
      await signIn(res.admin_token, adminUser);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid Admin PIN');
    } finally {
      setLoading(false);
    }
  };

  const loginDemoMember = async () => {
    setLoading(true);
    try {
      const res = await api.verifyOtp('alex@example.com', '123456', 'Alex Morgan');
      await signIn(res.token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginDemoAdmin = async () => {
    setLoading(true);
    try {
      const res = await adminApi.login('123456');
      const adminUser = {
        id: 'usr_admin_jay',
        email: 'jay@gmail.com',
        name: 'Jay (Admin)',
        role: 'admin' as const,
        member_id: 'PG-000001',
        tier: 'Platinum' as const,
        points: 12500,
        points_ytd: 12500,
        qr_token: 'QR_ADMIN_JAY',
        created_at: '2026-01-01T00:00:00.000Z',
      };
      await signIn(res.admin_token, adminUser);
      navigate('/admin');
    } catch (err: any) {
      setError('Demo admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/playgolf-logo.png"
          alt="PlayGolf Northwick Park"
          style={{ width: '250px', height: 'auto', marginBottom: '16px' }}
        />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--brand-green-subtle)', color: 'var(--brand-green)', padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, border: '1px solid rgba(4, 120, 87, 0.2)' }}>
          <Sparkles size={13} /> MEMBER CLUB PORTAL
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>
          Digital membership pass, range rewards & bookings.
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestOtp}>
            <div className="form-group">
              <label className="form-label">Full Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Sending Code...' : <>Continue with Email <ArrowRight size={16} /></>}
            </button>

            <button
              type="button"
              onClick={() => setStep('admin')}
              style={{ background: 'none', border: 'none', color: 'var(--slate-grey)', fontSize: '0.8rem', width: '100%', marginTop: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}
            >
              <Shield size={14} /> Staff / Admin Login
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter the 6-digit verification code sent to <strong>{email}</strong> (Demo code: <strong>123456</strong>)
            </p>

            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Enter Club'}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              style={{ background: 'none', border: 'none', color: 'var(--slate-grey)', fontSize: '0.8rem', width: '100%', marginTop: '12px', cursor: 'pointer' }}
            >
              Change Email
            </button>
          </form>
        )}

        {step === 'admin' && (
          <form onSubmit={handleAdminPinLogin}>
            <div className="form-group">
              <label className="form-label">Admin Security PIN</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter PIN (Demo: 123456)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn-primary btn-gold" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In as Staff/Admin'}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              style={{ background: 'none', border: 'none', color: 'var(--slate-grey)', fontSize: '0.8rem', width: '100%', marginTop: '12px', cursor: 'pointer' }}
            >
              Back to Member Sign In
            </button>
          </form>
        )}
      </div>

      {/* Quick Demo Mode Buttons */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          Fast Demo One-Click Access
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={loginDemoMember}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '10px' }}
          >
            <UserCheck size={14} style={{ color: 'var(--brand-green)' }} /> Member Demo
          </button>

          <button
            onClick={loginDemoAdmin}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '10px', borderColor: '#fde68a', color: '#b45309', background: '#fffbeb' }}
          >
            <Shield size={14} /> Admin Demo
          </button>
        </div>
      </div>
    </div>
  );
}

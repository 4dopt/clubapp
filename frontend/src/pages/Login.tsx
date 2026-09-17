import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, ArrowRight, UserCheck, Lock, Mail, UserPlus, LogIn, Phone } from 'lucide-react';
import { api, adminApi, User as MemberUser } from '../api';
import { useAuth } from '../auth';
import { supabaseSignIn, supabaseSignUp } from '../supabaseService';

export function Login() {
  const [tab, setTab] = useState<'signin' | 'signup' | 'admin'>('signin');

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');

  // Admin PIN field
  const [adminPin, setAdminPin] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Supabase Real Sign In Handler
  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await supabaseSignIn(signInEmail, signInPassword);
      await signIn(res.session?.access_token || 'sb_token_' + res.user.id, res.user);
      if (res.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Supabase Real Sign Up Handler
  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!signUpEmail.trim() || !signUpPassword.trim() || !signUpName.trim()) {
      return setError('Please fill in all required fields');
    }

    if (signUpPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const res = await supabaseSignUp(signUpEmail, signUpPassword, signUpName, signUpPhone);
      await signIn('sb_token_' + res.profile.id, res.profile);
      setSuccessMsg(`Welcome to PlayGolf, ${res.profile.name}! Your Member ID is ${res.profile.member_id}. +250 Welcome Points added!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Staff / Admin PIN Login Handler
  const handleAdminPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await adminApi.login(adminPin);
      const adminUser: MemberUser = {
        id: 'usr_admin_jay',
        email: 'jay@gmail.com',
        name: 'Jay (Admin)',
        role: 'admin',
        member_id: 'PG-000001',
        tier: 'Platinum',
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

  return (
    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', maxWidth: '440px', margin: '0 auto' }}>
      {/* PlayGolf Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/playgolf-logo.png"
          alt="PlayGolf Northwick Park"
          style={{ width: '240px', height: 'auto', display: 'block', margin: '0 auto 12px auto' }}
        />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--brand-green-subtle)', color: 'var(--brand-green)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800 }}>
          <Sparkles size={14} /> Official Member Portal
        </div>
      </div>

      {/* Main Authentication Card */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
        {/* Auth Mode Tabs: Sign In / Sign Up / Admin */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '12px',
              border: 'none',
              background: tab === 'signin' ? '#ffffff' : 'transparent',
              color: tab === 'signin' ? 'var(--brand-green)' : 'var(--slate-grey)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'signin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => { setTab('signup'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '12px',
              border: 'none',
              background: tab === 'signup' ? '#ffffff' : 'transparent',
              color: tab === 'signup' ? 'var(--brand-green)' : 'var(--slate-grey)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'signup' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Sign Up
          </button>

          <button
            type="button"
            onClick={() => { setTab('admin'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: '12px',
              border: 'none',
              background: tab === 'admin' ? '#ffffff' : 'transparent',
              color: tab === 'admin' ? '#b45309' : 'var(--slate-grey)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'admin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Staff PIN
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '0.84rem', marginBottom: '16px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 14px', borderRadius: '12px', fontSize: '0.84rem', marginBottom: '16px', fontWeight: 700 }}>
            {successMsg}
          </div>
        )}

        {/* 1. REAL SUPABASE SIGN IN FORM */}
        {tab === 'signin' && (
          <form onSubmit={handleSupabaseSignIn}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="alex@example.com"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px', height: '48px', fontSize: '0.95rem' }}>
              {loading ? 'Signing In...' : <>Sign In <LogIn size={18} /></>}
            </button>
          </form>
        )}

        {/* 2. REAL SUPABASE SIGN UP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSupabaseSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Alex Morgan"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="alex@example.com"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+44 7700 900077"
                value={signUpPhone}
                onChange={(e) => setSignUpPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password (Min 6 characters)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Set secure password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px', height: '48px', fontSize: '0.95rem' }}>
              {loading ? 'Creating Account...' : <>Join PlayGolf Club <UserPlus size={18} /></>}
            </button>
          </form>
        )}

        {/* 3. STAFF / ADMIN PIN SIGN IN FORM */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminPinLogin}>
            <div className="form-group">
              <label className="form-label">Staff / Admin Security PIN</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter Staff Security PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn-primary btn-gold" disabled={loading} style={{ height: '48px', fontSize: '0.95rem' }}>
              {loading ? 'Authenticating...' : <>Access Admin Terminal <Shield size={18} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

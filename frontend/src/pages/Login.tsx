import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Calendar,
  Award,
  Gift,
  Target,
  Wifi,
} from 'lucide-react';
import { adminApi, User as MemberUser } from '../api';
import { useAuth } from '../auth';
import { supabase } from '../supabase';
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseResetPassword,
  supabaseUpdatePassword,
} from '../supabaseService';

export function Login() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);

  const [tab, setTab] = useState<'signin' | 'signup' | 'admin' | 'forgot' | 'recovery'>('signin');

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot / Recovery Password fields
  const [resetEmail, setResetEmail] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');

  // Admin PIN field
  const [adminPin, setAdminPin] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();

  // Detect Supabase PASSWORD_RECOVERY event if user clicked email reset link
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowOnboarding(false);
        setTab('recovery');
        setError('');
        setSuccessMsg('Enter your new password below to complete your password reset.');
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Redirect already authenticated users unless completing signup welcome or password recovery
  useEffect(() => {
    if (!authLoading && user && !successMsg && tab !== 'recovery') {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, successMsg, tab, navigate]);

  // 1. Supabase Real Sign In Handler
  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!signInEmail.trim() || !signInPassword) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await supabaseSignIn(signInEmail, signInPassword);
      const accessToken = res.session?.access_token || `sb_token_${res.user.id}`;
      await signIn(accessToken, res.user);
      if (res.user.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Supabase Real Sign Up Handler
  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setError('Please fill in your full name, email address, and password.');
      return;
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please double-check your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await supabaseSignUp(signUpEmail, signUpPassword, signUpName, signUpPhone);

      if (res.requiresEmailConfirmation) {
        setSuccessMsg(
          `Account created for ${res.profile.name} (Member ID: ${res.profile.member_id})! Please check your email inbox to confirm your email address, then sign in.`
        );
        setSignInEmail(signUpEmail.trim());
        setTab('signin');
        return;
      }

      const accessToken = res.session?.access_token || `sb_token_${res.profile.id}`;
      await signIn(accessToken, res.profile);
      setSuccessMsg(
        `Welcome to PlayGolf, ${res.profile.name}! Your Member ID is ${res.profile.member_id}. +250 Welcome Bonus Points added!`
      );
      setTimeout(() => {
        if (res.profile.role === 'admin') navigate('/admin', { replace: true });
        else navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Supabase Password Reset Request Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!resetEmail.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      await supabaseResetPassword(resetEmail);
      setSuccessMsg('Password reset instructions have been sent to your email address.');
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Supabase Password Recovery Update Handler
  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newRecoveryPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await supabaseUpdatePassword(newRecoveryPassword);
      setSuccessMsg('Your password has been updated! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Staff / Admin PIN Login Handler
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
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid Admin PIN');
    } finally {
      setLoading(false);
    }
  };

  const slides = [
    {
      badge: 'DIGITAL CLUB PASS',
      badgeColor: '#047857',
      badgeBg: '#ecfdf5',
      title: 'Your Digital Pass, Always Ready',
      description:
        'Carry your official PlayGolf membership card in your pocket. Scan your QR pass at the desk and unlock Green, Silver, Gold & Platinum tiers.',
      renderGfx: () => (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            borderRadius: '22px',
            background: 'linear-gradient(145deg, #06281e 0%, #047857 60%, #10b981 100%)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 16px 36px -8px rgba(4, 120, 87, 0.45)',
            overflow: 'hidden',
          }}
        >
          {/* Topographic decorative rings */}
          <div
            style={{
              position: 'absolute',
              right: '-40px',
              top: '-40px',
              width: '190px',
              height: '190px',
              borderRadius: '50%',
              border: '18px solid rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-30px',
              bottom: '-50px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '14px solid rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }}
          />

          {/* Mini 3D Card Mockup */}
          <div
            style={{
              background: 'linear-gradient(135deg, #07131e 0%, #0b2434 35%, #064e3b 78%, #059669 100%)',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1px solid rgba(110, 231, 183, 0.4)',
              boxShadow: '0 14px 28px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              zIndex: 2,
              transform: 'rotate(-2deg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '7px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <img src="/playgolf-logo.png" alt="PlayGolf" style={{ height: '18px', width: 'auto' }} />
              </div>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: '#fef9c3',
                  background: 'rgba(217, 119, 6, 0.35)',
                  border: '1px solid rgba(253, 224, 71, 0.5)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  letterSpacing: '0.08em',
                }}
              >
                ★ GOLD MEMBER
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '22px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #fef08a 0%, #eab308 55%, #ca8a04 100%)',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                />
                <Wifi size={15} color="rgba(255,255,255,0.8)" style={{ transform: 'rotate(90deg)' }} />
              </div>
              <div
                style={{
                  background: '#ffffff',
                  padding: '5px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                }}
              >
                <QrCode size={24} color="#0f172a" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '0.12em',
                  }}
                >
                  PG-204891
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                  ALEXANDER WRIGHT
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.55rem', color: '#6ee7b7', fontWeight: 800, display: 'block' }}>
                  LOYALTY BALANCE
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>1,450 PTS</span>
              </div>
            </div>
          </div>

          {/* Floating Welcome Bonus Pill */}
          <div
            style={{
              alignSelf: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#047857',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.73rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
              zIndex: 3,
            }}
          >
            <Sparkles size={14} color="#d97706" /> +250 Welcome Bonus Points on Sign Up
          </div>
        </div>
      ),
    },
    {
      badge: 'INSTANT BOOKING',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      title: 'Book Bays, Golf & Games in Seconds',
      description:
        'Reserve TrackMan driving range bays, 9-hole championship tee times, Putt Crazy minigolf, and interactive AR darts.',
      renderGfx: () => (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 16px 36px -8px rgba(2, 132, 199, 0.3)',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/promos/promo_range.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.75)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.92) 100%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.64rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Target size={12} /> TRACKMAN RANGE
            </span>
            <span
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.64rem',
                fontWeight: 800,
              }}
            >
              Instant Pass
            </span>
          </div>

          {/* Activity Grid Preview */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            {[
              { label: 'Driving Range', sub: 'TrackMan Bays', color: '#34d399' },
              { label: '9 Holes Course', sub: 'Tee Times', color: '#38bdf8' },
              { label: 'Putt Crazy', sub: '18-Hole Minigolf', color: '#fbbf24' },
              { label: 'Interactive Darts', sub: 'Smart AR Lanes', color: '#c084fc' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '12px',
                  padding: '9px 11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ffffff' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '0.63rem', color: '#cbd5e1', fontWeight: 600, paddingLeft: '12px' }}>
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      badge: 'EARN & LEVEL UP',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      title: 'Collect Points Every Time You Play',
      description:
        'Earn loyalty points on range balls, green fees, coaching, and cafe visits. Watch your tier climb from Green to Platinum VIP.',
      renderGfx: () => (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 16px 36px -8px rgba(217, 119, 6, 0.3)',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/promos/promo_trackman.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.7)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.94) 100%)',
            }}
          />

          {/* Floating Earn Badges */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                padding: '7px 12px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              }}
            >
              <span
                style={{
                  background: '#ecfdf5',
                  color: '#047857',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontWeight: 900,
                }}
              >
                +150 PTS
              </span>
              <span>100-Ball Range Session</span>
            </div>

            <div
              style={{
                alignSelf: 'flex-end',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                padding: '7px 12px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              }}
            >
              <span
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontWeight: 900,
                }}
              >
                2X BOOST
              </span>
              <span>Weekend Range Bonus</span>
            </div>
          </div>

          {/* Tier Progression Strip */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              background: 'rgba(15, 23, 42, 0.82)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: '14px',
              padding: '11px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, marginBottom: '6px' }}>
              <span style={{ color: '#34d399' }}>GREEN</span>
              <span style={{ color: '#cbd5e1' }}>SILVER</span>
              <span style={{ color: '#fde047' }}>GOLD</span>
              <span style={{ color: '#5eead4' }}>PLATINUM</span>
            </div>
            <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.12)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '74%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #fbbf24 65%, #14b8a6 100%)',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      badge: 'EXCLUSIVE REWARDS',
      badgeColor: '#047857',
      badgeBg: '#ecfdf5',
      title: 'Redeem Perks, Gear & Free Golf',
      description:
        'Exchange your points in one tap for complimentary range buckets, PGA coaching sessions, Pro Shop discounts, and clubhouse treats.',
      renderGfx: () => (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '220px',
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 16px 36px -8px rgba(4, 120, 87, 0.32)',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/promos/promo_proshop.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.72)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.93) 100%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.64rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Gift size={12} /> VIP REWARDS CATALOG
            </span>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { title: 'Free Large Range Bucket', pts: '300 PTS', tag: 'Range Perk' },
              { title: 'PGA Pro TrackMan Lesson', pts: '950 PTS', tag: 'Coaching' },
              { title: '20% Off Pro Shop Apparel', pts: '450 PTS', tag: 'Pro Shop' },
            ].map((r) => (
              <div
                key={r.title}
                style={{
                  background: 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '11px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff' }}>{r.title}</div>
                  <div style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 600 }}>{r.tag}</div>
                </div>
                <span
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    padding: '4px 9px',
                    borderRadius: '999px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -40 && slideIndex < slides.length - 1) {
      setSlideIndex((prev) => prev + 1);
    } else if (deltaX > 40 && slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    }
    touchStartX.current = null;
  };

  // Render Onboarding Explainer Slides before Login/Sign Up
  if (showOnboarding && tab !== 'recovery') {
    const currentSlide = slides[slideIndex];
    const isLastSlide = slideIndex === slides.length - 1;

    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          padding: 'calc(18px + env(safe-area-inset-top, 0px)) 18px calc(24px + env(safe-area-inset-bottom, 0px)) 18px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          justifyContent: 'space-between',
          maxWidth: '440px',
          width: '100%',
          margin: '0 auto',
          userSelect: 'none',
        }}
      >
        {/* Top Bar: Brand Logo + Skip Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img
            src="/playgolf-logo.png"
            alt="PlayGolf London"
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
          />
          <button
            type="button"
            onClick={() => setShowOnboarding(false)}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--slate-grey)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>

        {/* Center Slide Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '26px',
            padding: '18px',
            boxShadow: 'var(--shadow-lg)',
            margin: '16px 0',
          }}
        >
          {/* Slide Graphic */}
          {currentSlide.renderGfx()}

          {/* Slide Text Content */}
          <div style={{ textAlign: 'center', padding: '20px 6px 6px 6px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: currentSlide.badgeBg,
                color: currentSlide.badgeColor,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                marginBottom: '10px',
              }}
            >
              <Sparkles size={12} /> {currentSlide.badge}
            </div>

            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.22,
                marginBottom: '10px',
              }}
            >
              {currentSlide.title}
            </h1>

            <p
              style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {currentSlide.description}
            </p>
          </div>
        </div>

        {/* Bottom Controls: Pagination Dots + Primary CTA */}
        <div>
          {/* Progress Pill Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setSlideIndex(idx)}
                style={{
                  height: '8px',
                  width: slideIndex === idx ? '28px' : '8px',
                  borderRadius: '999px',
                  border: 'none',
                  background: slideIndex === idx ? 'var(--brand-green)' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {!isLastSlide ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {slideIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setSlideIndex((prev) => prev - 1)}
                  aria-label="Previous slide"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <ArrowLeft size={19} />
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSlideIndex((prev) => prev + 1)}
                style={{ height: '50px', fontSize: '0.95rem', flex: 1 }}
              >
                Next <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setTab('signin');
                  setShowOnboarding(false);
                }}
                style={{ height: '50px', fontSize: '0.95rem' }}
              >
                Continue to Sign In <LogIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setShowOnboarding(false);
                }}
                style={{
                  height: '46px',
                  borderRadius: '14px',
                  border: '1px solid rgba(4, 120, 87, 0.28)',
                  background: 'var(--brand-green-subtle)',
                  color: 'var(--brand-green)',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                New Member? Claim +250 Free Points <UserPlus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px)) 16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        justifyContent: 'space-between',
        maxWidth: '440px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* PlayGolf Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src="/playgolf-logo.png"
            alt="PlayGolf Northwick Park"
            style={{ width: '100%', maxWidth: '210px', height: 'auto', display: 'block', margin: '0 auto 10px auto' }}
          />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--brand-green-subtle)',
                color: 'var(--brand-green)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 800,
                border: '1px solid rgba(4, 120, 87, 0.2)',
              }}
            >
              <Sparkles size={13} /> Official Member Portal
            </div>
            <button
              type="button"
              onClick={() => {
                setSlideIndex(0);
                setShowOnboarding(true);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--slate-grey)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              How it works
            </button>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '22px',
            padding: '20px 18px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Auth Mode Tabs: Only Sign In / Sign Up shown to regular users */}
          {(tab === 'signin' || tab === 'signup') && (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-subtle)',
                padding: '4px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                marginBottom: '18px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  padding: '8px 6px',
                  borderRadius: '10px',
                  border: 'none',
                  background: tab === 'signin' ? '#ffffff' : 'transparent',
                  color: tab === 'signin' ? 'var(--brand-green)' : 'var(--slate-grey)',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: tab === 'signin' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  padding: '8px 6px',
                  borderRadius: '10px',
                  border: 'none',
                  background: tab === 'signup' ? '#ffffff' : 'transparent',
                  color: tab === 'signup' ? 'var(--brand-green)' : 'var(--slate-grey)',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: tab === 'signup' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 12px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              marginBottom: '16px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              marginBottom: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
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
                placeholder="you@example.com"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                  <Lock size={14} /> Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(signInEmail);
                    setTab('forgot');
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-green)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword((v) => !v)}
                  aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-grey)',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showSignInPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px', height: '48px', fontSize: '0.95rem' }}
            >
              {loading ? 'Signing In...' : <>Sign In <LogIn size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--slate-grey)' }}>
              New to PlayGolf Club?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-green)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '0.8rem',
                }}
              >
                Create Member Account
              </button>
            </div>
          </form>
        )}

        {/* 2. REAL SUPABASE SIGN UP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSupabaseSignUp}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={14} /> Full Name
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} /> Phone Number (Optional)
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="+44 7700 900077"
                value={signUpPhone}
                onChange={(e) => setSignUpPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password (Min 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a secure password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword((v) => !v)}
                  aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-grey)',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showSignUpPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={14} /> Confirm Password
              </label>
              <input
                type={showSignUpPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password"
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px', height: '48px', fontSize: '0.92rem' }}
            >
              {loading ? 'Creating Account...' : <>Join PlayGolf (+250 PTS) <UserPlus size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--slate-grey)' }}>
              Already have a member account?{' '}
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-green)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '0.8rem',
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-grey)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '4px 0',
                  marginBottom: '8px',
                }}
              >
                <ArrowLeft size={15} /> Back to Sign In
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Reset Your Password
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-grey)', marginTop: '4px', lineHeight: 1.4 }}>
                Enter your registered email address and we'll send you a password reset link.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '12px', height: '48px', fontSize: '0.95rem' }}
            >
              {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
            </button>
          </form>
        )}

        {/* 4. PASSWORD RECOVERY FORM */}
        {tab === 'recovery' && (
          <form onSubmit={handleUpdateRecoveredPassword}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Set New Password
            </h3>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> New Password (Min 6 characters)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={newRecoveryPassword}
                onChange={(e) => setNewRecoveryPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '12px', height: '48px', fontSize: '0.95rem' }}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* 5. STAFF / ADMIN PIN SIGN IN FORM */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminPinLogin}>
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-grey)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <ArrowLeft size={14} /> Back to Member Sign In
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Staff / Admin Security PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className="form-input"
                placeholder="Enter Staff Security PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.15rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-gold"
              disabled={loading}
              style={{ height: '48px', fontSize: '0.95rem' }}
            >
              {loading ? 'Authenticating...' : <>Access Admin Terminal <Shield size={18} /></>}
            </button>
          </form>
        )}
        </div>
      </div>

      {/* Subtle, faint Staff PIN link at the very bottom of the page */}
      {tab !== 'admin' && (
        <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setTab('admin');
              setError('');
              setSuccessMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 10px',
              letterSpacing: '0.03em',
              opacity: 0.65,
              transition: 'opacity 0.2s ease',
            }}
          >
            Staff PIN
          </button>
        </div>
      )}
    </div>
  );
}

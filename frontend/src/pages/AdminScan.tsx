import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, Camera, RefreshCw, KeyRound, Sparkles, AlertCircle, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi } from '../api';

// Web Audio API feedback chime for instant scan confirmation
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* web audio fallback */
  }
}

export function AdminScan() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannerKey, setScannerKey] = useState(0);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'camera' || scanResult) return;

    isProcessingRef.current = false;
    const scannerId = `qr-reader-${scannerKey}`;

    // Ensure DOM element exists before attaching scanner
    const timer = setTimeout(() => {
      const el = document.getElementById(scannerId);
      if (!el) return;

      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          /* verbose= */ false
        );

        scannerRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            if (!token || isProcessingRef.current) return;
            isProcessingRef.current = true;
            playSuccessChime();

            try {
              await scanner.clear();
            } catch {
              /* ignore clear errors */
            }

            await handleScannedQr(decodedText);
          },
          () => {
            /* silent frame scan errors */
          }
        );
      } catch (err) {
        console.warn('Scanner init warning:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          /* ignore */
        }
        scannerRef.current = null;
      }
    };
  }, [token, activeTab, scanResult, scannerKey]);

  // Robust QR Payload Normalizer
  const parseQrText = (raw: string): string => {
    let clean = (raw || '').trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1).trim();
    }
    // Handle JSON payloads (e.g. {"qr_token": "PG-123456"})
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        return parsed.qr_token || parsed.member_id || parsed.code || clean;
      } catch {
        /* fallback to raw */
      }
    }
    return clean;
  };

  const handleScannedQr = async (rawQrText: string) => {
    if (!token) return;
    const qrText = parseQrText(rawQrText);

    if (!qrText) {
      setError('Invalid or empty QR Code scanned.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Determine if member pass check-in OR reward fulfillment
      const isMemberPass =
        qrText.startsWith('QR_MEMBER_') ||
        qrText.startsWith('PG-') ||
        qrText.startsWith('QR_ADMIN_') ||
        qrText.includes('usr_') ||
        /^[A-Z0-9_-]{5,20}$/i.test(qrText);

      if (isMemberPass) {
        const res = await adminApi.logVisit(token, qrText);
        setScanResult({
          type: 'visit',
          title: 'Visit Check-In Confirmed',
          memberName: res.member_name || 'Member',
          memberId: res.member_id || qrText,
          newPoints: res.new_points,
          rawCode: qrText,
        });
      } else {
        const res = await adminApi.fulfillRewardQr(token, qrText);
        setScanResult({
          type: 'reward',
          title: 'Reward Pass Fulfilled!',
          memberName: res.member?.name || 'Member',
          memberId: res.member?.member_id || 'PG Member',
          rewardTitle: res.redemption?.reward_title || 'Reward Item',
          rawCode: qrText,
        });
      }
    } catch (err: any) {
      setError(err.message || 'QR Verification failed. Code not recognized.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playSuccessChime();
    handleScannedQr(manualCode);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setManualCode('');
    setScannerKey((prev) => prev + 1);
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 16px 40px 16px' }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              marginBottom: '10px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <Sparkles size={14} /> PLAYGOLF STAFF SCANNER
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Member Pass & Reward Verification
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            Scan digital member card for instant check-in (+100 PTS) or reward fulfillment
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            padding: '8px 14px',
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

      {/* Mode Switcher Tabs */}
      {!scanResult && (
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '20px',
            maxWidth: '400px',
            margin: '0 auto 20px auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'camera' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'camera' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Camera size={16} /> Live Camera Scan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'manual' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <KeyRound size={16} /> Manual Input / USB
          </button>
        </div>
      )}

      {/* RESULT VIEW */}
      {scanResult ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '24px',
            padding: '28px 20px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            maxWidth: '440px',
            margin: '0 auto',
          }}
        >
          <div style={{ color: '#10b981', display: 'inline-flex', marginBottom: '14px' }}>
            <CheckCircle size={64} />
          </div>

          <h3 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800, marginBottom: '6px' }}>
            {scanResult.title}
          </h3>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Member Details
            </div>
            <div style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>
              {scanResult.memberName}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6ee7b7', fontWeight: 700, marginTop: '2px' }}>
              ID: {scanResult.memberId}
            </div>
          </div>

          {scanResult.type === 'visit' ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '16px',
                borderRadius: '16px',
                color: '#10b981',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700 }}>Visit Reward Applied</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
                +100 PTS Credited
              </div>
              <div style={{ fontSize: '0.85rem', color: '#a7f3d0', marginTop: '4px' }}>
                New Balance: <strong>{scanResult.newPoints} PTS</strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '16px',
                borderRadius: '16px',
                color: '#34d399',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700 }}>Redemption Fulfilled</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px', color: '#ffffff' }}>
                {scanResult.rewardTitle}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={resetScanner}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
            }}
          >
            <RefreshCw size={18} /> Scan Next Member
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '14px 16px',
                borderRadius: '14px',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '24px',
                padding: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}
            >
              <div
                id={`qr-reader-${scannerKey}`}
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000000',
                }}
              />
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} className="text-emerald-500" /> Frame QR code within target square
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}
            >
              <form onSubmit={handleManualSubmit}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    marginBottom: '8px',
                  }}
                >
                  Member ID or QR Pass Token
                </label>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. PG-2445B5 or QR_MEMBER_..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '14px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setManualCode('PG-2445B5')}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Preset: Alex (PG-2445B5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode('PG-000001')}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Preset: Jay Admin (PG-000001)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background:
                      loading || !manualCode.trim()
                        ? 'rgba(51, 65, 85, 0.6)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading || !manualCode.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify Code & Check-in'} <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, Camera, RefreshCw, KeyRound, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi } from '../api';
import { getStoredBookings, updateBookingStatus } from '../bookingsStore';

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
  const { token, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannerKey, setScannerKey] = useState(0);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'camera' || scanResult) return;

    isProcessingRef.current = false;
    const scannerId = `qr-reader-${scannerKey}`;

    const timer = setTimeout(() => {
      const el = document.getElementById(scannerId);
      if (!el) return;

      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 15,
            qrbox: { width: 230, height: 230 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: 'environment',
            },
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

  const parseQrText = (raw: string): string => {
    let clean = (raw || '').trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1).trim();
    }
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        return parsed.qr_token || parsed.member_id || parsed.booking_code || parsed.code || clean;
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
      const upper = qrText.toUpperCase();

      // 1. Check if this is a Reward Redemption QR Pass
      const isRewardQr =
        upper.startsWith('QR_REDEEM_') ||
        upper.startsWith('QR_DEMO_') ||
        upper.startsWith('RW_') ||
        upper.startsWith('RED_') ||
        upper.includes('REDEEM') ||
        upper.includes('REWARD');

      // 2. Check if this is a Booking Reception Pass (PG-BK...)
      const isBookingPass = upper.startsWith('PG-BK');

      if (isRewardQr) {
        const res = await adminApi.fulfillRewardQr(token, qrText);
        setScanResult({
          type: 'reward',
          title: 'Reward Pass Fulfilled!',
          memberName: res.member?.name || 'Member',
          memberId: res.member?.member_id || 'PG Member',
          rewardTitle: res.redemption?.reward_title || 'Reward Item',
          rawCode: qrText,
        });
      } else if (isBookingPass) {
        const bookings = getStoredBookings();
        const foundBk = bookings.find((b) => b.booking_code.toUpperCase() === upper);
        if (foundBk) {
          updateBookingStatus(foundBk.id, 'completed');
          const res = await adminApi.logVisit(token, foundBk.user_member_id || foundBk.user_id);
          await refresh().catch(() => {});
          setScanResult({
            type: 'visit',
            title: `Booking Checked In: ${foundBk.activity_name}`,
            memberName: foundBk.user_name || res.member_name || 'Member',
            memberId: foundBk.user_member_id || res.member_id || qrText,
            newPoints: res.new_points,
            rawCode: qrText,
          });
        } else {
          const res = await adminApi.logVisit(token, qrText);
          await refresh().catch(() => {});
          setScanResult({
            type: 'visit',
            title: 'Reception Pass Checked In',
            memberName: res.member_name || 'Member',
            memberId: res.member_id || qrText,
            newPoints: res.new_points,
            rawCode: qrText,
          });
        }
      } else {
        // 3. Member Digital Card QR Pass (QR_MEMBER_..., PG-..., Member ID, etc.)
        const res = await adminApi.logVisit(token, qrText);
        await refresh().catch(() => {});
        setScanResult({
          type: 'visit',
          title: 'Visit Check-In Confirmed',
          memberName: res.member_name || 'Member',
          memberId: res.member_id || qrText,
          newPoints: res.new_points,
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
    <div style={{ background: '#090d16', color: '#f8fafc', flex: 1, padding: '16px 16px 28px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontWeight: 800,
            marginBottom: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <Sparkles size={12} /> PLAYGOLF STAFF SCANNER
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
          Pass & Reward Scanner
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
          Scan digital member card for instant check-in (+100 PTS) or reward fulfillment
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      {!scanResult && (
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '18px',
            gap: '4px',
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
              minHeight: '40px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'camera' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'camera' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Camera size={16} /> Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError('');
            }}
            style={{
              flex: 1,
              minHeight: '40px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'manual' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <KeyRound size={16} /> Manual / USB
          </button>
        </div>
      )}

      {/* RESULT VIEW */}
      {scanResult ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '22px',
            padding: '24px 18px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ color: '#10b981', display: 'inline-flex', marginBottom: '12px' }}>
            <CheckCircle size={56} />
          </div>

          <h3 style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: 800, marginBottom: '12px' }}>
            {scanResult.title}
          </h3>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px 16px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Member Details
            </div>
            <div style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>
              {scanResult.memberName}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
              ID: {scanResult.memberId}
            </div>
          </div>

          {scanResult.type === 'visit' ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '14px 16px',
                borderRadius: '16px',
                color: '#10b981',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 700 }}>Visit Reward Applied</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
                +100 PTS Credited
              </div>
              <div style={{ fontSize: '0.84rem', color: '#a7f3d0', marginTop: '4px' }}>
                New Balance: <strong>{scanResult.newPoints} PTS</strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '14px 16px',
                borderRadius: '16px',
                color: '#34d399',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 700 }}>Redemption Fulfilled</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: '#ffffff' }}>
                {scanResult.rewardTitle}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={resetScanner}
            className="btn-primary"
            style={{
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              fontWeight: 800,
              fontSize: '0.95rem',
            }}
          >
            <RefreshCw size={18} /> Scan Next Member
          </button>
        </div>
      ) : (
        <div>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                padding: '14px',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}
            >
              <div
                id={`qr-reader-${scannerKey}`}
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#000000',
                }}
              />
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={14} style={{ color: '#10b981' }} /> Frame QR code within target square
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                padding: '20px 16px',
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
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. PG-2445B5 or QR_MEMBER_..."
                    autoFocus
                    style={{
                      background: 'rgba(30, 41, 59, 0.85)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '18px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setManualCode('PG-2445B5')}
                    style={{
                      padding: '7px 10px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#34d399',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Member: Alex (PG-2445B5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode('PG-BK109283')}
                    style={{
                      padding: '7px 10px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Booking: PG-BK109283
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode('QR_REDEEM_8821A')}
                    style={{
                      padding: '7px 10px',
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '8px',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reward: QR_REDEEM_8821A
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="btn-primary"
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    background:
                      loading || !manualCode.trim()
                        ? 'rgba(51, 65, 85, 0.6)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: loading || !manualCode.trim() ? 'not-allowed' : 'pointer',
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

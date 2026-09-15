import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, Camera, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi } from '../api';

export function AdminScan() {
  const { token } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (!token) return;
        scanner.clear();
        await handleScannedQr(decodedText);
      },
      (errorMessage) => {
        // quiet background scanning frames
      }
    );

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch { /* ignore */ }
      }
    };
  }, [token]);

  const handleScannedQr = async (qrText: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (qrText.startsWith('QR_MEMBER_') || qrText.startsWith('PG-') || qrText.includes('usr_')) {
        const res = await adminApi.logVisit(token, qrText);
        setScanResult({
          type: 'visit',
          title: 'Visit Check-in Logged!',
          memberName: res.member_name,
          memberId: res.member_id,
          newPoints: res.new_points,
        });
      } else {
        const res = await adminApi.fulfillRewardQr(token, qrText);
        setScanResult({
          type: 'reward',
          title: 'Reward Fulfilled!',
          memberName: res.member?.name || 'Member',
          rewardTitle: res.redemption?.reward_title || 'Reward Item',
        });
      }
    } catch (err: any) {
      setError(err.message || 'QR Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    window.location.reload();
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 20px 40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <Camera size={14} /> LIVE CAMERA QR SCANNER
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
          Member Pass & Reward Verification
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
          Scan member pass for instant visit check-in (+100 PTS) or reward QR codes
        </p>
      </div>

      {scanResult ? (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '28px', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ color: '#10b981', display: 'inline-flex', marginBottom: '16px' }}>
            <CheckCircle size={60} />
          </div>

          <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '6px' }}>
            {scanResult.title}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6ee7b7', fontWeight: 800, marginBottom: '16px' }}>
            {scanResult.memberName} ({scanResult.memberId})
          </p>

          {scanResult.type === 'visit' ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '14px', color: '#10b981', fontSize: '0.95rem', fontWeight: 800, marginBottom: '24px' }}>
              Updated Member Points Balance: {scanResult.newPoints} PTS
            </div>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '14px', color: '#34d399', fontSize: '0.95rem', fontWeight: 800, marginBottom: '24px' }}>
              Fulfilled Item: {scanResult.rewardTitle}
            </div>
          )}

          <button onClick={resetScanner} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <RefreshCw size={18} /> Scan Next Member
          </button>
        </div>
      ) : (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '20px', padding: '20px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <div id="qr-reader" style={{ width: '100%', borderRadius: '14px', overflow: 'hidden' }} />
        </div>
      )}
    </div>
  );
}

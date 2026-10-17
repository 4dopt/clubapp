import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X, Smartphone, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../auth';

export function InstallPwaPrompt() {
  const { user } = useAuth();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    const dismissedAt = localStorage.getItem('playgolf_pwa_dismissed');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        return;
      }
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    setShowPrompt(true);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('playgolf_pwa_dismissed', Date.now().toString());
  };

  // Don't obstruct login screen or live QR camera scanner
  if (!showPrompt || !user || location.pathname === '/login' || location.pathname === '/admin/scan') {
    return null;
  }

  return (
    <>
      {/* Sleek Compact Floating Install Pill Banner */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          left: '12px',
          right: '12px',
          maxWidth: '456px',
          margin: '0 auto',
          zIndex: 45,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: '14px',
          padding: '10px 12px',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(52, 211, 153, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              flexShrink: 0,
            }}
          >
            <Smartphone size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h4
              style={{
                margin: 0,
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Add PlayGolf to Home Screen
            </h4>
            <p
              style={{
                margin: '1px 0 0',
                fontSize: '0.7rem',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              1-tap access to your digital member card
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleInstallClick}
            style={{
              padding: '7px 12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Download size={13} /> Install
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Guide Modal when clicked */}
      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '20px',
              padding: '22px 20px',
              maxWidth: '400px',
              width: '100%',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                <Info size={18} />
                <span>Add to Home Screen</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {isIos ? (
              <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <p style={{ marginTop: 0 }}>Follow these 2 quick steps in Safari on iOS:</p>
                <ol style={{ paddingLeft: '20px', margin: '12px 0' }}>
                  <li style={{ marginBottom: '8px' }}>
                    Tap the <strong>Share button</strong> <Share size={14} style={{ display: 'inline', color: '#38bdf8' }} /> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong>"Add to Home Screen"</strong> <CheckCircle size={14} style={{ display: 'inline', color: '#34d399' }} />.
                  </li>
                </ol>
              </div>
            ) : (
              <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <p style={{ marginTop: 0 }}>To add PlayGolf to your home screen/desktop:</p>
                <ul style={{ paddingLeft: '20px', margin: '12px 0', listStyleType: 'circle' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>On Android / Chrome:</strong> Tap the 3 dots (⋮) menu in top-right ➔ tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                  </li>
                  <li>
                    <strong>On Chrome / Edge Desktop:</strong> Click the <strong>Install icon (⊕)</strong> located on the right side of your browser address bar.
                  </li>
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              style={{
                marginTop: '14px',
                width: '100%',
                minHeight: '44px',
                padding: '10px',
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

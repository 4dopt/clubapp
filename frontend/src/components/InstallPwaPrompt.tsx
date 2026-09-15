import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, CheckCircle, Info } from 'lucide-react';

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('playgolf_pwa_dismissed');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        return; // Respect 24-hour dismissal
      }
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // ALWAYS show the prompt banner so user can see it!
    setShowPrompt(true);

    // Handle beforeinstallprompt for Chrome/Edge/Android/Desktop
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
      // Trigger native browser install prompt
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowGuideModal(true);
      }
    } else {
      // Show instruction modal if native prompt is not direct
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('playgolf_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          right: '16px',
          maxWidth: '440px',
          margin: '0 auto',
          zIndex: 9990,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1.5px solid rgba(52, 211, 153, 0.4)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(52, 211, 153, 0.2)',
          color: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(52, 211, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                flexShrink: 0,
              }}
            >
              <Smartphone size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Add PlayGolf to Home Screen
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.3' }}>
                Instant 1-tap access to your digital membership & rewards card!
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginTop: '14px' }}>
          <button
            onClick={handleInstallClick}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Download size={16} /> Add App to Home Screen
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
                <Info size={20} />
                <span>How to Add to Home Screen</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {isIos ? (
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
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
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
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
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontWeight: 600,
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

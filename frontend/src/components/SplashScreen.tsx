import React, { useEffect, useState } from 'react';

interface Props {
  onFinish?: () => void;
  minimumDurationMs?: number;
}

export function SplashScreen({ onFinish, minimumDurationMs = 1200 }: Props) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const hideTimer = setTimeout(() => {
        setHidden(true);
        if (onFinish) onFinish();
      }, 400); // match transition duration
      return () => clearTimeout(hideTimer);
    }, minimumDurationMs);

    return () => clearTimeout(timer);
  }, [minimumDurationMs, onFinish]);

  if (hidden) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '280px' }}>
        <img
          src="/playgolf-logo.png"
          alt="PlayGolf Northwick Park"
          style={{
            width: '100%',
            maxWidth: '260px',
            height: 'auto',
            marginBottom: '28px',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.05))',
          }}
        />

        {/* Elegant Green Loading Bar */}
        <div
          style={{
            width: '180px',
            height: '4px',
            background: 'var(--border-color)',
            borderRadius: '2px',
            margin: '0 auto 16px auto',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '50%',
              background: 'linear-gradient(90deg, #F26522, var(--brand-green))',
              borderRadius: '2px',
              animation: 'splashLoading 1.2s infinite ease-in-out',
            }}
          />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', fontWeight: 600, letterSpacing: '0.05em' }}>
          LOADING MEMBER CLUB
        </p>
      </div>

      <style>{`
        @keyframes splashLoading {
          0% { left: -50%; width: 30%; }
          50% { left: 25%; width: 60%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>
    </div>
  );
}

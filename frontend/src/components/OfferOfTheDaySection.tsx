import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  Calendar,
  Clock,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  X,
  Ticket,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useAuth } from '../auth';
import {
  DailyOffer,
  DailyOfferClaim,
  DayOfWeekKey,
  getDailyOffers,
  getCurrentDayOffer,
  getUserClaimForToday,
  claimDailyOfferPass,
  buildDailyOfferQrPayload,
} from '../dailyOffersStore';

export function OfferOfTheDaySection() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<DailyOffer[]>(() => getDailyOffers());
  const todayOffer = getCurrentDayOffer(offers);

  const [selectedDayKey, setSelectedDayKey] = useState<DayOfWeekKey>(() => todayOffer.dayKey);
  const [activeClaimModal, setActiveClaimModal] = useState<{
    claim: DailyOfferClaim;
    offer: DailyOffer;
  } | null>(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    const syncOffers = () => {
      const updated = getDailyOffers();
      setOffers(updated);
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener('playgolf-daily-offers-updated', syncOffers);
    window.addEventListener('storage', syncOffers);
    return () => {
      window.removeEventListener('playgolf-daily-offers-updated', syncOffers);
      window.removeEventListener('storage', syncOffers);
    };
  }, []);

  if (!user) return null;

  const selectedOffer = offers.find((o) => o.dayKey === selectedDayKey) || todayOffer;
  const isTodaySelected = selectedOffer.dayKey === todayOffer.dayKey;
  const existingClaim = getUserClaimForToday(user.id, selectedOffer.dayKey);

  const handleClaimOrOpenPass = (offer: DailyOffer) => {
    const claim = claimDailyOfferPass(offer, user);
    setRefreshTick((t) => t + 1);
    setActiveClaimModal({ claim, offer });
  };

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  return (
    <div style={{ margin: '6px 0 18px 0' }}>
      {/* Section Header */}
      <div
        style={{
          padding: '0 16px 10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '8px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#d97706',
                textTransform: 'uppercase',
              }}
            >
              DAILY CLUB SPOTLIGHT
            </span>
          </div>
          <h3
            style={{
              fontSize: '1.08rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Offer of the Day
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowWeeklyModal(true)}
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Calendar size={13} /> Weekly Lineup
        </button>
      </div>

      {/* Mon–Sun Interactive Day Selector Strip */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '0 16px 10px 16px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {offers.map((item) => {
          const isToday = item.dayKey === todayOffer.dayKey;
          const isSelected = item.dayKey === selectedOffer.dayKey;
          return (
            <button
              key={item.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(item.dayKey)}
              style={{
                flex: '1 0 auto',
                minWidth: '52px',
                padding: '7px 10px',
                borderRadius: '12px',
                border: isSelected
                  ? '1.5px solid var(--brand-green)'
                  : isToday
                  ? '1px solid #fcd34d'
                  : '1px solid var(--border-color)',
                background: isSelected
                  ? 'var(--brand-green)'
                  : isToday
                  ? '#fffbeb'
                  : '#ffffff',
                color: isSelected
                  ? '#ffffff'
                  : isToday
                  ? '#b45309'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(4, 120, 87, 0.25)'
                  : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  opacity: isSelected ? 0.92 : 0.75,
                }}
              >
                {isToday ? 'TODAY' : item.shortDay}
              </span>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                }}
              >
                {item.shortDay}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Offer of the Day Hero Card */}
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '22px',
            overflow: 'hidden',
            background: '#0f172a',
            boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.26)',
            border: isTodaySelected
              ? '1.5px solid rgba(16, 185, 129, 0.45)'
              : '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Background Image */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${selectedOffer.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.82) contrast(1.06)',
            }}
          />

          {/* Dark Readability Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.78) 45%, rgba(15, 23, 42, 0.97) 100%)',
            }}
          />

          {/* Top Bar: Day Status + Time Window */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '14px 16px 8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: selectedOffer.badgeGradient,
                padding: '5px 11px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.28)',
              }}
            >
              <Sparkles size={13} color="#ffffff" />
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                }}
              >
                {isTodaySelected
                  ? `TODAY'S OFFER • ${selectedOffer.dayName.toUpperCase()}`
                  : `${selectedOffer.dayName.toUpperCase()} OFFER`}
              </span>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#f8fafc',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={11} style={{ color: '#fbbf24' }} />
              {selectedOffer.timeWindow}
            </div>
          </div>

          {/* Card Content Body */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '12px 16px 16px 16px',
            }}
          >
            {/* Deal Badge + Promo Code Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  background: 'rgba(251, 191, 36, 0.22)',
                  color: '#fde68a',
                  border: '1px solid rgba(251, 191, 36, 0.45)',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                🔥 {selectedOffer.dealBadge}
              </span>

              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                CODE: {selectedOffer.promoCode}
              </span>
            </div>

            <h4
              style={{
                fontSize: '1.18rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 4px 0',
                lineHeight: 1.25,
                textShadow: '0 2px 4px rgba(0,0,0,0.45)',
              }}
            >
              {selectedOffer.title}
            </h4>

            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#34d399',
                marginBottom: '6px',
              }}
            >
              {selectedOffer.subtitle}
            </div>

            <p
              style={{
                fontSize: '0.78rem',
                color: '#cbd5e1',
                lineHeight: 1.45,
                margin: '0 0 14px 0',
              }}
            >
              {selectedOffer.description}
            </p>

            {/* Action Buttons Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.35fr 1fr',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => handleClaimOrOpenPass(selectedOffer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: existingClaim
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff',
                  padding: '11px 12px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: '1px solid rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                <QrCode size={15} />
                <span>
                  {existingClaim
                    ? 'Show Offer Pass'
                    : isTodaySelected
                    ? 'Claim Today’s Pass'
                    : `Get ${selectedOffer.shortDay} Pass`}
                </span>
              </button>

              <Link
                to={selectedOffer.bookingPath}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  padding: '11px 12px',
                  borderRadius: '12px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{selectedOffer.bookingLabel}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY OFFER QR PASS MODAL */}
      {activeClaimModal && (
        <div
          className="modal-overlay"
          onClick={() => setActiveClaimModal(null)}
          style={{ zIndex: 1150 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              textAlign: 'center',
              maxWidth: '410px',
              borderRadius: '24px',
              padding: '22px 18px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveClaimModal(null)}
              aria-label="Close Offer Pass"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'var(--bg-subtle)',
                border: 'none',
                color: 'var(--slate-dark)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#b45309',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: 800,
                marginBottom: '8px',
              }}
            >
              <Ticket size={14} /> {activeClaimModal.offer.dayName.toUpperCase()} OFFER PASS
            </div>

            <h3
              style={{
                fontSize: '1.16rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '4px',
                padding: '0 20px',
              }}
            >
              {activeClaimModal.offer.title}
            </h3>

            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--brand-green)',
                marginBottom: '12px',
              }}
            >
              {activeClaimModal.offer.dealBadge} &bull; {activeClaimModal.offer.timeWindow}
            </div>

            {/* Scannable QR Code */}
            <div
              style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                marginBottom: '12px',
              }}
            >
              <QRCodeSVG
                value={buildDailyOfferQrPayload(activeClaimModal.claim)}
                size={180}
                level="L"
                marginSize={1}
                bgColor="#ffffff"
                fgColor="#090d16"
              />
            </div>

            {/* Pass Token & Promo Code Box */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '14px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                  Member
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {user.name} ({user.member_id})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                  Reception Pass Code
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: 'var(--brand-green)',
                  }}
                >
                  {activeClaimModal.claim.pass_code}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontSize: '0.74rem', color: 'var(--slate-grey)', fontWeight: 600 }}>
                  Promo Code
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPromo(activeClaimModal.offer.promoCode)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: '#b45309',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <Tag size={12} />
                  {activeClaimModal.offer.promoCode}
                  {copiedPromo ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--brand-green)',
                fontSize: '0.76rem',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              <ShieldCheck size={15} /> Show at Reception Desk to Redeem
            </div>

            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--slate-grey)',
                margin: '0 0 14px 0',
                lineHeight: 1.4,
              }}
            >
              {activeClaimModal.offer.terms}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                to={activeClaimModal.offer.bookingPath}
                onClick={() => setActiveClaimModal(null)}
                className="btn-primary"
                style={{
                  flex: 1,
                  height: '44px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {activeClaimModal.offer.bookingLabel} <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setActiveClaimModal(null)}
                className="btn-secondary"
                style={{ width: 'auto', padding: '0 16px', height: '44px', fontWeight: 700 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL WEEKLY SCHEDULE MODAL (MON–SUN LINEUP) */}
      {showWeeklyModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWeeklyModal(false)}
          style={{ zIndex: 1150 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '430px',
              borderRadius: '24px',
              padding: '22px 16px',
              maxHeight: '86vh',
              overflowY: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setShowWeeklyModal(false)}
              aria-label="Close Weekly Lineup"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'var(--bg-subtle)',
                border: 'none',
                color: 'var(--slate-dark)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '14px', paddingRight: '32px' }}>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: 'var(--brand-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '2px',
                }}
              >
                PLAYGOLF WEEKLY LINEUP
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Daily Offers (Mon – Sun)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                A different member perk every day of the week. Tap any day to view or claim.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offers.map((item) => {
                const isToday = item.dayKey === todayOffer.dayKey;
                const claimedToday = getUserClaimForToday(user.id, item.dayKey);

                return (
                  <div
                    key={item.dayKey}
                    onClick={() => {
                      setSelectedDayKey(item.dayKey);
                      setShowWeeklyModal(false);
                    }}
                    style={{
                      background: isToday ? 'var(--brand-green-subtle)' : '#ffffff',
                      border: isToday
                        ? '1.5px solid var(--brand-green)'
                        : '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '3px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: isToday ? 'var(--brand-green)' : 'var(--bg-subtle)',
                            color: isToday ? '#ffffff' : 'var(--slate-dark)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isToday ? `TODAY • ${item.dayName}` : item.dayName}
                        </span>

                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            color: '#b45309',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}
                        >
                          {item.dealBadge}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          lineHeight: 1.25,
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Clock size={11} /> {item.timeWindow}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayKey(item.dayKey);
                        setShowWeeklyModal(false);
                        handleClaimOrOpenPass(item);
                      }}
                      style={{
                        background: claimedToday ? '#fffbeb' : 'var(--brand-green)',
                        color: claimedToday ? '#b45309' : '#ffffff',
                        border: claimedToday ? '1px solid #fcd34d' : 'none',
                        borderRadius: '10px',
                        padding: '8px 11px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {claimedToday ? <CheckCircle2 size={13} /> : <QrCode size={13} />}
                      {claimedToday ? 'Pass' : 'Claim'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

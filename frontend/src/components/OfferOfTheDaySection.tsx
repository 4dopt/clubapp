import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
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

  // Find index of today's offer (0..6)
  const todayIndex = Math.max(
    0,
    offers.findIndex((o) => o.dayKey === todayOffer.dayKey)
  );

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(todayIndex);
  const sliderRef = useRef<HTMLDivElement>(null);
  const daysStripRef = useRef<HTMLDivElement>(null);

  const [activeClaimModal, setActiveClaimModal] = useState<{
    claim: DailyOfferClaim;
    offer: DailyOffer;
  } | null>(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
  const [, setRefreshTick] = useState(0);

  // Listen for offer updates or cross-tab changes
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

  // Initial scroll to today's offer slide
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSlide(todayIndex, 'auto');
    }, 80);
    return () => clearTimeout(timer);
  }, [todayIndex]);

  if (!user) return null;

  const currentSlideOffer = offers[activeSlideIndex] || todayOffer;
  const isTodayActive = currentSlideOffer.dayKey === todayOffer.dayKey;

  const scrollToSlide = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!sliderRef.current) return;
    const cards = sliderRef.current.children;
    if (cards[index]) {
      const targetCard = cards[index] as HTMLElement;
      sliderRef.current.scrollTo({
        left: targetCard.offsetLeft - 16,
        behavior,
      });
      setActiveSlideIndex(index);
    }
  };

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const scrollLeft = sliderRef.current.scrollLeft;
    const firstCard = sliderRef.current.children[0] as HTMLElement | undefined;
    if (!firstCard) return;

    const cardWidth = firstCard.offsetWidth + 12; // card width + gap
    const index = Math.round(scrollLeft / cardWidth);
    const clamped = Math.min(offers.length - 1, Math.max(0, index));
    if (clamped !== activeSlideIndex) {
      setActiveSlideIndex(clamped);
      // Auto-scroll the day strip pill into view
      if (daysStripRef.current && daysStripRef.current.children[clamped]) {
        const pill = daysStripRef.current.children[clamped] as HTMLElement;
        daysStripRef.current.scrollTo({
          left: pill.offsetLeft - 32,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleClaimOrOpenPass = (offer: DailyOffer) => {
    const claim = claimDailyOfferPass(offer, user);
    setRefreshTick((t) => t + 1);
    setActiveClaimModal({ claim, offer });
  };

  const handleCopyPromo = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedPromo(code);
    setTimeout(() => setCopiedPromo(null), 2000);
  };

  return (
    <div style={{ margin: '8px 0 20px 0' }}>
      {/* SECTION HEADER: Title, Live Indicator, Navigation Controls */}
      <div
        style={{
          padding: '0 16px 10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f59e0b',
                boxShadow: '0 0 10px #f59e0b',
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
            <span
              style={{
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '999px',
                border: '1px solid #fde68a',
              }}
            >
              {activeSlideIndex + 1} / {offers.length}
            </span>
          </div>
          <h3
            style={{
              fontSize: '1.12rem',
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

        {/* Carousel Prev/Next & Weekly Lineup Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => scrollToSlide(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex === 0}
              aria-label="Previous day offer slide"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: activeSlideIndex === 0 ? '#cbd5e1' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: activeSlideIndex === 0 ? 'default' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollToSlide(Math.min(offers.length - 1, activeSlideIndex + 1))}
              disabled={activeSlideIndex === offers.length - 1}
              aria-label="Next day offer slide"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: activeSlideIndex === offers.length - 1 ? '#cbd5e1' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: activeSlideIndex === offers.length - 1 ? 'default' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowWeeklyModal(true)}
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#b45309',
              padding: '6px 11px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Calendar size={13} /> Lineup
          </button>
        </div>
      </div>

      {/* MON–SUN INTERACTIVE DAY SELECTOR STRIP */}
      <div
        ref={daysStripRef}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '0 16px 12px 16px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {offers.map((item, index) => {
          const isToday = item.dayKey === todayOffer.dayKey;
          const isActive = index === activeSlideIndex;
          const claimed = getUserClaimForToday(user.id, item.dayKey);

          return (
            <button
              key={item.dayKey}
              type="button"
              onClick={() => scrollToSlide(index)}
              style={{
                flex: '1 0 auto',
                minWidth: '56px',
                padding: '7px 8px',
                borderRadius: '14px',
                border: isActive
                  ? '1.5px solid var(--brand-green)'
                  : isToday
                  ? '1.5px solid #f59e0b'
                  : '1px solid var(--border-color)',
                background: isActive
                  ? 'var(--brand-green)'
                  : isToday
                  ? '#fffbeb'
                  : '#ffffff',
                color: isActive
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
                boxShadow: isActive
                  ? '0 6px 16px rgba(4, 120, 87, 0.28)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {isToday && (
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isActive ? '#fde68a' : '#f59e0b',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    opacity: isActive ? 0.95 : 0.8,
                  }}
                >
                  {isToday ? 'TODAY' : item.shortDay}
                </span>
                {claimed && (
                  <span
                    style={{
                      color: isActive ? '#a7f3d0' : '#059669',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {item.shortDay}
              </span>
            </button>
          );
        })}
      </div>

      {/* HORIZONTAL SWIPEABLE SLIDE CAROUSEL */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: '2px 16px 6px 16px',
        }}
      >
        {offers.map((offer, index) => {
          const isToday = offer.dayKey === todayOffer.dayKey;
          const isSlideActive = index === activeSlideIndex;
          const existingClaim = getUserClaimForToday(user.id, offer.dayKey);

          return (
            <div
              key={offer.dayKey}
              style={{
                flex: '0 0 calc(100% - 16px)',
                maxWidth: '430px',
                scrollSnapAlign: 'center',
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#090d16',
                boxShadow: isSlideActive
                  ? '0 16px 36px -10px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12)'
                  : '0 8px 24px -8px rgba(15, 23, 42, 0.2)',
                border: isToday
                  ? '1.5px solid rgba(16, 185, 129, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.14)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
            >
              {/* Background Cover Image with cinematic lighting */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${offer.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'brightness(0.85) contrast(1.08)',
                  transform: isSlideActive ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.4s ease',
                }}
              />

              {/* Multi-Stop Gradient Scrim for Perfect Typography Contrast */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(9, 13, 22, 0.3) 0%, rgba(9, 13, 22, 0.62) 42%, rgba(9, 13, 22, 0.98) 96%)',
                }}
              />

              {/* TOP BAR: Day Tag + Time Window */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '14px 16px 8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    background: isToday
                      ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
                      : offer.badgeGradient,
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {isToday ? (
                    <Flame size={13} color="#fef08a" />
                  ) : (
                    <Sparkles size={13} color="#ffffff" />
                  )}
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isToday
                      ? `TODAY'S SPECIAL • ${offer.dayName.toUpperCase()}`
                      : `${offer.dayName.toUpperCase()} PERK`}
                  </span>
                </div>

                <div
                  style={{
                    background: 'rgba(9, 13, 22, 0.72)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  <Clock size={11} style={{ color: '#fbbf24' }} />
                  {offer.timeWindow}
                </div>
              </div>

              {/* CARD BODY: Deal Sticker, Titles, Benefits, and Action CTAs */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '12px 16px 16px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Deal Tag + 1-Tap Copy Promo Code */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(251, 191, 36, 0.24)',
                      color: '#fef08a',
                      border: '1px solid rgba(251, 191, 36, 0.55)',
                      padding: '3px 9px',
                      borderRadius: '8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Zap size={11} /> {offer.dealBadge}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleCopyPromo(offer.promoCode, e)}
                    title="Click to copy promo code"
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(6px)',
                      color: '#f1f5f9',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      padding: '3px 9px',
                      borderRadius: '8px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>CODE: {offer.promoCode}</span>
                    {copiedPromo === offer.promoCode ? (
                      <Check size={11} color="#34d399" />
                    ) : (
                      <Copy size={11} opacity={0.7} />
                    )}
                  </button>
                </div>

                {/* Offer Title & Subtitle */}
                <div>
                  <h4
                    style={{
                      fontSize: '1.24rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      margin: '0 0 3px 0',
                      lineHeight: 1.25,
                      textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    }}
                  >
                    {offer.title}
                  </h4>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isToday ? '#34d399' : '#38bdf8',
                      marginBottom: '4px',
                    }}
                  >
                    {offer.subtitle}
                  </div>

                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {offer.description}
                  </p>
                </div>

                {/* Micro Perks Tag Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.68rem',
                    color: '#94a3b8',
                    padding: '4px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={12} color="#10b981" /> 2-Sec Counter QR Scan
                  </span>
                  <span>•</span>
                  <span>0% Booking Fee</span>
                  <span>•</span>
                  <span style={{ color: '#fde68a' }}>+100 VIP Points</span>
                </div>

                {/* Dual Action CTAs */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.35fr 1fr',
                    gap: '8px',
                    marginTop: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleClaimOrOpenPass(offer)}
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
                      borderRadius: '14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      border: '1px solid rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <QrCode size={15} />
                    <span>
                      {existingClaim
                        ? 'Show Offer Pass'
                        : isToday
                        ? "Claim Today's Pass"
                        : `Get ${offer.shortDay} Pass`}
                    </span>
                  </button>

                  <Link
                    to={offer.bookingPath}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      background: 'rgba(255, 255, 255, 0.14)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      padding: '11px 12px',
                      borderRadius: '14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.24)',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>{offer.bookingLabel}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM DOT PAGINATION INDICATORS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
        }}
      >
        {offers.map((item, index) => {
          const isActive = index === activeSlideIndex;
          const isToday = item.dayKey === todayOffer.dayKey;

          return (
            <button
              key={item.dayKey}
              type="button"
              onClick={() => scrollToSlide(index)}
              aria-label={`Go to ${item.dayName} offer slide`}
              style={{
                border: 'none',
                cursor: 'pointer',
                height: '7px',
                width: isActive ? '24px' : '7px',
                borderRadius: '999px',
                background: isActive
                  ? 'var(--brand-green)'
                  : isToday
                  ? '#f59e0b'
                  : '#cbd5e1',
                transition: 'all 0.25s ease',
                padding: 0,
              }}
            />
          );
        })}
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
                  {copiedPromo === activeClaimModal.offer.promoCode ? (
                    <Check size={12} color="#10b981" />
                  ) : (
                    <Copy size={12} />
                  )}
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
              {offers.map((item, index) => {
                const isToday = item.dayKey === todayOffer.dayKey;
                const claimedToday = getUserClaimForToday(user.id, item.dayKey);

                return (
                  <div
                    key={item.dayKey}
                    onClick={() => {
                      scrollToSlide(index);
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
                        scrollToSlide(index);
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

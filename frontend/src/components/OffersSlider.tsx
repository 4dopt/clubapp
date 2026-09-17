import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Flame, Award, ShoppingBag, Clock, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export interface FeaturedOffer {
  id: string;
  badge: string;
  badgeGradient: string;
  chipTag: string;
  chipBg: string;
  chipColor: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  icon: React.ReactNode;
  linkTo: string;
  btnText: string;
  expiresIn: string;
}

export function OffersSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const offers: FeaturedOffer[] = [
    {
      id: 'off_1',
      badge: 'WEEKEND SPECIAL',
      badgeGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      chipTag: '⚡ 2X POINTS',
      chipBg: 'rgba(16, 185, 129, 0.25)',
      chipColor: '#34d399',
      title: '2X Points on Range Buckets',
      subtitle: 'Double Loyalty Boost',
      description: 'Earn double loyalty points on 100-ball range buckets reserved for Saturday or Sunday.',
      imageUrl: '/promos/promo_range.jpg',
      icon: <Flame size={16} color="#ffffff" />,
      linkTo: 'https://yourgolfbooking.com/venues/playgolf-northwick-park/booking/bays',
      btnText: 'Reserve Range Bay',
      expiresIn: 'Ends Sunday',
    },
    {
      id: 'off_2',
      badge: 'MEMBER EXCLUSIVE',
      badgeGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      chipTag: '🎯 TRACKMAN PRO',
      chipBg: 'rgba(245, 158, 11, 0.25)',
      chipColor: '#fbbf24',
      title: 'Free TrackMan Analysis',
      subtitle: 'PGA Coaching Perk',
      description: 'Get 30 mins complimentary swing data & trajectory analysis with any 1-hour PGA pro session.',
      imageUrl: '/promos/promo_trackman.jpg',
      icon: <Award size={16} color="#ffffff" />,
      linkTo: '/booking',
      btnText: 'Book PGA Session',
      expiresIn: '5 Slots Left',
    },
    {
      id: 'off_3',
      badge: 'PRO SHOP PERK',
      badgeGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      chipTag: '🛍️ 20% OFF',
      chipBg: 'rgba(56, 189, 248, 0.25)',
      chipColor: '#38bdf8',
      title: '20% Off Polo Apparel',
      subtitle: 'New Seasonal Gear',
      description: 'Use discount code PLAYGOLF20 on all new seasonal polos, hats, and footwear in store.',
      imageUrl: '/promos/promo_proshop.jpg',
      icon: <ShoppingBag size={16} color="#ffffff" />,
      linkTo: '/rewards',
      btnText: 'Claim Discount',
      expiresIn: 'Valid This Week',
    },
  ];

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const scrollLeft = sliderRef.current.scrollLeft;
    const width = sliderRef.current.offsetWidth;
    const index = Math.round(scrollLeft / (width * 0.85));
    setActiveIndex(Math.min(offers.length - 1, Math.max(0, index)));
  };

  const scrollToOffer = (index: number) => {
    if (!sliderRef.current) return;
    const targetCard = sliderRef.current.children[index] as HTMLElement;
    if (targetCard) {
      sliderRef.current.scrollTo({
        left: targetCard.offsetLeft - 20,
        behavior: 'smooth',
      });
      setActiveIndex(index);
    }
  };

  return (
    <div style={{ marginTop: '24px', marginBottom: '16px' }}>
      {/* Section Header */}
      <div
        style={{
          padding: '0 20px 14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: 'var(--brand-green)',
                textTransform: 'uppercase',
              }}
            >
              CLUB OFFERS & PERKS
            </span>
          </div>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Featured Club Promotions
          </h3>
        </div>

        {/* Carousel Prev / Next Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => scrollToOffer(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            aria-label="Previous Offer"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              color: activeIndex === 0 ? '#cbd5e1' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeIndex === 0 ? 'default' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scrollToOffer(Math.min(offers.length - 1, activeIndex + 1))}
            disabled={activeIndex === offers.length - 1}
            aria-label="Next Offer"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              color: activeIndex === offers.length - 1 ? '#cbd5e1' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeIndex === offers.length - 1 ? 'default' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Horizontal Touch Scroll Slider with Hero Cards */}
      <div
        ref={sliderRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          padding: '4px 20px 16px 20px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {offers.map((offer) => (
          <div
            key={offer.id}
            style={{
              flex: '0 0 320px',
              scrollSnapAlign: 'start',
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 16px 36px -10px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '260px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
            }}
          >
            {/* Background Hero Image */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${offer.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.9) contrast(1.05)',
                transition: 'transform 0.5s ease',
              }}
            />

            {/* Dark Gradient Overlay for Ultra-Crisp Legibility */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.65) 45%, rgba(15, 23, 42, 0.95) 100%)',
              }}
            />

            {/* Card Header Content: Glass Badges */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Badge Pill */}
              <div
                style={{
                  background: offer.badgeGradient,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                }}
              >
                {offer.icon}
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}
                >
                  {offer.badge}
                </span>
              </div>

              {/* Tag Pill / Urgency */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={11} style={{ color: '#60a5fa' }} />
                {offer.expiresIn}
              </div>
            </div>

            {/* Card Bottom Content Box */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '16px 18px 18px 18px',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.85) 40%, rgba(15, 23, 42, 0.98) 100%)',
              }}
            >
              {/* Chip Tag */}
              <div
                style={{
                  display: 'inline-block',
                  background: offer.chipBg,
                  color: offer.chipColor,
                  border: `1px solid ${offer.chipColor}40`,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                }}
              >
                {offer.chipTag}
              </div>

              <h4
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '4px',
                  lineHeight: 1.25,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                {offer.title}
              </h4>

              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  lineHeight: 1.45,
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {offer.description}
              </p>

              {/* Action Button */}
              {offer.linkTo.startsWith('http') ? (
                <a
                  href={offer.linkTo}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff',
                    padding: '11px 18px',
                    borderRadius: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(4, 120, 87, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {offer.btnText} <ArrowRight size={15} />
                </a>
              ) : (
                <Link
                  to={offer.linkTo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff',
                    padding: '11px 18px',
                    borderRadius: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(4, 120, 87, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {offer.btnText} <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Slider Carousel Indicator Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        {offers.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToOffer(idx)}
            aria-label={`Go to offer ${idx + 1}`}
            style={{
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              width: activeIndex === idx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: activeIndex === idx ? 'linear-gradient(90deg, #047857, #10b981)' : '#cbd5e1',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}


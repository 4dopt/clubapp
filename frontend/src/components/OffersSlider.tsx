import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Flame, Gift, Award } from 'lucide-react';

export interface FeaturedOffer {
  id: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  description: string;
  headerGradient: string;
  icon: React.ReactNode;
  linkTo: string;
  btnText: string;
}

export function OffersSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  const offers: FeaturedOffer[] = [
    {
      id: 'off_1',
      badge: 'WEEKEND SPECIAL',
      badgeBg: '#047857',
      badgeColor: '#ffffff',
      title: '2X Points on Range Buckets',
      description: 'Earn double loyalty points on 100-ball range buckets reserved for Saturday or Sunday.',
      headerGradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
      icon: <Flame size={18} color="#ffffff" />,
      linkTo: '/booking',
      btnText: 'Book Range Bay',
    },
    {
      id: 'off_2',
      badge: 'MEMBER EXCLUSIVE',
      badgeBg: '#b45309',
      badgeColor: '#ffffff',
      title: 'Free TrackMan Analysis',
      description: 'Get 30 mins complimentary swing data analysis with any 1-hour PGA pro coaching session.',
      headerGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
      icon: <Award size={18} color="#ffffff" />,
      linkTo: '/booking',
      btnText: 'Book Session',
    },
    {
      id: 'off_3',
      badge: 'PRO SHOP PERK',
      badgeBg: '#0284c7',
      badgeColor: '#ffffff',
      title: '20% Off Polo Apparel',
      description: 'Use discount code PLAYGOLF20 on all new seasonal polos, hats, and footwear.',
      headerGradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      icon: <Gift size={18} color="#ffffff" />,
      linkTo: '/rewards',
      btnText: 'View Rewards',
    },
  ];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const index = Math.round(scrollLeft / (width * 0.8));
    setActiveIndex(Math.min(offers.length - 1, Math.max(0, index)));
  };

  return (
    <div style={{ marginTop: '28px', marginBottom: '8px' }}>
      {/* Distinct Section Header */}
      <div style={{ padding: '0 20px 12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#047857', color: '#fff', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <Sparkles size={16} />
          </span>
          Featured Club Promotions
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', fontWeight: 700 }}>
          Swipe &rsaquo;
        </span>
      </div>

      {/* Horizontal Touch Scroll Slider with High-Contrast Cards */}
      <div
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
              flex: '0 0 310px',
              scrollSnapAlign: 'start',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Top Distinct Header Strip */}
            <div
              style={{
                background: offer.headerGradient,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {offer.icon}
                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {offer.badge}
                </span>
              </div>

              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                LIMITED
              </span>
            </div>

            {/* Card Body */}
            <div style={{ padding: '16px 18px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {offer.title}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '16px' }}>
                {offer.description}
              </p>

              <Link
                to={offer.linkTo}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: offer.badgeBg,
                  color: '#ffffff',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  width: '100%',
                }}
              >
                {offer.btnText} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Slider Carousel Dots Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
        {offers.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: activeIndex === idx ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: activeIndex === idx ? '#047857' : 'var(--border-color)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

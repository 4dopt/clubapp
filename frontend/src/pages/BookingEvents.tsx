import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Cake,
  Briefcase,
  Users,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Wine,
} from 'lucide-react';

export function BookingEvents() {
  const navigate = useNavigate();

  const eventCategories = [
    {
      id: 'kids-parties',
      tag: 'KIDS BIRTHDAY PARTIES',
      title: 'Putt Crazy & Junior Golf Parties',
      badge: 'Most Popular',
      badgeColor: '#ec4899',
      badgeBg: 'rgba(236, 72, 153, 0.12)',
      icon: <Cake size={24} style={{ color: '#ec4899' }} />,
      gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
      borderColor: 'rgba(236, 72, 153, 0.28)',
      priceGuide: 'From £16.95 / child',
      features: [
        '18-hole adventure Putt Crazy minigolf (2 full laps)',
        'Dedicated party table in The Fairway Room or Bunker Bar',
        'Hot kids meal (pizza, chicken tenders & fries, ice cream)',
        'Party invitations, golf certificates & putters included',
      ],
      description:
        'Stress-free kids birthday celebrations. Kids love the illuminated dinosaur and jungle adventure course, followed by party food and cake.',
      externalUrl: 'https://www.playgolfnorthwickpark.com/parties-functions/',
      buttonText: 'View Kids Party Packages ↗',
      accentColor: '#db2777',
    },
    {
      id: 'corporate-events',
      tag: 'CORPORATE & TEAM DAYS',
      title: 'Corporate Golf Days & Team Awaydays',
      badge: 'High Impact',
      badgeColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.12)',
      icon: <Briefcase size={24} style={{ color: '#0284c7' }} />,
      gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
      borderColor: 'rgba(2, 132, 199, 0.28)',
      priceGuide: 'Custom packages from £35 / person',
      features: [
        'Private TrackMan 4 bay bays with interactive games & radar metrics',
        'Interactive AR Smart Darts social tournament lanes',
        'Full AV-equipped Fairway Conference Room for presentations',
        'Blue Zenzer Italian / Indian hot buffet & bar packages',
      ],
      description:
        'Ideal for client entertainment, team building, and company celebrations. Suitable for total beginners and scratch golfers alike.',
      externalUrl: 'https://www.playgolfnorthwickpark.com/parties-functions/',
      buttonText: 'Explore Corporate Packages ↗',
      accentColor: '#0284c7',
    },
    {
      id: 'private-parties',
      tag: 'PRIVATE CELEBRATIONS',
      title: 'Bunker Bar & Fairway Room Venue Hire',
      badge: 'Up to 150 Guests',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      icon: <Wine size={24} style={{ color: '#8b5cf6' }} />,
      gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
      borderColor: 'rgba(139, 92, 246, 0.28)',
      priceGuide: 'Private venue hire & catering bundles',
      features: [
        'Exclusive hire of The Bunker Bar or The Fairway Room',
        'Fully licensed late bar, draught beers, craft cocktails & wines',
        'Integrated sound system, DJ booth space & ambient lighting',
        'Bespoke catering menus from Blue Zenzer & canapé selections',
      ],
      description:
        'Celebrate milestone adult birthdays, anniversaries, stag & hen parties, and private dinners with private bay access and panoramic course views.',
      externalUrl: 'https://www.playgolfnorthwickpark.com/parties-functions/',
      buttonText: 'View Venue Hire & Menus ↗',
      accentColor: '#7c3aed',
    },
    {
      id: 'golf-societies',
      tag: 'GOLF SOCIETIES & TOURS',
      title: '9 & 18-Hole Society Match Days',
      badge: 'Group Rates',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.12)',
      icon: <Users size={24} style={{ color: '#059669' }} />,
      gradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
      borderColor: 'rgba(5, 150, 105, 0.28)',
      priceGuide: 'Special group society tariffs',
      features: [
        'Reserved tee times on the 9-hole Championship Course',
        'Electric buggy fleets & equipment hire pre-allocated',
        'Coffee & bacon rolls on arrival + 2-course clubhouse dinner',
        'Nearest the Pin & Longest Drive contest setups',
      ],
      description:
        'Host your society or tour competition with dedicated tournament coordination, leaderboards, and hospitality at the 19th hole.',
      externalUrl: 'https://www.playgolfnorthwickpark.com/parties-functions/',
      buttonText: 'Enquire for Society Days ↗',
      accentColor: '#059669',
    },
  ];

  return (
    <div style={{ padding: '16px 16px 36px 16px', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button
          onClick={() => navigate('/booking')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '7px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={15} /> Back to Booking
        </button>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            color: '#db2777',
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={12} /> Venue & Group Packages
        </span>
      </div>

      {/* Clean, Bright Header Banner matching Light Theme */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f0fdf4 100%)',
          border: '1.5px solid rgba(236, 72, 153, 0.25)',
          borderRadius: '20px',
          padding: '20px 18px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#db2777',
            marginBottom: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <Sparkles size={12} style={{ color: '#db2777' }} /> CELEBRATE AT PLAYGOLF
        </div>

        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            lineHeight: 1.25,
            margin: '0 0 6px 0',
            color: '#0f172a',
          }}
        >
          Kids Parties, Corporate & Private Events
        </h1>
        <p
          style={{
            fontSize: '0.82rem',
            color: '#475569',
            lineHeight: 1.45,
            margin: 0,
            fontWeight: 500,
          }}
        >
          Host unforgettable celebrations at PlayGolf Northwick Park. Explore packages below to view menus, party details, and book directly.
        </p>
      </div>

      {/* Event Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {eventCategories.map((evt) => (
          <div
            key={evt.id}
            style={{
              background: evt.gradient,
              border: `1.5px solid ${evt.borderColor}`,
              borderRadius: '20px',
              padding: '20px 18px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Top Tag & Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: `1px solid ${evt.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {evt.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: evt.accentColor, letterSpacing: '0.05em' }}>
                    {evt.tag}
                  </div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
                    {evt.title}
                  </h3>
                </div>
              </div>

              <span
                style={{
                  background: evt.badgeBg,
                  color: evt.badgeColor,
                  border: `1px solid ${evt.borderColor}`,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                {evt.badge}
              </span>
            </div>

            {/* Price Guide */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: evt.accentColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>{evt.priceGuide}</span>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              {evt.description}
            </p>

            {/* Feature Checklist */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {evt.features.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={15} style={{ color: evt.accentColor, flexShrink: 0, marginTop: '2px' }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* External Direct Action Button */}
            <a
              href={evt.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: evt.accentColor,
                color: '#ffffff',
                textDecoration: 'none',
                height: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 800,
                fontSize: '0.86rem',
                boxShadow: `0 4px 14px ${evt.accentColor}35`,
                cursor: 'pointer',
              }}
            >
              <span>{evt.buttonText}</span>
              <ExternalLink size={16} />
            </a>
          </div>
        ))}
      </div>

      {/* Direct Contact & Venue Support Box */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '18px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--brand-green)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
          Direct Event Enquiries Team
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
          Prefer to talk through bespoke requirements?
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
          Our event planners can create custom packages for groups from 10 to 150+ guests, including catering, bay allocations, and competitions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <a
            href="tel:+442088642020"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '10px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <Phone size={15} style={{ color: 'var(--brand-green)' }} /> 020 8864 2020
          </a>
          <a
            href="mailto:enquiries@playgolfnorthwickpark.com?subject=Group%20or%20Party%20Booking%20Enquiry"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '10px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <Mail size={15} style={{ color: 'var(--brand-green)' }} /> Email Enquiries
          </a>
        </div>
      </div>
    </div>
  );
}

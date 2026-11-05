import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Send,
  Sparkles,
  HelpCircle,
  Award,
  Calendar,
  Ticket,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth';

interface FaqItem {
  id: string;
  category: 'points' | 'booking' | 'rewards' | 'app';
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export function HelpSupport() {
  const { user } = useAuth();
  const location = useLocation();

  // Search and category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'points' | 'booking' | 'rewards' | 'app'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq_1');

  // Contact Form state
  const [formCategory, setFormCategory] = useState('General Question');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState('');

  const faqs: FaqItem[] = [
    {
      id: 'faq_1',
      category: 'points',
      icon: <Award size={16} color="#d97706" />,
      question: 'How do I earn loyalty points on my visits?',
      answer:
        'You earn 10 points for every £1 spent across PlayGolf Northwick Park—including Driving Range ball buckets, 9-Hole green fees, Putt Crazy minigolf, Interactive AR Darts, and Clubhouse food & drinks. Simply present your digital QR pass at reception or the till before paying.',
    },
    {
      id: 'faq_2',
      category: 'points',
      icon: <Sparkles size={16} color="#059669" />,
      question: 'What are the membership tiers and how do I upgrade?',
      answer:
        'All players start at Club Member (Green). When you reach 500 lifetime points you unlock Silver Tier (5% discount on range bays). At 1,000 points you reach Gold Tier (10% discount + exclusive flash deals). At 5,000 points you achieve Platinum Tier (15% off + VIP bay priority). Your points automatically upgrade your digital pass.',
    },
    {
      id: 'faq_3',
      category: 'booking',
      icon: <Calendar size={16} color="#0284c7" />,
      question: 'Are there any extra booking fees when reserving via the app?',
      answer:
        'None at all! All reservations made through the PlayGolf direct app incur 0% commission and zero booking fees (£0.00). 100% of your ticket price goes towards your session and earns member loyalty points.',
    },
    {
      id: 'faq_4',
      category: 'booking',
      icon: <ShieldCheck size={16} color="#10b981" />,
      question: 'What happens if rain washes out my driving range or golf booking?',
      answer:
        'PlayGolf Northwick Park features covered, floodlit, heated driving range bays. However, if severe weather forces outdoor course closures, staff issue an immediate 100% digital pass credit to your account or reschedule your tee time with zero cancellation fee.',
    },
    {
      id: 'faq_5',
      category: 'booking',
      icon: <Ticket size={16} color="#7c3aed" />,
      question: 'Can I book corporate events, societies, or kids birthday parties?',
      answer:
        'Yes! Navigate to the Booking tab and tap "Private & Corporate Events". We offer turnkey packages combining Range Bays, Putt Crazy, AR Darts, and Clubhouse pizza or BBQ buffets from £45/person. For kids parties, turnkey minigolf & pizza packages can be booked in 60 seconds.',
    },
    {
      id: 'faq_6',
      category: 'rewards',
      icon: <Ticket size={16} color="#ea580c" />,
      question: 'How do I redeem my points for free range balls or coffee?',
      answer:
        'Head to the "Rewards" tab at the bottom of the screen. Tap "Redeem" on any unlocked reward item (e.g., 100 Free Balls for 500 PTS, Free Barista Coffee for 200 PTS). The app generates a single-use QR voucher that reception or bar staff scan in 2 seconds.',
    },
    {
      id: 'faq_7',
      category: 'app',
      icon: <QrCode size={16} color="#047857" />,
      question: 'How does reception scan my member pass?',
      answer:
        'Tap "Show QR Pass" on your Dashboard or Profile. Present the high-contrast QR code to the counter scanner or reception tablet. Staff check you in, verify your VIP status, or apply daily offers instantaneously.',
    },
    {
      id: 'faq_8',
      category: 'app',
      icon: <HelpCircle size={16} color="#6366f1" />,
      question: 'Can I install this app on my iPhone or Android home screen?',
      answer:
        'Yes! PlayGolf is a progressive web app (PWA). On iPhone Safari, tap the Share icon and select "Add to Home Screen". On Android Chrome, tap the three dots and choose "Install App" or "Add to Home screen" for instant 1-tap access with zero App Store download.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMessage.trim()) return;

    const ref = `PG-${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketRef(ref);
    setFormSubmitted(true);
    setFormMessage('');
    setFormSubject('');
  };

  return (
    <div style={{ padding: '16px 16px 36px 16px', maxWidth: '480px', margin: '0 auto' }}>
      {/* Top Navigation Back Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <Link
          to="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.84rem',
            fontWeight: 700,
            padding: '6px 12px 6px 8px',
            borderRadius: 'var(--radius-full)',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={16} /> Back to Profile
        </Link>

        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: 'var(--brand-green)',
            background: 'var(--brand-green-subtle)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(4, 120, 87, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }}
          />
          Live Support
        </span>
      </div>

      {/* Hero Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '22px 18px',
          marginBottom: '18px',
          boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '4px 10px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, marginBottom: '8px' }}>
          <BookOpen size={13} /> PLAYGOLF HELP CENTER
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
          Help & Support
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.45 }}>
          Search our member knowledge base or connect directly with our Northwick Park front-desk team via WhatsApp and email.
        </p>

        {/* Search Input */}
        <div
          style={{
            marginTop: '16px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={17}
            style={{ position: 'absolute', left: '14px', color: '#94a3b8' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, points, bookings, vouchers..."
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* DIRECT CONTACT CHANNELS (WhatsApp & Phone) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
          FASTEST RESOLUTION
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
          Speak With Front-Desk Staff
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {/* WhatsApp Action Card */}
          <a
            href="https://wa.me/442089086500?text=Hello%20PlayGolf%20Northwick%20Park%2C%20I%20am%20a%20member%20and%20need%20assistance"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.28)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MessageCircle size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                  WhatsApp Live Chat
                </div>
                <div style={{ fontSize: '0.72rem', color: '#bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  +44 (0)20 8908 6500 • Replies in mins
                </div>
              </div>
            </div>
            <span
              style={{
                background: '#ffffff',
                color: '#15803d',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '6px 12px',
                borderRadius: '999px',
              }}
            >
              Chat Now
            </span>
          </a>

          {/* Telephone Call Card */}
          <a
            href="tel:+442089086500"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={18} color="var(--brand-green)" />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  Reception Telephone
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--slate-grey)' }}>
                  020 8908 6500 (Mon–Sun Open)
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--brand-green)' }}>
              Call Desk →
            </span>
          </a>
        </div>
      </div>

      {/* KNOWLEDGE BASE & FAQS ACCORDION */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--slate-grey)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              SELF-SERVICE GUIDES
            </div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
              Knowledge Base & FAQs
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', fontWeight: 700 }}>
            {filteredFaqs.length} Guides
          </span>
        </div>

        {/* Category Filter Pills */}
        <div
          className="hide-scrollbar"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '10px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'points', label: 'VIP & Points' },
            { id: 'booking', label: 'Bookings' },
            { id: 'rewards', label: 'Rewards' },
            { id: 'app', label: 'App & Pass' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: selectedCategory === cat.id ? '1.5px solid var(--brand-green)' : '1px solid var(--border-color)',
                background: selectedCategory === cat.id ? 'var(--brand-green-subtle)' : '#ffffff',
                color: selectedCategory === cat.id ? 'var(--brand-green)' : 'var(--text-secondary)',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedCategory === cat.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredFaqs.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--slate-grey)',
                fontSize: '0.84rem',
              }}
            >
              No guides match &ldquo;{searchQuery}&rdquo;. Try another search or message us directly below!
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  style={{
                    background: '#ffffff',
                    border: isExpanded ? '1.5px solid var(--brand-green)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border 0.2s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: isExpanded ? 'var(--brand-green-subtle)' : 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {faq.icon}
                      </span>
                      <span
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          lineHeight: 1.35,
                        }}
                      >
                        {faq.question}
                      </span>
                    </div>

                    <div style={{ color: 'var(--slate-grey)', flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: '12px 16px 16px 16px',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        borderTop: '1px solid var(--border-color)',
                        background: '#ffffff',
                      }}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* INTERACTIVE EMAIL SUPPORT FORM */}
      <div
        id="contact"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          padding: '20px 18px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Mail size={18} color="var(--brand-green)" />
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Send an Email Inquiry
          </h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
          Our clubhouse concierge team responds within 2–4 hours during operational timings.
        </p>

        {formSubmitted ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#166534', margin: '0 0 4px 0' }}>
              Message Received! Reference: {ticketRef}
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '0 0 14px 0', lineHeight: 1.45 }}>
              Thank you, {user?.name}. A copy of your inquiry has been routed to Northwick Park member services.
            </p>
            <button
              type="button"
              onClick={() => setFormSubmitted(false)}
              style={{
                background: '#ffffff',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Send Another Query
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                  Member Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || ''}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                  Member ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.member_id || 'PG-0000'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'var(--brand-green)',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                Your Email Address
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || ''}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                <option value="General Question">General Question</option>
                <option value="Points & Loyalty Balance">Points & Loyalty Balance</option>
                <option value="Booking Modification / Cancellation">Booking Modification / Cancellation</option>
                <option value="Kids Party / Corporate Enquiry">Kids Party / Corporate Enquiry</option>
                <option value="App Feedback / Bug Report">App Feedback / Bug Report</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Question about my Gold tier booking"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-grey)', marginBottom: '4px' }}>
                Your Message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe how we can assist you..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                height: '44px',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                cursor: 'pointer',
              }}
            >
              <Send size={15} /> Submit Support Request
            </button>
          </form>
        )}
      </div>

      {/* VENUE LOCATION & TIMINGS CARD */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <MapPin size={16} color="var(--brand-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>PlayGolf Northwick Park</strong>
            <br />
            280 Watford Road, Harrow, Middlesex, HA1 3TZ
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
          <Clock size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Opening Hours:</strong> Mon–Fri: 09:00 – 22:00 | Sat–Sun: 08:00 – 21:00
          </div>
        </div>
      </div>
    </div>
  );
}

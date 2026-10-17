import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Sparkles,
  RotateCcw,
  Check,
  X,
  Tag,
} from 'lucide-react';
import {
  DailyOffer,
  DayOfWeekKey,
  getDailyOffers,
  getCurrentDayOffer,
  updateDailyOffer,
  resetDailyOffersToDefaults,
} from '../dailyOffersStore';

interface Props {
  onStatusMessage?: (msg: string) => void;
}

const BOOKING_ROUTE_OPTIONS = [
  { path: '/booking/driving-range', label: 'Book Morning / Range Bay' },
  { path: '/booking/nine-holes', label: 'Book 9-Hole Tee Time' },
  { path: '/booking/putt-crazy', label: 'Book Putt Crazy Minigolf' },
  { path: '/booking/darts-interactive', label: 'Book AR Darts Lane' },
  { path: '/booking', label: 'Book Any Activity' },
];

const IMAGE_PRESETS = [
  { label: 'Driving Range', url: '/promos/promo_range.jpg' },
  { label: 'TrackMan Pro', url: '/promos/promo_trackman.jpg' },
  { label: 'Pro Shop / Darts', url: '/promos/promo_proshop.jpg' },
  {
    label: 'Clubhouse Food & Wings',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
  {
    label: 'Fairway & Minigolf',
    url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
];

export function AdminDailyOffersStudio({ onStatusMessage }: Props) {
  const [offers, setOffers] = useState<DailyOffer[]>(() => getDailyOffers());
  const todayOffer = getCurrentDayOffer(offers);
  const [editingDay, setEditingDay] = useState<DailyOffer | null>(null);

  // Form states for editing a day's offer
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dealBadge, setDealBadge] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [description, setDescription] = useState('');
  const [bookingPath, setBookingPath] = useState('/booking/driving-range');
  const [bookingLabel, setBookingLabel] = useState('Book Activity');
  const [imageUrl, setImageUrl] = useState('/promos/promo_range.jpg');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    const handleSync = () => setOffers(getDailyOffers());
    window.addEventListener('playgolf-daily-offers-updated', handleSync);
    return () => window.removeEventListener('playgolf-daily-offers-updated', handleSync);
  }, []);

  const openEditor = (offer: DailyOffer) => {
    setEditingDay(offer);
    setTitle(offer.title);
    setSubtitle(offer.subtitle);
    setDealBadge(offer.dealBadge);
    setTimeWindow(offer.timeWindow);
    setPromoCode(offer.promoCode);
    setDescription(offer.description);
    setBookingPath(offer.bookingPath);
    setBookingLabel(offer.bookingLabel);
    setImageUrl(offer.imageUrl);
    setTerms(offer.terms);
  };

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;

    const updated = updateDailyOffer(editingDay.dayKey as DayOfWeekKey, {
      title: title.trim() || editingDay.title,
      subtitle: subtitle.trim() || editingDay.subtitle,
      dealBadge: dealBadge.trim().toUpperCase() || editingDay.dealBadge,
      timeWindow: timeWindow.trim() || editingDay.timeWindow,
      promoCode: promoCode.trim().toUpperCase() || editingDay.promoCode,
      description: description.trim() || editingDay.description,
      bookingPath,
      bookingLabel: bookingLabel.trim() || 'Book Activity',
      imageUrl: imageUrl.trim() || '/promos/promo_range.jpg',
      terms: terms.trim() || editingDay.terms,
    });

    setOffers(updated);
    onStatusMessage?.(`✅ Updated ${editingDay.dayName}'s Offer of the Day: "${title}"`);
    setEditingDay(null);
  };

  const handleResetDefaults = () => {
    const reset = resetDailyOffersToDefaults();
    setOffers(reset);
    onStatusMessage?.('🔄 Reset Monday–Sunday Daily Offers to PlayGolf defaults.');
  };

  return (
    <div>
      {/* Studio Info Banner */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#fbbf24',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            <Sparkles size={13} /> Today’s Live Spotlight ({todayOffer.dayName})
          </div>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            {todayOffer.title} — <span style={{ color: '#34d399' }}>{todayOffer.dealBadge}</span>
          </h3>
          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px', marginBottom: 0 }}>
            The Member Dashboard automatically rotates to the matching day’s offer at midnight. Tap any day below to customize.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#cbd5e1',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <RotateCcw size={13} /> Reset Defaults
        </button>
      </div>

      {/* Mon–Sun Daily Offer Cards */}
      <div className="admin-cards-grid-dense">
        {offers.map((offer) => {
          const isToday = offer.dayKey === todayOffer.dayKey;

          return (
            <div
              key={offer.dayKey}
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                border: isToday
                  ? '1.5px solid rgba(16, 185, 129, 0.55)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '15px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                <img
                  src={offer.imageUrl}
                  alt={offer.dayName}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span
                      style={{
                        background: isToday ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.08)',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {isToday ? `TODAY • ${offer.dayName}` : offer.dayName}
                    </span>

                    <span
                      style={{
                        background: 'rgba(251, 191, 36, 0.16)',
                        color: '#fbbf24',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                      }}
                    >
                      {offer.dealBadge}
                    </span>

                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.66rem',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.12)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                    >
                      {offer.promoCode}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', margin: '0 0 2px 0' }}>
                    {offer.title}
                  </h4>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.35 }}>
                    {offer.description}
                  </div>

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: '#cbd5e1',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} style={{ color: '#fbbf24' }} /> {offer.timeWindow}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditor(offer)}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <Edit2 size={13} /> Customize {offer.shortDay}
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Day Offer Modal */}
      {editingDay && (
        <div className="modal-overlay" onClick={() => setEditingDay(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <button
              type="button"
              onClick={() => setEditingDay(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <h3
              style={{
                fontSize: '1.1rem',
                color: '#ffffff',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={18} color="#10b981" />
              Edit {editingDay.dayName} Offer of the Day
            </h3>

            <form onSubmit={handleSaveOffer}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>
                  Offer Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monday Mornings Off-Peak"
                  required
                  style={{
                    background: 'rgba(9, 13, 22, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Deal Highlight Badge
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={dealBadge}
                    onChange={(e) => setDealBadge(e.target.value)}
                    placeholder="e.g. 50% OFF RANGE BAYS"
                    required
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Time Window
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    placeholder="e.g. 08:00 – 12:00"
                    required
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Promo Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MONOFFPEAK"
                    required
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Subtitle
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Early Bird Special"
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>
                  Offer Details / Description
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{
                    background: 'rgba(9, 13, 22, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Booking Destination
                  </label>
                  <select
                    className="form-input"
                    value={bookingPath}
                    onChange={(e) => setBookingPath(e.target.value)}
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                    }}
                  >
                    {BOOKING_ROUTE_OPTIONS.map((opt) => (
                      <option key={opt.path} value={opt.path}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Booking Button Text
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={bookingLabel}
                    onChange={(e) => setBookingLabel(e.target.value)}
                    style={{
                      background: 'rgba(9, 13, 22, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                  Background Image Preset
                </label>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {IMAGE_PRESETS.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      style={{
                        border: imageUrl === img.url ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '4px 9px',
                        background: imageUrl === img.url ? 'rgba(16,185,129,0.2)' : 'rgba(9,13,22,0.8)',
                        color: imageUrl === img.url ? '#10b981' : '#cbd5e1',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  fontWeight: 800,
                  height: '46px',
                }}
              >
                <Check size={16} /> Save {editingDay.dayName} Offer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Sparkles,
  RotateCcw,
  Check,
  X,
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
    onStatusMessage?.(`✅ Saved ${editingDay.dayName}'s Daily Deal: "${title}"`);
    setEditingDay(null);
  };

  const handleResetDefaults = () => {
    const reset = resetDailyOffersToDefaults();
    setOffers(reset);
    onStatusMessage?.('🔄 Reset Monday–Sunday Daily Deals to PlayGolf defaults.');
  };

  return (
    <div>
      {/* Studio Info Banner */}
      <div
        style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '18px',
          padding: '18px',
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
              fontSize: '0.74rem',
              fontWeight: 900,
              color: '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            <Sparkles size={14} /> Today’s Live Deal ({todayOffer.dayName})
          </div>
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {todayOffer.title} — <span style={{ color: '#047857' }}>{todayOffer.dealBadge}</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px', marginBottom: 0 }}>
            The Member App automatically shows the matching day’s deal. Tap any day below to edit.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '9px 14px',
            borderRadius: '10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <RotateCcw size={14} /> Reset Defaults
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
                background: '#ffffff',
                border: isToday ? '2px solid #047857' : '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                boxShadow: 'var(--shadow-sm)',
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
                    border: '1px solid #e2e8f0',
                  }}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span
                      style={{
                        background: isToday ? '#047857' : '#f1f5f9',
                        color: isToday ? '#ffffff' : '#334155',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {isToday ? `TODAY • ${offer.dayName}` : offer.dayName}
                    </span>

                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                      }}
                    >
                      {offer.dealBadge}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                    {offer.title}
                  </h4>

                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.35 }}>
                    {offer.description}
                  </div>

                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: '#64748b',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} style={{ color: '#d97706' }} /> {offer.timeWindow}
                    </span>
                    <span>• Code: {offer.promoCode}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditor(offer)}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <Edit2 size={14} /> Edit {offer.shortDay}
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Day Offer Modal (Clean Light Mode) */}
      {editingDay && (
        <div className="modal-overlay" onClick={() => setEditingDay(null)}>
          <div
            className="modal-content admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
            }}
          >
            <button
              type="button"
              onClick={() => setEditingDay(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: '#f1f5f9',
                border: 'none',
                color: '#334155',
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
                fontSize: '1.2rem',
                color: '#0f172a',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={20} color="#047857" />
              Edit {editingDay.dayName} Daily Deal
            </h3>

            <form onSubmit={handleSaveOffer}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label">Deal Headline</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monday Mornings Off-Peak"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Discount / Highlight Badge
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={dealBadge}
                    onChange={(e) => setDealBadge(e.target.value)}
                    placeholder="e.g. 50% OFF RANGE BAYS"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Valid Hours
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    placeholder="e.g. 08:00 – 12:00"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Promo Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MONOFFPEAK"
                    required
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Short Tagline
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Early Bird Special"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label">Deal Details</label>
                <input
                  type="text"
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    When Member Taps "Book"
                  </label>
                  <select
                    className="form-input"
                    value={bookingPath}
                    onChange={(e) => setBookingPath(e.target.value)}
                  >
                    {BOOKING_ROUTE_OPTIONS.map((opt) => (
                      <option key={opt.path} value={opt.path}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Button Text
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={bookingLabel}
                    onChange={(e) => setBookingLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                  Photo Preset
                </label>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {IMAGE_PRESETS.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      style={{
                        border: imageUrl === img.url ? '2px solid #047857' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        background: imageUrl === img.url ? '#ecfdf5' : '#f8fafc',
                        color: imageUrl === img.url ? '#047857' : '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 800,
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
                  minHeight: '48px',
                  fontWeight: 800,
                }}
              >
                <Check size={17} /> Save {editingDay.dayName} Deal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

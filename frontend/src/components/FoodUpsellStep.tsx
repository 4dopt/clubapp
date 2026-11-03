import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Utensils,
  Beer,
  Check,
} from 'lucide-react';

export interface UpsellItem {
  id: string;
  name: string;
  description: string;
  nowPrice: number;
  normalPrice: number;
  badge: string;
  category: 'food' | 'drink';
  emoji: string;
}

export const PREORDER_UPSELL_ITEMS: UpsellItem[] = [
  {
    id: 'loaded-nachos',
    name: 'Classic Loaded Nachos',
    description: 'Tortilla chips smothered in melted aged cheddar, jalapeños, freshly diced salsa, sour cream & guacamole.',
    nowPrice: 6.0,
    normalPrice: 11.0,
    badge: 'SAVE £5.00',
    category: 'food',
    emoji: '🧀',
  },
  {
    id: 'chicken-wings',
    name: 'Crispy Chicken Wings',
    description: 'Signature golden-fried clubhouse chicken wings tossed in smoky BBQ or classic buffalo hot glaze.',
    nowPrice: 6.0,
    normalPrice: 12.0,
    badge: '50% OFF NOW',
    category: 'food',
    emoji: '🍗',
  },
  {
    id: 'beer-pint',
    name: 'Ice-Cold Beer Pint',
    description: 'Chilled pint of draught clubhouse lager, crisp cider, or craft pale ale poured fresh at the bar.',
    nowPrice: 5.0,
    normalPrice: 6.5,
    badge: 'SAVE £1.50',
    category: 'drink',
    emoji: '🍺',
  },
];

export interface SelectedUpsellOrder {
  items: { item: UpsellItem; qty: number }[];
  upsellTotal: number;
  totalSaved: number;
  summaryText: string;
}

interface FoodUpsellStepProps {
  activityTitle: string;
  basePrice: number;
  accentColor?: string;
  onComplete: (order: SelectedUpsellOrder) => void;
  onBack: () => void;
}

export function FoodUpsellStep({
  activityTitle,
  basePrice,
  accentColor = '#047857',
  onComplete,
  onBack,
}: FoodUpsellStepProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(299); // 04:59 countdown

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const selectedList = PREORDER_UPSELL_ITEMS.filter((item) => (cart[item.id] || 0) > 0).map(
    (item) => ({
      item,
      qty: cart[item.id] || 0,
    })
  );

  const totalItemsCount = selectedList.reduce((sum, x) => sum + x.qty, 0);
  const upsellTotal = selectedList.reduce((sum, x) => sum + x.item.nowPrice * x.qty, 0);
  const totalSaved = selectedList.reduce(
    (sum, x) => sum + (x.item.normalPrice - x.item.nowPrice) * x.qty,
    0
  );
  const grandTotal = basePrice + upsellTotal;

  const handleConfirmWithCart = () => {
    const summaryText = selectedList
      .map((x) => `${x.qty}x ${x.item.name} (£${(x.item.nowPrice * x.qty).toFixed(2)})`)
      .join(', ');

    onComplete({
      items: selectedList,
      upsellTotal,
      totalSaved,
      summaryText: summaryText ? `Pre-Order Food/Drinks: ${summaryText}` : '',
    });
  };

  const handleSkip = () => {
    onComplete({
      items: [],
      upsellTotal: 0,
      totalSaved: 0,
      summaryText: '',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Limited-Time Pre-Order Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7c2d12 0%, #b45309 50%, #d97706 100%)',
          borderRadius: '20px',
          padding: '18px 16px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(180, 83, 9, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#fef3c7',
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '999px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Flame size={13} /> Pre-Order Only • Unlock Up to 50% Off
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#111827',
              color: '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '999px',
              fontFamily: 'monospace',
            }}
          >
            <Clock size={12} /> {formatCountdown(secondsLeft)}
          </span>
        </div>

        <h2
          style={{
            fontSize: '1.22rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 6px 0',
            lineHeight: 1.25,
          }}
        >
          Wait! Exclusive Clubhouse Pre-Order Deals
        </h2>
        <p
          style={{
            fontSize: '0.79rem',
            color: '#fef3c7',
            lineHeight: 1.45,
            margin: 0,
            fontWeight: 600,
          }}
        >
          These discounted prices are <strong>only available right now</strong> while confirming your{' '}
          <strong>{activityTitle}</strong> booking and cannot be claimed at the bar later!
        </p>
      </div>

      {/* 3 Food & Drink Pre-Order Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PREORDER_UPSELL_ITEMS.map((offer) => {
          const qty = cart[offer.id] || 0;
          const isAdded = qty > 0;

          return (
            <div
              key={offer.id}
              style={{
                background: isAdded ? '#fffbeb' : '#ffffff',
                border: isAdded ? '2px solid #d97706' : '1px solid var(--border-color)',
                borderRadius: '18px',
                padding: '15px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.18s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: isAdded ? '#fef3c7' : 'var(--bg-subtle)',
                      border: isAdded ? '1px solid #fde68a' : '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0,
                    }}
                  >
                    {offer.emoji}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginBottom: '3px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.94rem',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {offer.name}
                      </span>
                      <span
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {offer.badge}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.38,
                        margin: '0 0 10px 0',
                      }}
                    >
                      {offer.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                        <span
                          style={{
                            fontSize: '1.12rem',
                            fontWeight: 900,
                            color: '#b45309',
                          }}
                        >
                          £{offer.nowPrice.toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            color: 'var(--slate-grey)',
                            textDecoration: 'line-through',
                            fontWeight: 700,
                          }}
                        >
                          Normally £{offer.normalPrice.toFixed(2)}
                        </span>
                      </div>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQty(offer.id, 1)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                          }}
                        >
                          <Plus size={14} /> Add to Cart
                        </button>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#ffffff',
                            border: '1.5px solid #d97706',
                            borderRadius: '10px',
                            padding: '4px 6px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => updateQty(offer.id, -1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              border: 'none',
                              background: '#fef3c7',
                              color: '#b45309',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 800,
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              color: 'var(--text-primary)',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}
                          >
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(offer.id, 1)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              border: 'none',
                              background: '#d97706',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 800,
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary & Action Buttons Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{activityTitle}:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>£{basePrice.toFixed(2)}</span>
          </div>

          {totalItemsCount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#b45309', fontWeight: 700 }}>
                  Food & Drink Pre-Order ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}):
                </span>
                <span style={{ color: '#b45309', fontWeight: 800 }}>+£{upsellTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>Pre-Order Savings:</span>
                <span style={{ color: '#047857', fontWeight: 800 }}>-£{totalSaved.toFixed(2)} saved!</span>
              </div>
            </>
          )}

          <div
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '8px',
              marginTop: '2px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.92rem',
            }}
          >
            <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Total Booking Amount:</span>
            <span style={{ color: accentColor, fontWeight: 900 }}>£{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleConfirmWithCart}
            className="btn-primary"
            style={{
              height: '50px',
              background:
                totalItemsCount > 0
                  ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                  : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor} 100%)`,
              borderRadius: '14px',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <ShoppingBag size={17} />
            {totalItemsCount > 0
              ? `Add Pre-Order & Confirm (£${grandTotal.toFixed(2)})`
              : `Confirm Booking (£${grandTotal.toFixed(2)})`}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="btn-secondary"
            style={{
              height: '44px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            Skip Pre-Order Offers & Continue <ArrowRight size={15} />
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-grey)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ← Back to booking details
          </button>
        </div>
      </div>
    </div>
  );
}

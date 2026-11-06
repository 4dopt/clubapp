import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Crown,
  Trophy,
  Shield,
  CheckCircle2,
  Sparkles,
  Percent,
  Zap,
  Gift,
  CreditCard,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../auth';
import {
  CardVisualTier,
  resolveCardVisualTier,
  setMemberUpgradedTier,
} from '../components/MembershipCard';
import { syncProfileAndUsersTables } from '../supabaseService';

export interface UpgradePlan {
  tier: 'Silver' | 'Gold' | 'Platinum';
  name: string;
  tagline: string;
  priceMonthly: number;
  pointsThreshold: number;
  instantBonusPoints: number;
  bookingDiscountPct: number;
  pointsMultiplier: string;
  badgeText?: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  headerGradient: string;
  perks: string[];
  bookingSavingsExample: string;
}

export const UPGRADE_PLANS: UpgradePlan[] = [
  {
    tier: 'Silver',
    name: 'Silver Tier',
    tagline: 'Essential Savings & Priority Access',
    priceMonthly: 10,
    pointsThreshold: 500,
    instantBonusPoints: 300,
    bookingDiscountPct: 10,
    pointsMultiplier: '1.25× Points',
    accentColor: '#334155',
    accentBg: '#f8fafc',
    accentBorder: '#cbd5e1',
    headerGradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
    bookingSavingsExample: 'Fixed 10% OFF Driving Range, 9-Hole Golf, Putt Crazy & Darts bookings',
    perks: [
      '10% Fixed Discount on all online & reception bookings',
      '+300 Instant Bonus Points credited on upgrade',
      '1.25× Points Multiplier on every club check-in',
      '10% Off hot drinks & food at the Clubhouse Café',
      '7-day priority advance booking window for bays & tee times',
      'Unlocks Silver-tier Pro Shop rewards & Brushed Silver 3D Card',
    ],
  },
  {
    tier: 'Gold',
    name: 'Gold Tier',
    tagline: 'Serious Golfers & Frequent Range Players',
    priceMonthly: 20,
    pointsThreshold: 1000,
    instantBonusPoints: 600,
    bookingDiscountPct: 15,
    pointsMultiplier: '1.5× Points',
    badgeText: 'MOST POPULAR',
    accentColor: '#b45309',
    accentBg: '#fffbeb',
    accentBorder: '#fcd34d',
    headerGradient: 'linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)',
    bookingSavingsExample: 'Fixed 15% OFF Driving Range, 9-Hole Golf, Putt Crazy & Darts bookings',
    perks: [
      '15% Fixed Discount on all online & reception bookings',
      '1 Free 100-Ball Range Bucket every month (worth up to £17.50)',
      '+600 Instant Bonus Points credited on upgrade',
      '1.5× Points Multiplier on every club check-in',
      '15% Off Pro Shop apparel, gloves, balls & Clubhouse Café',
      '14-day priority advance booking window + 24K Gold 3D Card',
    ],
  },
  {
    tier: 'Platinum',
    name: 'Platinum VIP',
    tagline: 'All-Inclusive VIP Club Privileges',
    priceMonthly: 30,
    pointsThreshold: 5000,
    instantBonusPoints: 1500,
    bookingDiscountPct: 25,
    pointsMultiplier: '2.0× Double Points',
    badgeText: 'ULTIMATE VALUE',
    accentColor: '#0f766e',
    accentBg: '#f0fdfa',
    accentBorder: '#5eead4',
    headerGradient: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0d9488 100%)',
    bookingSavingsExample: 'Fixed 25% OFF Driving Range, 9-Hole Golf, Putt Crazy & Darts bookings',
    perks: [
      '25% Fixed Discount on all online & reception bookings',
      '2 Free 100-Ball Range Buckets + 1 Free Guest Pass every month',
      '+1,500 Instant Bonus Points credited on upgrade',
      '2.0× Double Points on every club visit & spend',
      'Complimentary monthly 30-min PGA TrackMan swing check',
      '20% Off all Pro Shop gear & Clubhouse Bar + Obsidian VIP 3D Card',
    ],
  },
];

const TIER_RANK: Record<CardVisualTier, number> = {
  Green: 0,
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

export function MembershipUpgrade() {
  const { user, setUser } = useAuth();
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<UpgradePlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'desk'>('online');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccessBanner, setUpgradeSuccessBanner] = useState<string | null>(null);

  if (!user) return null;

  const currentPoints = user.points ?? user.points_balance ?? 0;
  const visualTier = resolveCardVisualTier(user);
  const currentDiscountPct =
    visualTier === 'Platinum' ? 25 : visualTier === 'Gold' ? 15 : visualTier === 'Silver' ? 10 : 0;
  const currentMultiplier =
    visualTier === 'Platinum' ? '2.0×' : visualTier === 'Gold' ? '1.5×' : visualTier === 'Silver' ? '1.25×' : '1.0×';

  const handleConfirmUpgrade = async () => {
    if (!selectedUpgradePlan) return;
    setUpgrading(true);
    try {
      const bonus = selectedUpgradePlan.instantBonusPoints;
      const newPoints = currentPoints + bonus;
      const newPointsYtd = (user.points_ytd || currentPoints) + bonus;

      setMemberUpgradedTier(user.id, selectedUpgradePlan.tier);

      const updatedUser = {
        ...user,
        tier: selectedUpgradePlan.tier,
        points: newPoints,
        points_balance: newPoints,
        points_ytd: newPointsYtd,
      };

      setUser(updatedUser);
      await syncProfileAndUsersTables(updatedUser);

      setUpgradeSuccessBanner(
        `Welcome to ${selectedUpgradePlan.name}! Your ${selectedUpgradePlan.bookingDiscountPct}% fixed booking discount and +${bonus.toLocaleString()} bonus PTS are now active.`
      );
      setSelectedUpgradePlan(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div style={{ padding: '16px 16px 32px 16px' }}>
      {/* Top Navigation Back Bar */}
      <div style={{ marginBottom: '14px' }}>
        <Link
          to="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: 'var(--brand-green)',
            textDecoration: 'none',
            background: 'var(--brand-green-subtle)',
            border: '1px solid rgba(4, 120, 87, 0.25)',
            padding: '7px 13px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <ArrowLeft size={15} /> Back to Profile
        </Link>
      </div>

      {/* Page Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 55%, #064e3b 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 18px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Sparkles size={14} style={{ color: '#fbbf24' }} />
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#fbbf24',
              textTransform: 'uppercase',
            }}
          >
            PLAYGOLF MEMBERSHIP TIERS
          </span>
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', lineHeight: 1.25 }}>
          Upgrade Tier &amp; Unlock Fixed Discounts
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 14px 0' }}>
          Upgrade immediately starting from <strong>£10/month</strong> (or unlock via loyalty points) to get guaranteed fixed discounts on every Driving Range, 9-Hole, Putt Crazy &amp; Darts booking.
        </p>

        {/* Current Active Status Pill Strip */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 800 }}>
            <Award size={15} style={{ color: '#34d399' }} />
            <span>
              Your Tier: <span style={{ color: '#34d399' }}>{visualTier === 'Green' ? 'Club (Base)' : `${visualTier} Tier`}</span>
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2e8f0' }}>
            {currentDiscountPct}% Booking Discount &bull; {currentMultiplier} PTS
          </div>
        </div>
      </div>

      {/* Upgrade Success Notification Banner */}
      {upgradeSuccessBanner && (
        <div
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 8px 20px rgba(4, 120, 87, 0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.4 }}>{upgradeSuccessBanner}</div>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeSuccessBanner(null)}
            style={{ background: 'transparent', border: 'none', color: '#a7f3d0', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Side-by-Side Tier Benefits & Fixed Discount Comparison Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '18px',
        }}
      >
        <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
          Tier Benefits Comparison
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
          How each membership tier rewards you on bookings, range balls, and points:
        </p>

        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '9px 11px',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.9fr 1fr 0.8fr',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <span>Tier</span>
            <span style={{ textAlign: 'center' }}>Booking Off</span>
            <span style={{ textAlign: 'center' }}>Key Perks</span>
            <span style={{ textAlign: 'right' }}>Price</span>
          </div>

          {[
            {
              tier: 'Club (Green)',
              discount: '0% Off',
              perk: '1.0× Base PTS',
              price: 'Free',
              highlight: visualTier === 'Green',
            },
            {
              tier: 'Silver Tier',
              discount: '10% OFF',
              perk: '1.25× + 10% Café',
              price: '£10/mo',
              highlight: visualTier === 'Silver',
            },
            {
              tier: 'Gold Tier',
              discount: '15% OFF',
              perk: '1 Free Bucket/mo',
              price: '£20/mo',
              highlight: visualTier === 'Gold',
            },
            {
              tier: 'Platinum VIP',
              discount: '25% OFF',
              perk: '2 Buckets + Pro',
              price: '£30/mo',
              highlight: visualTier === 'Platinum',
            },
          ].map((row, idx, arr) => (
            <div
              key={row.tier}
              style={{
                padding: '10px 11px',
                fontSize: '0.73rem',
                borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)',
                background: row.highlight ? 'var(--brand-green-subtle)' : '#ffffff',
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.9fr 1fr 0.8fr',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.tier}</span>
              <span
                style={{
                  textAlign: 'center',
                  fontWeight: 800,
                  color: row.discount === '0% Off' ? 'var(--slate-grey)' : 'var(--brand-green)',
                }}
              >
                {row.discount}
              </span>
              <span style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.69rem' }}>
                {row.perk}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>{row.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Tier Upgrade Cards (£10 Silver / £20 Gold / £30 Platinum) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {UPGRADE_PLANS.map((plan) => {
          const isCurrentTier = visualTier === plan.tier;
          const isLowerTier = TIER_RANK[visualTier] > TIER_RANK[plan.tier];

          return (
            <div
              key={plan.tier}
              style={{
                border: isCurrentTier ? '2px solid var(--brand-green)' : `1.5px solid ${plan.accentBorder}`,
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: plan.tier === 'Gold' ? '0 8px 22px -6px rgba(180, 83, 9, 0.16)' : 'var(--shadow-sm)',
              }}
            >
              {/* Metallic Plan Header */}
              <div
                style={{
                  background: plan.headerGradient,
                  color: '#ffffff',
                  padding: '15px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    {plan.tier === 'Platinum' ? (
                      <Crown size={16} style={{ color: '#5eead4' }} />
                    ) : plan.tier === 'Gold' ? (
                      <Trophy size={16} style={{ color: '#fde047' }} />
                    ) : (
                      <Shield size={16} style={{ color: '#e2e8f0' }} />
                    )}
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{plan.name}</span>
                    {plan.badgeText && (
                      <span
                        style={{
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.22)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {plan.badgeText}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.86)', fontWeight: 600 }}>
                    {plan.tagline}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>
                    £{plan.priceMonthly}
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.85 }}>/mo</span>
                  </div>
                  <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.78)', marginTop: '3px', fontWeight: 600 }}>
                    or {plan.pointsThreshold.toLocaleString()} PTS
                  </div>
                </div>
              </div>

              {/* Plan Body & Fixed Booking Discount Callout */}
              <div style={{ padding: '16px' }}>
                <div
                  style={{
                    background: plan.accentBg,
                    border: `1px solid ${plan.accentBorder}`,
                    borderRadius: '10px',
                    padding: '9px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: plan.accentColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Percent size={14} /> {plan.bookingDiscountPct}% Fixed Booking Discount
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--brand-green)',
                      background: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(4, 120, 87, 0.2)',
                    }}
                  >
                    +{plan.instantBonusPoints.toLocaleString()} Bonus PTS
                  </span>
                </div>

                {/* Perks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {plan.perks.map((perk) => (
                    <div
                      key={perk}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '0.77rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={15} style={{ color: 'var(--brand-green)', flexShrink: 0, marginTop: '1px' }} />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>

                {/* Upgrade CTA Button */}
                {isCurrentTier ? (
                  <div
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: 'var(--brand-green-subtle)',
                      border: '1px solid rgba(4, 120, 87, 0.3)',
                      color: 'var(--brand-green)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} /> Current Active Tier ({plan.bookingDiscountPct}% Booking Discount)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('online');
                      setSelectedUpgradePlan(plan);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: plan.headerGradient,
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
                    }}
                  >
                    <Sparkles size={15} />
                    <span>
                      {isLowerTier
                        ? `Switch to ${plan.name} — £${plan.priceMonthly}/mo`
                        : `Upgrade to ${plan.name} — £${plan.priceMonthly}/mo`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Membership Upgrade Confirmation & Checkout Modal */}
      {selectedUpgradePlan && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedUpgradePlan(null)}
          style={{ zIndex: 1150 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              borderRadius: '24px',
              padding: '22px 18px',
              textAlign: 'left',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedUpgradePlan(null)}
              aria-label="Close Upgrade Modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'var(--bg-subtle)',
                border: 'none',
                color: 'var(--slate-dark)',
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

            <div
              style={{
                background: selectedUpgradePlan.headerGradient,
                color: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                marginTop: '6px',
              }}
            >
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, marginBottom: '4px' }}>
                PLAYGOLF MEMBERSHIP UPGRADE
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  {selectedUpgradePlan.name}
                </h3>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                  £{selectedUpgradePlan.priceMonthly}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>/month</span>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', marginTop: '4px', fontWeight: 600 }}>
                {selectedUpgradePlan.bookingSavingsExample}
              </div>
            </div>

            {/* Instant Benefits Summary */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--slate-grey)', textTransform: 'uppercase' }}>
                Unlocked Immediately Upon Upgrade:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <Percent size={14} style={{ color: 'var(--brand-green)' }} /> Fixed Booking Discount
                </span>
                <span style={{ fontWeight: 800, color: 'var(--brand-green)' }}>
                  {selectedUpgradePlan.bookingDiscountPct}% OFF All Activities
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <Gift size={14} style={{ color: '#d97706' }} /> Instant Welcome Bonus
                </span>
                <span style={{ fontWeight: 800, color: '#d97706' }}>
                  +{selectedUpgradePlan.instantBonusPoints.toLocaleString()} PTS
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <Zap size={14} style={{ color: '#0284c7' }} /> Visit Points Multiplier
                </span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>
                  {selectedUpgradePlan.pointsMultiplier}
                </span>
              </div>
            </div>

            {/* Payment Method Choice */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Select Payment Option
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: paymentMethod === 'online' ? '2px solid var(--brand-green)' : '1px solid var(--border-color)',
                    background: paymentMethod === 'online' ? 'var(--brand-green-subtle)' : '#ffffff',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'online' ? 'var(--brand-green)' : 'var(--text-primary)' }}>
                    <CreditCard size={14} /> Pay Online Now
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', marginTop: '2px', fontWeight: 600 }}>
                    Card / Apple Pay (£{selectedUpgradePlan.priceMonthly})
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('desk')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: paymentMethod === 'desk' ? '2px solid var(--brand-green)' : '1px solid var(--border-color)',
                    background: paymentMethod === 'desk' ? 'var(--brand-green-subtle)' : '#ffffff',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'desk' ? 'var(--brand-green)' : 'var(--text-primary)' }}>
                    <ShieldCheck size={14} /> Pay at Reception
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--slate-grey)', marginTop: '2px', fontWeight: 600 }}>
                    Activate now, settle at desk
                  </div>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={upgrading}
                onClick={handleConfirmUpgrade}
                className="btn-primary"
                style={{
                  flex: 1,
                  height: '46px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  background: selectedUpgradePlan.headerGradient,
                  border: 'none',
                }}
              >
                {upgrading
                  ? 'Activating Tier...'
                  : `Confirm ${selectedUpgradePlan.name} (£${selectedUpgradePlan.priceMonthly}/mo)`}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUpgradePlan(null)}
                className="btn-secondary"
                style={{ width: 'auto', padding: '0 16px', height: '46px', fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

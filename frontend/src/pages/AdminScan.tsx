import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  CheckCircle,
  Camera,
  RefreshCw,
  KeyRound,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  ClipboardList,
  CheckCheck,
  Utensils,
  BellRing,
  PackageCheck,
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi } from '../api';
import {
  BookingItem,
  getStoredBookings,
  saveStoredBookings,
  syncBookingsFromSupabase,
  updateBookingStatus,
  updateBookingDetails,
  parseBookingQrPayload,
  parseBookingAddons,
  ACTIVITY_METADATA,
} from '../bookingsStore';
import { parseDailyOfferQrPayload } from '../dailyOffersStore';
import { getVisitPointsRate, recordVerifiedReceptionVisit } from '../loyaltyJourneyStore';

// Web Audio API feedback chime for instant scan confirmation
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* web audio fallback */
  }
}

export function AdminScan() {
  const navigate = useNavigate();
  const { token, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannerKey, setScannerKey] = useState(0);
  const visitRate = getVisitPointsRate();

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isProcessingRef = useRef(false);

  // Sync bookings with Supabase on mount so all user bookings are ready for lookup
  useEffect(() => {
    syncBookingsFromSupabase().catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'camera' || scanResult) return;

    isProcessingRef.current = false;
    const scannerId = `qr-reader-${scannerKey}`;

    const timer = setTimeout(() => {
      const el = document.getElementById(scannerId);
      if (!el) return;

      try {
        const scanner = new Html5QrcodeScanner(
          scannerId,
          {
            fps: 15,
            qrbox: { width: 230, height: 230 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: 'environment',
            },
          },
          /* verbose= */ false
        );

        scannerRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            if (!token || isProcessingRef.current) return;
            isProcessingRef.current = true;
            playSuccessChime();

            try {
              await scanner.clear();
            } catch {
              /* ignore clear errors */
            }

            await handleScannedQr(decodedText);
          },
          () => {
            /* silent frame scan errors */
          }
        );
      } catch (err) {
        console.warn('Scanner init warning:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          /* ignore */
        }
        scannerRef.current = null;
      }
    };
  }, [token, activeTab, scanResult, scannerKey]);

  const parseQrText = (raw: string): string => {
    let clean = (raw || '').trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1).trim();
    }
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        return (
          parsed.code ||
          parsed.booking_code ||
          parsed.qr_token ||
          parsed.member_id ||
          clean
        );
      } catch {
        /* fallback to raw */
      }
    }
    return clean;
  };

  const handleScannedQr = async (rawQrText: string) => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const qrPayloadBooking = parseBookingQrPayload(rawQrText);
      const qrPayloadDailyOffer = parseDailyOfferQrPayload(rawQrText);
      const qrText = parseQrText(rawQrText);

      if (!qrText) {
        setError('Invalid or empty QR Code scanned.');
        setLoading(false);
        return;
      }

      const upper = qrText.toUpperCase();

      // 0. Check if this is a Daily Offer Pass (PG_DO payload or QR_DAILY_...)
      if (qrPayloadDailyOffer || upper.startsWith('QR_DAILY_')) {
        let memberName = qrPayloadDailyOffer?.user_name || 'Member';
        let memberId = qrPayloadDailyOffer?.user_member_id || 'PG Member';
        let rewardTitle = qrPayloadDailyOffer
          ? `${qrPayloadDailyOffer.day_name} Offer: ${qrPayloadDailyOffer.offer_title} (${qrPayloadDailyOffer.deal_badge})`
          : 'Offer of the Day Pass';

        try {
          const res = await adminApi.fulfillRewardQr(token, qrPayloadDailyOffer?.pass_code || qrText);
          if (res?.member?.name) memberName = res.member.name;
          if (res?.member?.member_id) memberId = res.member.member_id;
          if (res?.redemption?.reward_title) rewardTitle = res.redemption.reward_title;
        } catch (err: any) {
          if (err?.message?.includes('already been fulfilled')) {
            throw err;
          }
        }

        setScanResult({
          type: 'reward',
          title: 'Daily Offer Pass Verified!',
          memberName,
          memberId,
          rewardTitle,
          rawCode: qrPayloadDailyOffer?.pass_code || qrText,
        });
        return;
      }

      // 1. Check if this is a Reward Redemption QR Pass
      const isRewardQr =
        upper.startsWith('QR_REDEEM_') ||
        upper.startsWith('QR_DEMO_') ||
        upper.startsWith('RW_') ||
        upper.startsWith('RED_') ||
        upper.includes('REDEEM') ||
        upper.includes('REWARD');

      // 2. Check if this is a Booking Reception Pass (PG-BK... or embedded PG_BK payload)
      const isBookingPass = Boolean(qrPayloadBooking) || upper.startsWith('PG-BK');

      if (isRewardQr) {
        const res = await adminApi.fulfillRewardQr(token, qrText);
        setScanResult({
          type: 'reward',
          title: 'Reward Voucher Verified!',
          memberName: res.member?.name || 'Member',
          memberId: res.member?.member_id || 'PG Member',
          rewardTitle: res.redemption?.reward_title || 'Reward Item',
          rawCode: qrText,
        });
      } else if (isBookingPass) {
        // Sync latest bookings from Supabase first so any user booking is present
        const syncedList = await syncBookingsFromSupabase();
        let foundBk: BookingItem | undefined = syncedList.find(
          (b) => b.booking_code.toUpperCase() === upper
        );

        // If scanned from another device via QR JSON payload and not yet in local list, add it
        if (!foundBk && qrPayloadBooking) {
          foundBk = qrPayloadBooking;
          saveStoredBookings([foundBk, ...syncedList]);
        }

        // Built-in sample fallback for PG-BK884920 or PG-BK109283 so staff can always test Pre-Ordered Food & Add-ons scanning
        if (!foundBk && (upper === 'PG-BK884920' || upper === 'PG-BK109283')) {
          const todayIso = new Date().toISOString().split('T')[0];
          foundBk = {
            id: 'bk_sample_' + Date.now(),
            booking_code: upper,
            user_id: 'usr_member_1',
            user_name: 'Alex Morgan',
            user_member_id: 'PG-2445B5',
            member_tier: 'Gold',
            activity_id: 'nine-holes',
            activity_name: '9 Holes Championship Course',
            date: todayIso,
            time: '14:30',
            duration: '120 mins',
            party_size: 2,
            bay_assignment: 'Tee 1 (Championship)',
            payment_status: 'paid',
            price: '£67.00',
            status: 'confirmed',
            notes:
              'Round: 9 Holes (Weekday Rate) • Extras: Electric Buggy Hire • Pre-Order Food/Drinks: 1x Classic Loaded Nachos (£6.00), 1x Crispy Chicken Wings (£6.00), 2x Ice-Cold Beer Pint (£10.00)',
            created_at: new Date().toISOString(),
          };
          saveStoredBookings([foundBk, ...syncedList]);
        }

        if (foundBk) {
          const alreadyCheckedIn = foundBk.status === 'completed';
          const updatedBk = updateBookingStatus(foundBk.id, 'completed') || {
            ...foundBk,
            status: 'completed' as const,
            checked_in_at: new Date().toISOString(),
          };

          let newPoints = 0;
          let awardedPts = 0;
          let verifiedReferral = null;
          if (!alreadyCheckedIn) {
            const verification = await recordVerifiedReceptionVisit(
              foundBk.user_member_id || foundBk.user_id,
              foundBk.activity_id
            );
            awardedPts = verification.pointsAwarded + (verification.verifiedReferral ? 200 : 0);
            verifiedReferral = verification.verifiedReferral;
            if (awardedPts > 0) {
              try {
                const res = await adminApi.logVisit(
                  token,
                  foundBk.user_member_id || foundBk.user_id,
                  awardedPts
                );
                newPoints = res.new_points;
                await refresh().catch(() => {});
              } catch {
                /* ignore points error */
              }
            }
          }

          const meta = ACTIVITY_METADATA[updatedBk.activity_id];

          setScanResult({
            type: 'booking',
            title: alreadyCheckedIn ? 'Booking Already Checked In' : 'Booking Checked In!',
            alreadyCheckedIn,
            booking: updatedBk,
            serviceGuide:
              meta?.serviceInstructions ||
              'Welcome member, verify any equipment extras below, and direct them to their bay/course.',
            activityColor: meta?.color || '#047857',
            memberName: updatedBk.user_name || 'Club Member',
            memberId: updatedBk.user_member_id || qrText,
            newPoints,
            pointsAwarded: awardedPts,
            isQuietTime: visitRate.isQuietTime,
            verifiedReferral,
            rawCode: updatedBk.booking_code,
          });
        } else {
          setError(`Could not find booking "${upper}". Please check the booking reference code.`);
        }
      } else {
        // 3. Member Digital Card QR Pass (QR_MEMBER_..., PG-..., Member ID, etc.)
        const verification = await recordVerifiedReceptionVisit(qrText, 'driving-range');
        const totalToCredit = verification.pointsAwarded + (verification.verifiedReferral ? 200 : 0);
        let memberName = 'Member';
        let memberId = qrText;
        let newPoints = 0;

        if (totalToCredit > 0) {
          const res = await adminApi.logVisit(token, qrText, totalToCredit);
          memberName = res.member_name || 'Member';
          memberId = res.member_id || qrText;
          newPoints = res.new_points;
          await refresh().catch(() => {});
        } else {
          try {
            const m = await adminApi.getMember(token, qrText);
            memberName = m?.name || 'Member';
            memberId = m?.member_id || qrText;
            newPoints = m?.points ?? 0;
          } catch {
            /* fallback */
          }
        }

        setScanResult({
          type: 'visit',
          title: verification.alreadyCheckedInToday
            ? 'Member Already Checked In Today (1 Visit Per Day)'
            : visitRate.isQuietTime
            ? 'Member Checked In (⚡ Quiet-Time 2× Points!)'
            : 'Member Visit Checked In!',
          alreadyCheckedInToday: verification.alreadyCheckedInToday,
          memberName,
          memberId,
          newPoints,
          pointsAwarded: totalToCredit,
          isQuietTime: visitRate.isQuietTime,
          verifiedReferral: verification.verifiedReferral,
          rawCode: qrText,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Could not recognize that code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkBookingPaidOnScan = () => {
    if (!scanResult?.booking) return;
    const updated = updateBookingDetails(scanResult.booking.id, { payment_status: 'paid' });
    setScanResult({
      ...scanResult,
      booking: updated || { ...scanResult.booking, payment_status: 'paid' },
    });
  };

  const handleMarkKitchenOrderPlacedOnScan = () => {
    if (!scanResult?.booking) return;
    const updated = updateBookingDetails(scanResult.booking.id, { kitchen_order_placed: true });
    setScanResult({
      ...scanResult,
      booking: updated || { ...scanResult.booking, kitchen_order_placed: true },
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playSuccessChime();
    handleScannedQr(manualCode);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setManualCode('');
    setScannerKey((prev) => prev + 1);
  };

  const scannedBookingAddons =
    scanResult?.type === 'booking' && scanResult?.booking
      ? parseBookingAddons(scanResult.booking.notes)
      : null;

  return (
    <div className="admin-page-container" style={{ color: '#0f172a', flex: 1 }}>
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '9px 16px',
            borderRadius: '999px',
            fontSize: '0.84rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginBottom: '6px' }}>
            Scan Guest Pass or QR Code
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.45 }}>
            Scan any Member Card, Booking Pass, or Reward Voucher using the camera or type the code below.
          </p>
        </div>
        <div
          style={{
            background: visitRate.isQuietTime ? '#ecfdf5' : '#f1f5f9',
            border: visitRate.isQuietTime ? '1.5px solid #10b981' : '1px solid #cbd5e1',
            color: visitRate.isQuietTime ? '#047857' : '#334155',
            padding: '8px 14px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {visitRate.isQuietTime
            ? '⚡ Quiet-Time 2× Bonus Active (+200 pts / visit)'
            : 'Standard Check-In (+100 pts / visit)'}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      {!scanResult && (
        <div
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            background: '#e2e8f0',
            padding: '6px',
            borderRadius: '16px',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setError('');
            }}
            style={{
              flex: 1,
              minHeight: '48px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'camera' ? '#047857' : 'transparent',
              color: activeTab === 'camera' ? '#ffffff' : '#334155',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: activeTab === 'camera' ? '0 4px 12px rgba(4, 120, 87, 0.25)' : 'none',
            }}
          >
            <Camera size={19} /> Use Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError('');
            }}
            style={{
              flex: 1,
              minHeight: '48px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'manual' ? '#047857' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : '#334155',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: activeTab === 'manual' ? '0 4px 12px rgba(4, 120, 87, 0.25)' : 'none',
            }}
          >
            <KeyRound size={19} /> Type Code Manually
          </button>
        </div>
      )}

      {/* RESULT VIEW */}
      {scanResult ? (
        <div
          style={{
            background: '#ffffff',
            border: '2px solid #10b981',
            borderRadius: '22px',
            padding: '26px 22px',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: '780px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Top Status Header */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ color: '#047857', display: 'inline-flex', marginBottom: '8px' }}>
              <CheckCircle size={56} />
            </div>

            <div
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#047857',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}
            >
              {scanResult.type === 'booking'
                ? 'BOOKING PASS VERIFIED'
                : scanResult.type === 'reward'
                ? 'REWARD VOUCHER VERIFIED'
                : 'MEMBER CARD VERIFIED'}
            </div>

            <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: 800 }}>
              {scanResult.title}
            </h2>
          </div>

          {/* FULL BOOKING RECEPTION SERVICE SHEET */}
          {scanResult.type === 'booking' && scanResult.booking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
              {/* 🚨 HIGH-VISIBILITY PRE-ORDER FOOD & ADD-ONS STAFF ACTION ALERT 🚨 */}
              {scannedBookingAddons && scannedBookingAddons.hasAnyAddons && (
                <div
                  style={{
                    background: scanResult.booking.kitchen_order_placed ? '#ecfdf5' : '#fffbeb',
                    border: scanResult.booking.kitchen_order_placed ? '2px solid #10b981' : '2px solid #f59e0b',
                    borderRadius: '18px',
                    padding: '18px',
                    textAlign: 'left',
                  }}
                >
                  {/* Top Urgent Strip */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: scanResult.booking.kitchen_order_placed ? '#047857' : '#d97706',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <BellRing size={15} />
                      {scanResult.booking.kitchen_order_placed
                        ? '✓ Kitchen / Bar Order Sent & Add-Ons Handed Out'
                        : '🚨 Staff To-Do — Guest Has Pre-Ordered Items!'}
                    </div>

                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: scanResult.booking.kitchen_order_placed ? '#065f46' : '#92400e',
                      }}
                    >
                      Deliver to: <strong>{scanResult.booking.bay_assignment || 'Assigned Bay'}</strong>
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.35,
                      marginBottom: '14px',
                    }}
                  >
                    {scanResult.booking.kitchen_order_placed
                      ? 'Pre-ordered food, drinks & equipment have been sent to Kitchen/Bar.'
                      : 'Please send these pre-ordered items to the Kitchen / Bar right now:'}
                  </div>

                  {/* Pre-Ordered Food & Drinks List */}
                  {scannedBookingAddons.hasFoodPreOrders && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fde68a',
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: scannedBookingAddons.hasEquipmentAddons ? '12px' : '14px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          color: '#b45309',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <Utensils size={15} /> Food & Drinks (Send to Kitchen / Bar):
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {scannedBookingAddons.foodPreOrders.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: '10px',
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: '#d97706',
                                  color: '#ffffff',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                                {item}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: scanResult.booking.kitchen_order_placed ? '#d1fae5' : '#fee2e2',
                                color: scanResult.booking.kitchen_order_placed ? '#065f46' : '#b91c1c',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {scanResult.booking.kitchen_order_placed ? '✓ ORDER SENT' : 'SEND ORDER NOW'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment / Course Add-Ons List */}
                  {scannedBookingAddons.hasEquipmentAddons && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #bae6fd',
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          color: '#0369a1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <PackageCheck size={15} /> Equipment to Hand Over at Desk:
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {scannedBookingAddons.equipmentAddons.map((addon, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#e0f2fe',
                              border: '1px solid #7dd3fc',
                              color: '#0369a1',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.9rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            ✓ {addon}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff 1-Tap Action Button to Confirm Kitchen Order Placed */}
                  {!scanResult.booking.kitchen_order_placed ? (
                    <button
                      type="button"
                      onClick={handleMarkKitchenOrderPlacedOnScan}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #d97706, #ea580c)',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
                      }}
                    >
                      <CheckCheck size={18} /> Confirm: Kitchen / Bar Order Sent & Equipment Handed Out
                    </button>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#d1fae5',
                        border: '1px solid #6ee7b7',
                        color: '#065f46',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    >
                      ✓ Confirmed: Pre-Order Sent to Kitchen/Bar & Equipment Handed Over
                    </div>
                  )}
                </div>
              )}

              {/* 1. Primary Activity & Booking Ref Banner */}
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '18px',
                  padding: '18px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#065f46',
                      background: '#d1fae5',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    Booking Ref: {scanResult.booking.booking_code}
                  </span>

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: '#047857',
                      padding: '4px 12px',
                      borderRadius: '999px',
                    }}
                  >
                    {scanResult.alreadyCheckedIn ? 'Checked In' : '+100 Points Added'}
                  </span>
                </div>

                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                  {scanResult.booking.activity_name}
                </div>
              </div>

              {/* 2. Staff Service Checklist ("How to Serve This Guest") */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#0369a1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={15} /> Staff Steps — How to Serve This Guest:
                </div>
                <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.5 }}>
                  {scanResult.serviceGuide}
                </div>
              </div>

              {/* 3. Full Booking Operational Grid (2x2 + Guest Box) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Guest / Member Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Guest Name</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {scanResult.booking.user_name}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#047857', fontFamily: 'monospace', fontWeight: 700 }}>
                      Member ID: {scanResult.booking.user_member_id}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                    }}
                  >
                    {scanResult.booking.member_tier || 'Silver'} Member
                  </span>
                </div>

                {/* 2x2 Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} style={{ color: '#0284c7' }} /> Date & Time
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                      {scanResult.booking.time}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                      {scanResult.booking.date}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} style={{ color: '#047857' }} /> Bay / Location
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                      {scanResult.booking.bay_assignment || 'Main Course / Bay'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                      {scanResult.booking.duration || '60 mins'}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={14} style={{ color: '#7e22ce' }} /> Players
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                      {scanResult.booking.party_size || 1}{' '}
                      {(scanResult.booking.party_size || 1) === 1 ? 'Player' : 'Players'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                      Confirmed group
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        scanResult.booking.payment_status === 'pay_at_desk' ? '#fffbeb' : '#ecfdf5',
                      border:
                        scanResult.booking.payment_status === 'pay_at_desk'
                          ? '1.5px solid #f59e0b'
                          : '1px solid #a7f3d0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CreditCard size={14} /> Payment Status
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                      {scanResult.booking.price || '£20.00'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color:
                          scanResult.booking.payment_status === 'pay_at_desk' ? '#b45309' : '#047857',
                        marginTop: '2px',
                      }}
                    >
                      {scanResult.booking.payment_status === 'pay_at_desk'
                        ? '⚠️ COLLECT AT DESK'
                        : '✓ ALREADY PAID'}
                    </div>
                  </div>
                </div>

                {/* If Payment is Due at Desk, show a 1-tap Collect Payment button */}
                {scanResult.booking.payment_status === 'pay_at_desk' && (
                  <button
                    type="button"
                    onClick={handleMarkBookingPaidOnScan}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#d97706',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCheck size={18} /> Mark {scanResult.booking.price} Paid at Till
                  </button>
                )}

                {/* Customer Notes / Equipment Extras */}
                {scanResult.booking.notes && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#475569',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ClipboardList size={15} /> Booking Notes:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.5, fontWeight: 600 }}>
                      {scanResult.booking.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEMBER CARD VISIT OR REWARD RESULT */}
          {scanResult.type !== 'booking' && (
            <>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                  Member Details
                </div>
                <div style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, marginTop: '4px' }}>
                  {scanResult.memberName}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#047857', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
                  Member ID: {scanResult.memberId}
                </div>
              </div>

              {scanResult.verifiedReferral && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #f59e0b',
                    padding: '16px',
                    borderRadius: '16px',
                    color: '#92400e',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🤝 FRIEND REFERRAL VERIFIED (1ST VISIT)
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    +200 Bonus Points added to {scanResult.verifiedReferral.friendName} &amp; Referrer!
                  </div>
                </div>
              )}

              {scanResult.type === 'visit' ? (
                <div
                  style={{
                    background: scanResult.alreadyCheckedInToday ? '#fffbeb' : '#ecfdf5',
                    border: scanResult.alreadyCheckedInToday
                      ? '1.5px solid #f59e0b'
                      : '1.5px solid #10b981',
                    padding: '18px',
                    borderRadius: '16px',
                    color: scanResult.alreadyCheckedInToday ? '#92400e' : '#065f46',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                    {scanResult.alreadyCheckedInToday ? 'Already Checked In Today' : 'Visit Points Added'}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px' }}>
                    {scanResult.alreadyCheckedInToday
                      ? '0 Points (Already Credited Today)'
                      : `+${scanResult.pointsAwarded || 100} Points Added`}
                  </div>
                  <div style={{ fontSize: '0.92rem', marginTop: '6px' }}>
                    New Points Balance: <strong>{scanResult.newPoints} PTS</strong>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '2px solid #10b981',
                    padding: '20px',
                    borderRadius: '16px',
                    color: '#065f46',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Please Hand Guest This Item:
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '6px', color: '#0f172a' }}>
                    {scanResult.rewardTitle}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={resetScanner}
              className="btn-primary"
              style={{
                minHeight: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #047857, #10b981)',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              <RefreshCw size={18} /> Scan Next Guest
            </button>

            {scanResult.type === 'booking' && (
              <button
                type="button"
                onClick={() => navigate('/admin/bookings')}
                style={{
                  minHeight: '46px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Go to Today’s Bookings List →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '620px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#b91c1c',
                padding: '14px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 700,
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '22px',
                padding: '20px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                id={`qr-reader-${scannerKey}`}
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#f8fafc',
                }}
              />
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.88rem',
                  color: '#475569',
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={18} style={{ color: '#047857' }} /> Hold the guest’s phone QR code in front of the camera
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '22px',
                padding: '24px 20px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <form onSubmit={handleManualSubmit}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '6px',
                  }}
                >
                  Type the Guest’s Code:
                </label>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
                  You can enter a <strong>Member ID</strong> (e.g. PG-2445B5), a <strong>Booking Ref</strong> (e.g. PG-BK884920), or a <strong>Voucher Code</strong>.
                </p>
                <div style={{ position: 'relative', marginBottom: '18px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. PG-2445B5 or PG-BK884920"
                    autoFocus
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="btn-primary"
                  style={{
                    minHeight: '52px',
                    borderRadius: '14px',
                    background:
                      loading || !manualCode.trim()
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #047857, #10b981)',
                    color: loading || !manualCode.trim() ? '#64748b' : '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: loading || !manualCode.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Looking up details...' : 'Check In / Verify Code'} <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

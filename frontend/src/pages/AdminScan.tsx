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
    const qrPayloadBooking = parseBookingQrPayload(rawQrText);
    const qrPayloadDailyOffer = parseDailyOfferQrPayload(rawQrText);
    const qrText = parseQrText(rawQrText);

    if (!qrText) {
      setError('Invalid or empty QR Code scanned.');
      return;
    }

    setLoading(true);
    setError('');

    try {
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
        } catch {
          /* allow cross-device payload verification even if not in local storage */
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
          if (!alreadyCheckedIn) {
            try {
              const res = await adminApi.logVisit(token, foundBk.user_member_id || foundBk.user_id);
              newPoints = res.new_points;
              await refresh().catch(() => {});
            } catch {
              /* ignore points error */
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
            activityColor: meta?.color || '#10b981',
            memberName: updatedBk.user_name || 'Club Member',
            memberId: updatedBk.user_member_id || qrText,
            newPoints,
            rawCode: updatedBk.booking_code,
          });
        } else {
          setError(`Could not find booking "${upper}". Please check the booking reference code.`);
        }
      } else {
        // 3. Member Digital Card QR Pass (QR_MEMBER_..., PG-..., Member ID, etc.)
        const res = await adminApi.logVisit(token, qrText);
        await refresh().catch(() => {});
        setScanResult({
          type: 'visit',
          title: 'Member Visit Checked In!',
          memberName: res.member_name || 'Member',
          memberId: res.member_id || qrText,
          newPoints: res.new_points,
          rawCode: qrText,
        });
      }
    } catch (err: any) {
      setError(err.message || 'QR Verification failed. Code not recognized.');
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

  const latestBookings = getStoredBookings();
  const bookingWithAddons = latestBookings.find((b) => parseBookingAddons(b.notes).hasAnyAddons);
  const sampleAddonBookingCode = bookingWithAddons?.booking_code || 'PG-BK884920';
  const sampleBookingCode = latestBookings[0]?.booking_code || 'PG-BK109283';

  const scannedBookingAddons =
    scanResult?.type === 'booking' && scanResult?.booking
      ? parseBookingAddons(scanResult.booking.notes)
      : null;

  return (
    <div className="admin-page-container" style={{ color: '#f8fafc', flex: 1 }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#cbd5e1',
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={15} /> Back to Staff Home
      </button>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '6px' }}>
          QR Code & Pass Scanner
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.45 }}>
          Scan a member card, booking pass, or reward voucher to see their full details, pre-ordered food/drinks, and check them in.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      {!scanResult && (
        <div
          style={{
            maxWidth: '620px',
            margin: '0 auto 20px auto',
            width: '100%',
            display: 'flex',
            background: '#111827',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              minHeight: '44px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'camera' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'camera' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Camera size={17} /> Use Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError('');
            }}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'manual' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <KeyRound size={17} /> Type Code Manually
          </button>
        </div>
      )}

      {/* RESULT VIEW */}
      {scanResult ? (
        <div
          style={{
            background: '#111827',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '22px',
            padding: '24px 20px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            maxWidth: '780px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Top Status Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#10b981', display: 'inline-flex', marginBottom: '10px' }}>
              <CheckCircle size={52} />
            </div>

            <div
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#34d399',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}
            >
              {scanResult.type === 'booking'
                ? 'RECEPTION BOOKING PASS VERIFIED'
                : scanResult.type === 'reward'
                ? 'REWARD VOUCHER VERIFIED'
                : 'MEMBER CARD VERIFIED'}
            </div>

            <h2 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800 }}>
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
                    background: scanResult.booking.kitchen_order_placed
                      ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.18), rgba(6, 78, 59, 0.4))'
                      : 'linear-gradient(145deg, rgba(245, 158, 11, 0.24), rgba(220, 38, 38, 0.18))',
                    border: scanResult.booking.kitchen_order_placed
                      ? '2px solid #10b981'
                      : '2px solid #f59e0b',
                    borderRadius: '18px',
                    padding: '18px',
                    boxShadow: scanResult.booking.kitchen_order_placed
                      ? '0 10px 28px rgba(16, 185, 129, 0.25)'
                      : '0 12px 32px rgba(245, 158, 11, 0.3)',
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
                        background: scanResult.booking.kitchen_order_placed ? '#059669' : '#f59e0b',
                        color: scanResult.booking.kitchen_order_placed ? '#ffffff' : '#090d16',
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <BellRing size={15} />
                      {scanResult.booking.kitchen_order_placed
                        ? '✓ Kitchen / Bar Order Placed & Add-Ons Issued'
                        : '🚨 Staff Action Required — Guest Has Arrived!'}
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: scanResult.booking.kitchen_order_placed ? '#6ee7b7' : '#fde68a',
                      }}
                    >
                      Serve / Deliver to: <strong>{scanResult.booking.bay_assignment || 'Assigned Bay'}</strong>
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      lineHeight: 1.35,
                      marginBottom: '14px',
                    }}
                  >
                    {scanResult.booking.kitchen_order_placed
                      ? 'Pre-ordered food, drinks & add-on items have been sent to Kitchen/Bar.'
                      : 'Place order for these pre-ordered items with the Kitchen / Bar right now:'}
                  </div>

                  {/* Pre-Ordered Food & Drinks List */}
                  {scannedBookingAddons.hasFoodPreOrders && (
                    <div
                      style={{
                        background: 'rgba(9, 13, 22, 0.78)',
                        border: '1px solid rgba(251, 191, 36, 0.45)',
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: scannedBookingAddons.hasEquipmentAddons ? '12px' : '14px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          color: '#fbbf24',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <Utensils size={15} /> Pre-Ordered Food & Drinks (Send to Kitchen / Bar Now):
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
                              background: 'rgba(245, 158, 11, 0.14)',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
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
                                  background: '#f59e0b',
                                  color: '#090d16',
                                  fontWeight: 900,
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                                {item}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                padding: '4px 9px',
                                borderRadius: '6px',
                                background: scanResult.booking.kitchen_order_placed
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : 'rgba(239, 68, 68, 0.28)',
                                color: scanResult.booking.kitchen_order_placed ? '#34d399' : '#fca5a5',
                                border: scanResult.booking.kitchen_order_placed
                                  ? '1px solid rgba(16, 185, 129, 0.4)'
                                  : '1px solid rgba(239, 68, 68, 0.45)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {scanResult.booking.kitchen_order_placed ? '✓ ORDER PLACED' : 'PLACE ORDER NOW'}
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
                        background: 'rgba(9, 13, 22, 0.78)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          color: '#38bdf8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <PackageCheck size={15} /> Included Equipment & Course Add-Ons (Issue at Reception):
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {scannedBookingAddons.equipmentAddons.map((addon, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(56, 189, 248, 0.16)',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              color: '#e0f2fe',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.88rem',
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
                        padding: '13px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 6px 20px rgba(234, 88, 12, 0.4)',
                      }}
                    >
                      <CheckCheck size={18} /> Confirm: Kitchen / Bar Order Placed & Add-Ons Issued
                    </button>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        color: '#6ee7b7',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    >
                      ✓ Staff Confirmed: Pre-Order Sent to Kitchen/Bar & Equipment Handed Over
                    </div>
                  )}
                </div>
              )}

              {/* 1. Primary Activity & Booking Ref Banner */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '18px',
                  padding: '18px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#34d399',
                      background: 'rgba(6, 78, 59, 0.6)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    Ref: {scanResult.booking.booking_code}
                  </span>

                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: '#059669',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {scanResult.alreadyCheckedIn ? 'Checked In' : '+100 PTS Awarded'}
                  </span>
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.25 }}>
                  {scanResult.booking.activity_name}
                </div>
              </div>

              {/* 2. Staff Service Checklist ("How to Serve This Guest") */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.38)',
                  borderRadius: '16px',
                  padding: '16px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={15} /> Staff Action — How to Serve Guest:
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fef3c7', fontWeight: 600, lineHeight: 1.5 }}>
                  {scanResult.serviceGuide}
                </div>
              </div>

              {/* 3. Full Booking Operational Grid (2x2 + Guest Box) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
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
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Guest / Member</div>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                      {scanResult.booking.user_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>
                      {scanResult.booking.user_member_id}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#e2e8f0',
                    }}
                  >
                    {scanResult.booking.member_tier || 'Silver'} Tier
                  </span>
                </div>

                {/* 2x2 Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} style={{ color: '#38bdf8' }} /> Date & Time
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                      {scanResult.booking.time}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                      {scanResult.booking.date}
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={13} style={{ color: '#34d399' }} /> Assigned Spot
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                      {scanResult.booking.bay_assignment || 'Main Course / Bay'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Duration: {scanResult.booking.duration || '60 mins'}
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={13} style={{ color: '#c084fc' }} /> Group Size
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                      {scanResult.booking.party_size || 1}{' '}
                      {(scanResult.booking.party_size || 1) === 1 ? 'Player' : 'Players'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Confirmed Party
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        scanResult.booking.payment_status === 'pay_at_desk'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(16, 185, 129, 0.12)',
                      border:
                        scanResult.booking.payment_status === 'pay_at_desk'
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CreditCard size={13} /> Payment
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
                      {scanResult.booking.price || '£20.00'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color:
                          scanResult.booking.payment_status === 'pay_at_desk' ? '#fbbf24' : '#34d399',
                        marginTop: '2px',
                      }}
                    >
                      {scanResult.booking.payment_status === 'pay_at_desk'
                        ? '⚠️ COLLECT AT DESK'
                        : '✓ PAID'}
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
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      background: '#f59e0b',
                      color: '#090d16',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCheck size={17} /> Mark {scanResult.booking.price} Payment Collected
                  </button>
                )}

                {/* Customer Notes / Equipment Extras */}
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#38bdf8',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ClipboardList size={15} /> Full Booking Summary & Notes:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#f8fafc', lineHeight: 1.5, fontWeight: 600 }}>
                    {scanResult.booking.notes || 'Standard reservation — no special equipment requests.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBER CARD VISIT OR REWARD RESULT */}
          {scanResult.type !== 'booking' && (
            <>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700 }}>
                  Member Details
                </div>
                <div style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 800, marginTop: '4px' }}>
                  {scanResult.memberName}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#6ee7b7', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
                  ID: {scanResult.memberId}
                </div>
              </div>

              {scanResult.type === 'visit' ? (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '16px',
                    borderRadius: '16px',
                    color: '#10b981',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700 }}>Visit Points Added</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '4px' }}>
                    +100 PTS Credited
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#a7f3d0', marginTop: '4px' }}>
                    New Balance: <strong>{scanResult.newPoints} PTS</strong>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '16px',
                    borderRadius: '16px',
                    color: '#34d399',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700 }}>Hand Guest This Reward:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px', color: '#ffffff' }}>
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
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}
            >
              <RefreshCw size={18} /> Scan Next Pass
            </button>

            {scanResult.type === 'booking' && (
              <button
                type="button"
                onClick={() => navigate('/admin/bookings')}
                style={{
                  height: '44px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                Open All Bookings →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '620px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '14px 16px',
                borderRadius: '14px',
                fontSize: '0.86rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div
              style={{
                background: '#111827',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                padding: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div
                id={`qr-reader-${scannerKey}`}
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#000000',
                }}
              />
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={15} style={{ color: '#10b981' }} /> Point camera at Member Card, Booking Pass, or Voucher QR
              </div>

              {/* Instant Demo Simulate Scan Button on Camera Tab */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                  Quick Reception Simulation (No Camera Needed):
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSuccessChime();
                    handleScannedQr(sampleAddonBookingCode);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.16)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    borderRadius: '12px',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Utensils size={15} /> Simulate Scan: Booking Pass w/ Pre-Ordered Food & Add-Ons ({sampleAddonBookingCode})
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#111827',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                padding: '22px 18px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
              }}
            >
              <form onSubmit={handleManualSubmit}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    marginBottom: '8px',
                  }}
                >
                  Enter Booking Reference, Member ID, or Voucher Code:
                </label>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. PG-BK884920 or PG-2445B5"
                    autoFocus
                    style={{
                      background: '#090d16',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                  Quick test codes (tap to fill):
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '18px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setManualCode(sampleAddonBookingCode)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245, 158, 11, 0.16)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      borderRadius: '10px',
                      color: '#fbbf24',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Utensils size={13} /> Booking + Food Pre-Order ({sampleAddonBookingCode})
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode(sampleBookingCode)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(56, 189, 248, 0.14)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '10px',
                      color: '#38bdf8',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Booking Pass ({sampleBookingCode})
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode('PG-2445B5')}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '10px',
                      color: '#34d399',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Member Card (PG-2445B5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode('QR_REDEEM_8821A')}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(251, 191, 36, 0.14)',
                      border: '1px solid rgba(251, 191, 36, 0.35)',
                      borderRadius: '10px',
                      color: '#fbbf24',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Reward Voucher (QR_REDEEM_8821A)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="btn-primary"
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    background:
                      loading || !manualCode.trim()
                        ? 'rgba(51, 65, 85, 0.6)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: loading || !manualCode.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Looking up details...' : 'Look Up & Check In'} <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

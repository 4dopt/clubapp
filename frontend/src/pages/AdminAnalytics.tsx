import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Users,
  Calendar,
  Download,
  Lightbulb,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Receipt,
  CreditCard,
  Printer,
  CheckCircle2,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { adminApi, AdminStats, getStoredRedemptions } from '../api';
import { getStoredBookings, syncBookingsFromSupabase, BookingItem, ACTIVITY_METADATA } from '../bookingsStore';
import { useAuth } from '../auth';

type AnalyticsTab = 'payments' | 'overview' | 'traffic' | 'activities' | 'members';
type PaymentPeriod = 'today' | 'yesterday' | 'week' | 'all';

function parsePriceValue(priceStr?: string): number {
  if (!priceStr) return 14;
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 14 : num;
}

export function AdminAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>(() => getStoredBookings());
  const [loading, setLoading] = useState(true);

  const initialTab = (searchParams.get('tab') as AnalyticsTab) || 'payments';
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    ['payments', 'overview', 'traffic', 'activities', 'members'].includes(initialTab) ? initialTab : 'payments'
  );
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('today');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res, synced] = await Promise.all([
          adminApi.stats(token || 'demo-admin-token'),
          syncBookingsFromSupabase(),
        ]);
        setStats(res);
        setBookings(synced);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setBookings(getStoredBookings());
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const handleSync = () => setBookings(getStoredBookings());
    window.addEventListener('playgolf-bookings-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('playgolf-bookings-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
        Loading club reports...
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const totalRevenue = activeBookings.reduce((sum, b) => sum + parsePriceValue(b.price), 0);
  const redemptions = getStoredRedemptions();
  const pendingVouchers = redemptions.filter((r) => !r.fulfilled).length;

  const dailyTrends =
    stats?.daily_trends && stats.daily_trends.length > 0
      ? stats.daily_trends
      : [
          { day: 'Mon', date: 'Mon', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Tue', date: 'Tue', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Wed', date: 'Wed', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Thu', date: 'Thu', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Fri', date: 'Fri', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Sat', date: 'Sat', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
          { day: 'Sun', date: 'Sun', visits: 0, points_earned: 0, points_redeemed: 0, bookings: 0 },
        ];

  const maxDailyVisits = Math.max(...dailyTrends.map((d) => d.visits), 1);
  const busiestDay = [...dailyTrends].sort((a, b) => b.visits - a.visits)[0];

  const hourlyTraffic =
    stats?.hourly_traffic && stats.hourly_traffic.length > 0
      ? stats.hourly_traffic
      : [
          { hour: '08:00', load: 0, visits: 0 },
          { hour: '10:00', load: 0, visits: 0 },
          { hour: '12:00', load: 0, visits: 0 },
          { hour: '14:00', load: 0, visits: 0 },
          { hour: '16:00', load: 0, visits: 0 },
          { hour: '18:00', load: 0, visits: 0 },
          { hour: '20:00', load: 0, visits: 0 },
        ];

  // Activity breakdown
  const activityKeys = Object.keys(ACTIVITY_METADATA);
  const activitySummary = activityKeys.map((actId) => {
    const meta = ACTIVITY_METADATA[actId];
    const matching = activeBookings.filter((b) => b.activity_id === actId);
    const count = matching.length;
    const revenue = matching.reduce((s, b) => s + parsePriceValue(b.price), 0);
    return {
      id: actId,
      name: meta.name,
      shortTag: meta.shortTag,
      count,
      revenue,
      color: meta.color,
      bgTint: meta.bgTint,
    };
  });

  const maxActivityBookings = Math.max(...activitySummary.map((a) => a.count), 1);
  const topActivity = [...activitySummary].sort((a, b) => b.count - a.count)[0] || activitySummary[0];

  // Tier breakdown
  const tierDist = stats?.tiers || { Silver: 0, Gold: 0, Platinum: 0 };
  const totalTierMembers = (tierDist.Silver || 0) + (tierDist.Gold || 0) + (tierDist.Platinum || 0) || 1;

  // Payments & End-of-Day Takings calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  const weekAgoMs = Date.now() - 7 * 86400000;

  const paymentsFilteredBookings = activeBookings.filter((b) => {
    const bDate = (b.date || b.created_at || '').slice(0, 10);
    if (paymentPeriod === 'today') {
      return bDate === todayStr;
    }
    if (paymentPeriod === 'yesterday') {
      return bDate === yesterdayStr;
    }
    if (paymentPeriod === 'week') {
      const ms = new Date(b.created_at || b.date).getTime();
      return !isNaN(ms) ? ms >= weekAgoMs : true;
    }
    return true; // 'all'
  });

  const periodRevenue = paymentsFilteredBookings.reduce((sum, b) => sum + parsePriceValue(b.price), 0);
  const periodCount = paymentsFilteredBookings.length;
  const periodAtv = periodCount > 0 ? periodRevenue / periodCount : 0;

  const onlinePaid = paymentsFilteredBookings.filter((b) => b.payment_status === 'paid' || !b.payment_status);
  const deskPaid = paymentsFilteredBookings.filter((b) => b.payment_status === 'pay_at_desk');
  const compPaid = paymentsFilteredBookings.filter((b) => b.payment_status === 'comp');

  const onlineRevenue = onlinePaid.reduce((sum, b) => sum + parsePriceValue(b.price), 0);
  const deskRevenue = deskPaid.reduce((sum, b) => sum + parsePriceValue(b.price), 0);

  const paymentsByActivity = activityKeys.map((actId) => {
    const meta = ACTIVITY_METADATA[actId];
    const matching = paymentsFilteredBookings.filter((b) => b.activity_id === actId);
    const count = matching.length;
    const rev = matching.reduce((s, b) => s + parsePriceValue(b.price), 0);
    return {
      id: actId,
      name: meta?.name || actId,
      shortTag: meta?.shortTag || actId,
      count,
      revenue: rev,
      pct: periodRevenue > 0 ? Math.round((rev / periodRevenue) * 100) : 0,
      color: meta?.color || '#10b981',
      bgTint: meta?.bgTint || 'rgba(16, 185, 129, 0.14)',
    };
  }).filter((a) => a.count > 0 || paymentPeriod === 'all');

  const handleDownloadPaymentsCSV = () => {
    const periodLabel =
      paymentPeriod === 'today'
        ? `Today (${todayStr})`
        : paymentPeriod === 'yesterday'
        ? `Yesterday (${yesterdayStr})`
        : paymentPeriod === 'week'
        ? 'Past 7 Days'
        : 'All Time';

    const rows = [
      ['PLAYGOLF CLUB — END-OF-DAY PAYMENTS & TILL REPORT'],
      ['Report Period', periodLabel],
      ['Generated At', new Date().toLocaleString('en-GB')],
      ['Total End-of-Day Takings', `£${periodRevenue.toFixed(2)}`],
      ['Total Transactions', String(periodCount)],
      ['Average Spend per Booking (ATV)', `£${periodAtv.toFixed(2)}`],
      ['Paid in App / Online Revenue', `£${onlineRevenue.toFixed(2)} (${onlinePaid.length} transactions)`],
      ['Pay at Reception Desk / Till Revenue', `£${deskRevenue.toFixed(2)} (${deskPaid.length} transactions)`],
      ['Complimentary / VIP Member Bookings', `${compPaid.length} transactions`],
      [],
      ['ITEMIZED TRANSACTIONS JOURNAL (Z-REPORT)'],
      ['Booking Code', 'Date', 'Time', 'Customer Name', 'Member ID', 'Tier', 'Activity', 'Bay / Location', 'Payment Method', 'Price (£)', 'Status'],
      ...paymentsFilteredBookings.map((b) => [
        b.booking_code,
        b.date,
        b.time,
        b.user_name || 'Member',
        b.user_member_id || '',
        b.member_tier || 'Silver',
        b.activity_name,
        b.bay_assignment || 'Assigned at Reception',
        b.payment_status === 'pay_at_desk' ? 'Pay at Desk' : b.payment_status === 'comp' ? 'Comp VIP' : 'Paid Online',
        `£${parsePriceValue(b.price).toFixed(2)}`,
        b.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playgolf-payments-report-${paymentPeriod}-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const rows = [
      ['Report Section', 'Item', 'Value', 'Extra Info'],
      ['Summary', 'Total Registered Members', String(stats?.total_members ?? 0), 'Active accounts'],
      ['Summary', 'Visits Today', String(stats?.visits_today ?? 0), 'Checked in at reception'],
      ['Summary', 'Active Bookings', String(activeBookings.length), `£${totalRevenue.toFixed(2)} total value`],
      ['Summary', 'Points Earned This Week', String(stats?.week_earn_total ?? 0), 'All member points'],
      ['Summary', 'Points Used This Week', String(stats?.week_redeem_total ?? 0), 'Redeemed for perks'],
      ...dailyTrends.map((d) => ['Daily Visits', d.day, `${d.visits} visits`, `${d.bookings} bookings`]),
      ...activitySummary.map((a) => ['Activities', a.name, `${a.count} bookings`, `£${a.revenue.toFixed(2)}`]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playgolf-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page-container">
      {/* Top Back Link & Friendly Page Header */}
      <div>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Club Reports & Insights
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
              End-of-day payments, busy hours, and game breakdowns for club management.
            </p>
          </div>

          <button
            onClick={activeTab === 'payments' ? handleDownloadPaymentsCSV : handleDownloadCSV}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <Download size={16} /> {activeTab === 'payments' ? 'Save Z-Report (CSV)' : 'Save Report (CSV)'}
          </button>
        </div>
      </div>

      {/* 5-Topic Selector Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '8px',
          background: '#111827',
          padding: '8px',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {[
          { id: 'payments', label: 'Payments & Till', icon: <Receipt size={16} />, highlight: true },
          { id: 'overview', label: 'Helpful Tips', icon: <Lightbulb size={16} /> },
          { id: 'traffic', label: 'Busy Hours', icon: <Clock size={16} /> },
          { id: 'activities', label: 'Games & Bays', icon: <Calendar size={16} /> },
          { id: 'members', label: 'Top Members', icon: <Users size={16} /> },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalyticsTab)}
              style={{
                padding: '12px 10px',
                borderRadius: '12px',
                border: isSelected
                  ? tab.highlight
                    ? '1.5px solid #10b981'
                    : '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid transparent',
                background: isSelected
                  ? tab.highlight
                    ? 'rgba(16, 185, 129, 0.22)'
                    : 'rgba(16, 185, 129, 0.18)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? '#34d399' : '#cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: PAYMENTS & END-OF-DAY TAKINGS REPORT */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Date Range Selector Pills */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700 }}>
              <Filter size={15} style={{ color: '#10b981' }} />
              <span>Report Date:</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: `Today (${todayStr})` },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'all', label: 'All Time' },
              ].map((p) => {
                const isSelected = paymentPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaymentPeriod(p.id as PaymentPeriod)}
                    style={{
                      padding: '7px 13px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#34d399' : '#cbd5e1',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary End-of-Day Takings Banner Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, #111827 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              borderRadius: '20px',
              padding: '24px 22px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#34d399', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px' }}>
                  <Receipt size={17} />
                  <span>TOTAL APP TAKINGS ({paymentPeriod.toUpperCase()})</span>
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }}>
                  £{periodRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '8px' }}>
                  Collected from <strong>{periodCount}</strong> {periodCount === 1 ? 'booking' : 'bookings'} • Average spend: <strong>£{periodAtv.toFixed(2)}</strong> per golfer
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadPaymentsCSV}
                  style={{
                    background: '#047857',
                    border: '1px solid #10b981',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.35)',
                  }}
                >
                  <Download size={15} /> Save Z-Report (CSV)
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={15} /> Print Till
                </button>
              </div>
            </div>

            {/* Sub-metrics: Payment Method Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginTop: '22px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 700 }}>Paid Online (App)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                  £{onlineRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{onlinePaid.length} bookings</div>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#7dd3fc', fontWeight: 700 }}>Pay at Reception Desk</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                  £{deskRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{deskPaid.length} bookings</div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#fcd34d', fontWeight: 700 }}>Comp / VIP Perks</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                  {compPaid.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Member passes</div>
              </div>
            </div>
          </div>

          {/* Revenue by Activity Breakdown */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Revenue by Activity
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px' }}>
              Where today's money came from across your bays, course, and coaching.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {paymentsByActivity.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No activity revenue logged for this date.
                </div>
              ) : (
                paymentsByActivity.map((act) => (
                  <div key={act.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: act.color,
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>{act.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({act.count} {act.count === 1 ? 'booking' : 'bookings'})</span>
                      </div>
                      <div style={{ fontWeight: 800, color: '#34d399' }}>
                        £{act.revenue.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>({act.pct}%)</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.06)', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          background: act.color,
                          height: '100%',
                          width: `${Math.min(100, Math.max(4, act.pct))}%`,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Itemized End-of-Day Transaction Journal / Till Roll */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                  End-of-Day Transaction Receipts ({paymentsFilteredBookings.length})
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Full itemized list of customer bookings and payments received.
                </p>
              </div>

              {paymentsFilteredBookings.length > 0 && (
                <button
                  onClick={handleDownloadPaymentsCSV}
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              )}
            </div>

            {paymentsFilteredBookings.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                }}
              >
                <Receipt size={32} style={{ color: '#64748b', margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  No bookings recorded for {paymentPeriod === 'today' ? 'today' : paymentPeriod}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px', margin: '0 auto 14px auto' }}>
                  Try switching the filter pill above to <strong>"Last 7 Days"</strong> or <strong>"All Time"</strong> to inspect previous takings.
                </div>
                <button
                  onClick={() => setPaymentPeriod('all')}
                  style={{
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View All-Time Takings
                </button>
              </div>
            ) : (
              <div className="admin-cards-grid">
                {paymentsFilteredBookings.map((b) => {
                  const priceNum = parsePriceValue(b.price);
                  const isPayAtDesk = b.payment_status === 'pay_at_desk';
                  const isComp = b.payment_status === 'comp';

                  return (
                    <div
                      key={b.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                            {b.user_name || 'Club Member'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#94a3b8',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 6px',
                              borderRadius: '6px',
                            }}
                          >
                            {b.user_member_id || 'PG-MEMBER'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                          {b.activity_name} • <span style={{ color: '#94a3b8' }}>{b.bay_assignment || 'Assigned at Reception'}</span>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🕒 {b.time || '14:00'} ({b.date})</span>
                          <span>•</span>
                          <span>Ref: {b.booking_code}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
                          £{priceNum.toFixed(2)}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isPayAtDesk
                              ? 'rgba(56, 189, 248, 0.15)'
                              : isComp
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isPayAtDesk ? '#38bdf8' : isComp ? '#fbbf24' : '#34d399',
                            border: `1px solid ${
                              isPayAtDesk
                                ? 'rgba(56, 189, 248, 0.3)'
                                : isComp
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(16, 185, 129, 0.3)'
                            }`,
                          }}
                        >
                          {isPayAtDesk ? 'Pay at Desk' : isComp ? 'VIP Comp' : 'Paid in App ✓'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW & HELPFUL TIPS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Club Numbers at a Glance */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Key Numbers This Week
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px' }}>
              A quick look at how the club is performing overall.
            </p>

            <div className="admin-kpi-grid">
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '6px' }}>
                  Booking Value
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>£{totalRevenue}</div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                  From {activeBookings.length} active bookings
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#7dd3fc', fontWeight: 700, marginBottom: '6px' }}>
                  Busiest Day
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>{busiestDay.day}</div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                  {busiestDay.visits} member visits
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#fcd34d', fontWeight: 700, marginBottom: '6px' }}>
                  Top Activity
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.25 }}>
                  {topActivity.shortTag}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px' }}>
                  {topActivity.count} bookings (£{topActivity.revenue})
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#d8b4fe', fontWeight: 700, marginBottom: '6px' }}>
                  Rewards Claimed
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                  {redemptions.length}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                  {pendingVouchers} waiting for pickup
                </div>
              </div>
            </div>
          </div>

          {/* Plain-English Recommendations */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#fbbf24' }} /> Suggested Actions for Staff
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
                Simple recommendations based on your club's recent bookings and visits.
              </p>
            </div>

            {/* Tip 1 */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: '4px solid #10b981',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                1. Evening Rush (4:00 PM – 8:00 PM)
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: '12px' }}>
                Most members arrive between 4 PM and 8 PM. Having bays assigned ahead of time helps keep reception queues short.
              </p>
              <button
                onClick={() => navigate('/admin/bookings')}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Check Today's Bookings <ChevronRight size={15} />
              </button>
            </div>

            {/* Tip 2 */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                2. Quiet Morning Hours (8:00 AM – 11:00 AM)
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: '12px' }}>
                Mornings have plenty of free space. Offering a small reward like a free coffee or extra range balls is a great way to bring members in early.
              </p>
              <button
                onClick={() => navigate('/admin/rewards')}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Manage Club Rewards <ChevronRight size={15} />
              </button>
            </div>

            {/* Tip 3 */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: '4px solid #38bdf8',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                3. Unclaimed Member Points
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: '12px' }}>
                Members earned {(stats?.week_earn_total ?? 0).toLocaleString()} points this week and redeemed {(stats?.week_redeem_total ?? 0).toLocaleString()} points. Remind visiting members they can claim perks in the app!
              </p>
              <button
                onClick={() => navigate('/admin/members')}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                View Member List <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISITS & BUSY HOURS */}
      {activeTab === 'traffic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Daily Visits Bar Chart */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Daily Club Visits (Last 7 Days)
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '22px' }}>
              Shows how many members visited and booked sessions on each day of the week.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '10px',
                alignItems: 'end',
                height: '170px',
                paddingTop: '20px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {dailyTrends.map((d) => {
                const heightPct = d.visits === 0 ? 4 : Math.max(15, Math.round((d.visits / maxDailyVisits) * 100));
                const isPeak = d.visits > 0 && d.day === busiestDay.day;
                return (
                  <div
                    key={d.day}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isPeak ? '#34d399' : '#cbd5e1' }}>
                      {d.visits}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '34px',
                        height: `${heightPct}%`,
                        borderRadius: '8px 8px 4px 4px',
                        background:
                          d.visits === 0
                            ? 'rgba(255, 255, 255, 0.1)'
                            : isPeak
                            ? 'linear-gradient(180deg, #34d399 0%, #059669 100%)'
                            : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginTop: '10px' }}>
              {dailyTrends.map((d) => (
                <div key={d.day} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>{d.day}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{d.bookings} bkgs</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Guide */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              When Is the Club Busiest?
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '20px' }}>
              Use this guide to plan reception cover and bay preparation throughout the day.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {hourlyTraffic.map((slot) => {
                const isBusy = slot.load >= 75;
                const isModerate = slot.load >= 50 && slot.load < 75;
                const label = isBusy ? 'Very Busy' : isModerate ? 'Steady' : 'Quiet';
                const color = isBusy ? '#f59e0b' : isModerate ? '#10b981' : '#38bdf8';

                return (
                  <div
                    key={slot.hour}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '14px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{slot.hour}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color,
                          background: `${color}1f`,
                          border: `1px solid ${color}4d`,
                          padding: '3px 10px',
                          borderRadius: '999px',
                        }}
                      >
                        {label} ({slot.visits} {slot.visits === 1 ? 'session' : 'sessions'})
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${slot.load}%`,
                          height: '100%',
                          background: color,
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POPULAR ACTIVITIES & REVENUE */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Bookings & Revenue by Activity
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '20px' }}>
              See which games and facilities are most popular with members.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activitySummary.map((act) => {
                const widthPct = act.count === 0 ? 0 : Math.max(8, Math.round((act.count / maxActivityBookings) * 100));
                return (
                  <div
                    key={act.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>{act.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          {act.count} confirmed bookings
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>£{act.revenue}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Est. Revenue</div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255, 255, 255, 0.07)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          background: act.color,
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MEMBERS & LOYALTY */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Membership Tiers Breakdown */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Membership Levels
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px' }}>
              Breakdown of members in Silver, Gold, and Platinum tiers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { name: 'Silver', count: tierDist.Silver || 0, color: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.12)' },
                { name: 'Gold', count: tierDist.Gold || 0, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)' },
                { name: 'Platinum', count: tierDist.Platinum || 0, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)' },
              ].map((tier) => (
                <div
                  key={tier.name}
                  style={{
                    background: tier.bg,
                    border: `1px solid ${tier.color}40`,
                    borderRadius: '16px',
                    padding: '16px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: tier.color, marginBottom: '6px' }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff' }}>{tier.count}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                    {Math.round((tier.count / totalTierMembers) * 100)}% of club
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Regular Members */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '20px',
              padding: '22px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                Most Frequent Members
              </h2>
              <button
                onClick={() => navigate('/admin/members')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#34d399',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                See All →
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px' }}>
              Your most active members based on points and club check-ins.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(stats?.top_members || []).map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '15px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '999px',
                        background: idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        color: idx === 0 ? '#fbbf24' : '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {m.tier} Member • {m.visits_count} visits
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#34d399' }}>
                      {m.points.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

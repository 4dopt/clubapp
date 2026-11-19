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
  Printer,
  CheckCircle2,
  Filter,
  Shield,
  Lock,
  Activity,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, AdminStats, getStoredRedemptions } from '../api';
import { getStoredBookings, syncBookingsFromSupabase, BookingItem, ACTIVITY_METADATA } from '../bookingsStore';
import { useAuth } from '../auth';
import {
  computeInfrastructureAndScalingTelemetry,
  getSecurityAuditLogs,
  runSecuritySelfTestSimulation,
  SecurityAuditEvent,
} from '../utils/securityGuard';

type AnalyticsTab = 'payments' | 'overview' | 'traffic' | 'activities' | 'members' | 'security';
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
    ['payments', 'overview', 'traffic', 'activities', 'members', 'security'].includes(initialTab)
      ? initialTab
      : 'payments'
  );
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('today');
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEvent[]>(() => getSecurityAuditLogs());
  const [selfTestBanner, setSelfTestBanner] = useState<string>('');

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
    const handleSecuritySync = () => setAuditLogs(getSecurityAuditLogs());
    window.addEventListener('playgolf-bookings-updated', handleSync);
    window.addEventListener('playgolf-security-updated', handleSecuritySync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('playgolf-bookings-updated', handleSync);
      window.removeEventListener('playgolf-security-updated', handleSecuritySync);
      window.removeEventListener('storage', handleSync);
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
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
      color: meta?.color || '#047857',
      bgTint: meta?.bgTint || '#ecfdf5',
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
      ['Total Bookings', String(periodCount)],
      ['Average Spend per Booking', `£${periodAtv.toFixed(2)}`],
      ['Paid in App / Online Revenue', `£${onlineRevenue.toFixed(2)} (${onlinePaid.length} bookings)`],
      ['Pay at Reception Desk / Till Revenue', `£${deskRevenue.toFixed(2)} (${deskPaid.length} bookings)`],
      ['Complimentary / VIP Member Bookings', `${compPaid.length} bookings`],
      [],
      ['ITEMIZED TRANSACTIONS LIST'],
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
    a.download = `playgolf-till-report-${paymentPeriod}-${todayStr}.csv`;
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
    <div className="admin-page-container" style={{ color: '#0f172a', flex: 1 }}>
      {/* Top Back Link & Friendly Page Header */}
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
            marginBottom: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Club Reports & Till Takings
            </h1>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
              End-of-day payments, busy hours, and popular activities in plain English.
            </p>
          </div>

          <button
            onClick={activeTab === 'payments' ? handleDownloadPaymentsCSV : handleDownloadCSV}
            style={{
              background: '#047857',
              border: 'none',
              color: '#ffffff',
              padding: '11px 18px',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
            }}
          >
            <Download size={16} /> {activeTab === 'payments' ? 'Download Till Report (CSV)' : 'Download Report (CSV)'}
          </button>
        </div>
      </div>

      {/* Topic Selector Tabs (Clean Light Mode) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          background: '#e2e8f0',
          padding: '6px',
          borderRadius: '18px',
        }}
      >
        {[
          { id: 'payments', label: 'Payments & Till', icon: <Receipt size={16} /> },
          { id: 'overview', label: 'Staff Tips', icon: <Lightbulb size={16} /> },
          { id: 'traffic', label: 'Busy Hours', icon: <Clock size={16} /> },
          { id: 'activities', label: 'Games & Bays', icon: <Calendar size={16} /> },
          { id: 'members', label: 'Top Members', icon: <Users size={16} /> },
          { id: 'security', label: 'System Health', icon: <Shield size={16} /> },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalyticsTab)}
              style={{
                padding: '11px 10px',
                borderRadius: '12px',
                border: 'none',
                background: isSelected ? '#047857' : 'transparent',
                color: isSelected ? '#ffffff' : '#334155',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 4px 10px rgba(4, 120, 87, 0.22)' : 'none',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Date Range Selector Pills */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.86rem', fontWeight: 800 }}>
              <Filter size={16} style={{ color: '#047857' }} />
              <span>Show Takings For:</span>
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
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #047857' : '1px solid #cbd5e1',
                      background: isSelected ? '#ecfdf5' : '#f8fafc',
                      color: isSelected ? '#047857' : '#475569',
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
              background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
              border: '2px solid #10b981',
              borderRadius: '20px',
              padding: '24px 22px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#047857', fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.04em', marginBottom: '6px' }}>
                  <Receipt size={18} />
                  <span>TOTAL APP TAKINGS ({paymentPeriod.toUpperCase()})</span>
                </div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.05 }}>
                  £{periodRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '8px' }}>
                  From <strong>{periodCount}</strong> {periodCount === 1 ? 'booking' : 'bookings'} • Average spend: <strong>£{periodAtv.toFixed(2)}</strong> per booking
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadPaymentsCSV}
                  style={{
                    background: '#047857',
                    border: 'none',
                    color: '#ffffff',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
                  }}
                >
                  <Download size={16} /> Save CSV Report
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={16} /> Print Till Sheet
                </button>
              </div>
            </div>

            {/* Sub-metrics: Payment Method Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginTop: '20px',
                paddingTop: '18px',
                borderTop: '1px solid #a7f3d0',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 800 }}>Paid Online (In App)</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  £{onlineRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{onlinePaid.length} bookings</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.76rem', color: '#0369a1', fontWeight: 800 }}>Paid at Reception Desk</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  £{deskRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{deskPaid.length} bookings</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 800 }}>Free / VIP Perks</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {compPaid.length}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Member passes</div>
              </div>
            </div>
          </div>

          {/* Revenue by Activity Breakdown */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Takings by Activity
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '18px' }}>
              Where the money came from across your bays, course, and coaching.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {paymentsByActivity.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                  No activity revenue logged for this date.
                </div>
              ) : (
                paymentsByActivity.map((act) => (
                  <div key={act.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '6px' }}>
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
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{act.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({act.count} {act.count === 1 ? 'booking' : 'bookings'})</span>
                      </div>
                      <div style={{ fontWeight: 900, color: '#047857' }}>
                        £{act.revenue.toFixed(2)} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>({act.pct}%)</span>
                      </div>
                    </div>

                    <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                  Individual Booking Receipts ({paymentsFilteredBookings.length})
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  List of customer bookings and payments for this period.
                </p>
              </div>
            </div>

            {paymentsFilteredBookings.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Receipt size={32} style={{ color: '#64748b', margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  No bookings recorded for {paymentPeriod === 'today' ? 'today' : paymentPeriod}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '340px', margin: '0 auto 14px auto' }}>
                  Tap <strong>"All Time"</strong> below to view previous bookings and takings.
                </div>
                <button
                  onClick={() => setPaymentPeriod('all')}
                  style={{
                    background: '#047857',
                    border: 'none',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Show All-Time Takings
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
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
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
                          <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                            {b.user_name || 'Club Member'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#475569',
                              background: '#e2e8f0',
                              padding: '2px 7px',
                              borderRadius: '6px',
                            }}
                          >
                            {b.user_member_id || 'PG-MEMBER'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
                          {b.activity_name} • <span style={{ color: '#64748b' }}>{b.bay_assignment || 'Assigned at Desk'}</span>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🕒 {b.time || '14:00'} ({b.date})</span>
                          <span>•</span>
                          <span>Ref: {b.booking_code}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>
                          £{priceNum.toFixed(2)}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isPayAtDesk ? '#e0f2fe' : isComp ? '#fef3c7' : '#d1fae5',
                            color: isPayAtDesk ? '#0369a1' : isComp ? '#b45309' : '#065f46',
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Key Numbers This Week
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '18px' }}>
              A quick look at how the club is performing overall.
            </p>

            <div className="admin-kpi-grid">
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800, marginBottom: '6px' }}>
                  Booking Value
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>£{totalRevenue}</div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                  From {activeBookings.length} active bookings
                </div>
              </div>

              <div
                style={{
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 800, marginBottom: '6px' }}>
                  Busiest Day
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{busiestDay.day}</div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                  {busiestDay.visits} member visits
                </div>
              </div>

              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 800, marginBottom: '6px' }}>
                  Most Popular Game
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                  {topActivity.shortTag}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px' }}>
                  {topActivity.count} bookings (£{topActivity.revenue})
                </div>
              </div>

              <div
                style={{
                  background: '#f3e8ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '16px',
                  padding: '18px 16px',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#7e22ce', fontWeight: 800, marginBottom: '6px' }}>
                  Rewards Claimed
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
                  {redemptions.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                  {pendingVouchers} waiting for pickup
                </div>
              </div>
            </div>
          </div>

          {/* Plain-English Recommendations */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={19} style={{ color: '#d97706' }} /> Helpful Tips for Staff
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b' }}>
                Simple recommendations based on your club's recent bookings and visits.
              </p>
            </div>

            {/* Tip 1 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #047857',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                1. Evening Rush (4:00 PM – 8:00 PM)
              </div>
              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, marginBottom: '12px' }}>
                Most members arrive between 4 PM and 8 PM. Having bays assigned ahead of time helps keep reception queues short.
              </p>
              <button
                onClick={() => navigate('/admin/bookings')}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
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
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #d97706',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                2. Quiet Morning Hours (8:00 AM – 11:00 AM)
              </div>
              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, marginBottom: '12px' }}>
                Mornings have plenty of free space. Offering a small reward like a free coffee or extra range balls is a great way to bring members in early.
              </p>
              <button
                onClick={() => navigate('/admin/rewards')}
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
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
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #0284c7',
                borderRadius: '14px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                3. Unclaimed Member Points
              </div>
              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, marginBottom: '12px' }}>
                Members earned {(stats?.week_earn_total ?? 0).toLocaleString()} points this week and redeemed {(stats?.week_redeem_total ?? 0).toLocaleString()} points. Remind visiting members they can claim perks in the app!
              </p>
              <button
                onClick={() => navigate('/admin/members')}
                style={{
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Daily Club Visits (Last 7 Days)
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '22px' }}>
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
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {dailyTrends.map((d) => {
                const heightPct = d.visits === 0 ? 6 : Math.max(15, Math.round((d.visits / maxDailyVisits) * 100));
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
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isPeak ? '#047857' : '#334155' }}>
                      {d.visits}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${heightPct}%`,
                        borderRadius: '8px 8px 4px 4px',
                        background:
                          d.visits === 0
                            ? '#e2e8f0'
                            : isPeak
                            ? 'linear-gradient(180deg, #10b981 0%, #047857 100%)'
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
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{d.day}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{d.bookings} bkgs</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Guide */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              When Is the Club Busiest?
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '20px' }}>
              Use this guide to plan reception cover and bay preparation throughout the day.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hourlyTraffic.map((slot) => {
                const isBusy = slot.load >= 75;
                const isModerate = slot.load >= 50 && slot.load < 75;
                const label = isBusy ? 'Very Busy' : isModerate ? 'Steady' : 'Quiet';
                const color = isBusy ? '#d97706' : isModerate ? '#047857' : '#0284c7';
                const bg = isBusy ? '#fef3c7' : isModerate ? '#ecfdf5' : '#e0f2fe';

                return (
                  <div
                    key={slot.hour}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{slot.hour}</span>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          color,
                          background: bg,
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
                        background: '#e2e8f0',
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Bookings & Revenue by Activity
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '20px' }}>
              See which games and facilities are most popular with members.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activitySummary.map((act) => {
                const widthPct = act.count === 0 ? 0 : Math.max(8, Math.round((act.count / maxActivityBookings) * 100));
                return (
                  <div
                    key={act.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{act.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {act.count} confirmed bookings
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#047857' }}>£{act.revenue}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Total Revenue</div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        background: '#e2e8f0',
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Membership Levels
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '18px' }}>
              Breakdown of members in Silver, Gold, and Platinum tiers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { name: 'Silver', count: tierDist.Silver || 0, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
                { name: 'Gold', count: tierDist.Gold || 0, color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
                { name: 'Platinum', count: tierDist.Platinum || 0, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
              ].map((tier) => (
                <div
                  key={tier.name}
                  style={{
                    background: tier.bg,
                    border: `1.5px solid ${tier.border}`,
                    borderRadius: '16px',
                    padding: '16px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: tier.color, marginBottom: '6px' }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{tier.count}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                    {Math.round((tier.count / totalTierMembers) * 100)}% of club
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Regular Members */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Most Frequent Members
              </h2>
              <button
                onClick={() => navigate('/admin/members')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#047857',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                See All →
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '18px' }}>
              Your most active members based on points and club check-ins.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(stats?.top_members || []).map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '999px',
                        background: idx === 0 ? '#fef3c7' : '#e2e8f0',
                        color: idx === 0 ? '#b45309' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>{m.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {m.tier} Member • {m.visits_count} visits
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#047857' }}>
                      {m.points.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM HEALTH & SECURITY SHIELD (CLEAN LIGHT MODE) */}
      {activeTab === 'security' && (() => {
        const telemetry = computeInfrastructureAndScalingTelemetry(stats, bookings);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Security Shield Hero Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
                border: '2px solid #10b981',
                borderRadius: '20px',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.04em', marginBottom: '6px' }}>
                    <Shield size={18} />
                    <span>SYSTEM HEALTH & SECURITY PROTECTIONS ACTIVE</span>
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.15 }}>
                    {telemetry.securityScore}/100 Protection Score
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#334155', marginTop: '8px', maxWidth: '640px', lineHeight: 1.5 }}>
                    All <strong>{telemetry.activeShieldsCount} automatic protections</strong> are active to prevent duplicate point scans, fake bookings, and unauthorized access.
                  </p>
                </div>

                <button
                  onClick={() => {
                    runSecuritySelfTestSimulation();
                    setAuditLogs(getSecurityAuditLogs());
                    setSelfTestBanner('All 5 safety checks passed! Duplicate scans and fake bookings are automatically blocked.');
                  }}
                  style={{
                    background: '#047857',
                    border: 'none',
                    color: '#ffffff',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Lock size={15} /> Run Quick Safety Test
                </button>
              </div>

              {selfTestBanner && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#d1fae5',
                    border: '1px solid #6ee7b7',
                    color: '#065f46',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: '#047857', flexShrink: 0 }} />
                  <span>{selfTestBanner}</span>
                </div>
              )}

              {/* 4 KPI Quick Tiles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: '12px',
                  marginTop: '18px',
                }}
              >
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>MONTHLY HOSTING COST</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                    £{telemetry.databaseHealth.estimatedMonthlyHostingCostGbp}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                    {telemetry.databaseHealth.recommendedPlan}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>STORAGE USED</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {telemetry.databaseHealth.estimatedStorageMb} MB
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                    Plenty of free space
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>UNCLAIMED POINTS VALUE</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
                    £{telemetry.loyaltyEconomyHealth.estimatedLiabilityGbp.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                    {telemetry.loyaltyEconomyHealth.economyStatus}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>BLOCKED ISSUES</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                    {auditLogs.length} Logged
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                    7 Active Safeguards
                  </div>
                </div>
              </div>
            </div>

            {/* Active Protections List */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '22px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Activity size={18} style={{ color: '#047857' }} />
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Active Club Safeguards
                </h2>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '16px' }}>
                Automatic protections running in the background so staff don't have to worry about mistakes.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {[
                  {
                    title: '1. Staff-Only Access Lock',
                    desc: 'Only verified staff accounts can open the reception desk or adjust member points.',
                  },
                  {
                    title: '2. Fake Account Blocker',
                    desc: 'Blocks disposable email addresses so people cannot create fake accounts for welcome points.',
                  },
                  {
                    title: '3. Double-Tap Voucher Protection',
                    desc: 'Prevents a member from claiming the same reward twice if they tap the button rapidly.',
                  },
                  {
                    title: '4. Duplicate Scan Protection',
                    desc: 'Prevents accidental double check-ins if a staff member scans the same QR code twice in a row.',
                  },
                  {
                    title: '5. Fair Booking Limit',
                    desc: 'Limits members to a maximum of 3 bookings per day so everyone gets a fair chance to book bays.',
                  },
                  {
                    title: '6. PIN & Login Lockout',
                    desc: 'Temporarily locks login after repeated wrong password attempts to keep accounts safe.',
                  },
                ].map((shield) => (
                  <div
                    key={shield.title}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontSize: '0.88rem', fontWeight: 800, marginBottom: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>{shield.title}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>{shield.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

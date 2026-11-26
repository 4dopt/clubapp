import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  BellRing,
  X,
  CheckCheck,
  Gift,
  Calendar,
  Zap,
  Award,
  Shield,
  ChevronRight,
  Smartphone,
  Camera,
  MapPin,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../auth';
import {
  AppNotification,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getPushPreferences,
  savePushPreferences,
  getBrowserNotificationPermission,
  requestPushPermissionAndSubscribe,
  startRealtimePushListener,
  isIosNeedHomeScreenInstall,
} from '../utils/pushNotifications';

function getCategoryIcon(category: AppNotification['category']) {
  switch (category) {
    case 'points':
      return <Award size={17} style={{ color: '#10b981' }} />;
    case 'booking':
      return <Calendar size={17} style={{ color: '#38bdf8' }} />;
    case 'reward':
      return <Gift size={17} style={{ color: '#fbbf24' }} />;
    case 'security':
      return <Shield size={17} style={{ color: '#f87171' }} />;
    default:
      return <Zap size={17} style={{ color: '#f59e0b' }} />;
  }
}

export function NotificationBellButton({ isAdminTheme = false }: { isAdminTheme?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const [prefs, setPrefs] = useState(() => getPushPreferences());
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());
  const [cameraPerm, setCameraPerm] = useState<'granted' | 'denied' | 'prompt'>(() =>
    localStorage.getItem('playgolf.perm_camera') === 'granted' ? 'granted' : 'prompt'
  );
  const [locationPerm, setLocationPerm] = useState<'granted' | 'denied' | 'prompt'>(() =>
    localStorage.getItem('playgolf.perm_location') === 'granted' ? 'granted' : 'prompt'
  );
  const [offlineStoragePerm, setOfflineStoragePerm] = useState<boolean>(() =>
    localStorage.getItem('playgolf.perm_offline_pass') === 'granted'
  );
  const [requestingAll, setRequestingAll] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  // Query live browser Permissions API if supported
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;
    try {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          setCameraPerm('granted');
          localStorage.setItem('playgolf.perm_camera', 'granted');
        } else if (res.state === 'denied') {
          setCameraPerm('denied');
        }
      }).catch(() => {});
    } catch {}
    try {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          setLocationPerm('granted');
          localStorage.setItem('playgolf.perm_location', 'granted');
        } else if (res.state === 'denied') {
          setLocationPerm('denied');
        }
      }).catch(() => {});
    } catch {}
  }, []);

  // Show in-app prompt modal asking user to allow required app permissions when inside the app
  useEffect(() => {
    if (!user || location.pathname === '/login') {
      setShowPermissionPrompt(false);
      return;
    }

    const currentNotifPerm = getBrowserNotificationPermission();
    const alreadyAcceptedAll = localStorage.getItem('playgolf.app_permissions_prompt_done') === 'true';
    const dismissedSession = sessionStorage.getItem('playgolf.notif_prompt_dismissed') === 'true';

    if (alreadyAcceptedAll && currentNotifPerm === 'granted') {
      setShowPermissionPrompt(false);
      return;
    }

    if (!alreadyAcceptedAll && !dismissedSession) {
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      setNotifications(getStoredNotifications(user.id, user.member_id, user.tier));
      setPrefs(getPushPreferences());
      setPermission(getBrowserNotificationPermission());
    };

    refresh();

    const stopRealtime = startRealtimePushListener(user.id, user.member_id, user.tier);

    const handleLivePush = (e: Event) => {
      const custom = e as CustomEvent<AppNotification>;
      if (custom.detail) {
        setLiveToast(custom.detail);
        refresh();
      }
    };

    window.addEventListener('playgolf-notifications-updated', refresh);
    window.addEventListener('playgolf-live-push', handleLivePush);
    window.addEventListener('storage', refresh);

    return () => {
      stopRealtime();
      window.removeEventListener('playgolf-notifications-updated', refresh);
      window.removeEventListener('playgolf-live-push', handleLivePush);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id, user?.member_id, user?.tier]);

  // Auto-dismiss live slide-down push toast after 5.5 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 5500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleEnablePush = async () => {
    setStatusFeedback('');
    const res = await requestPushPermissionAndSubscribe(user.id);
    setPermission(res.permission);
    const updatedPrefs = savePushPreferences({
      enabled: true,
      pointsAlerts: true,
      bookingAlerts: true,
      flashOfferAlerts: true,
    });
    setPrefs(updatedPrefs);
    if (res.granted) {
      setStatusFeedback('Push notifications enabled on this device!');
    } else if (res.reason) {
      setStatusFeedback(res.reason);
    }
  };

  const handleRequestCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraPerm('granted');
      localStorage.setItem('playgolf.perm_camera', 'granted');
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPerm('granted');
      localStorage.setItem('playgolf.perm_camera', 'granted');
      return true;
    } catch {
      setCameraPerm('denied');
      return false;
    }
  };

  const handleRequestLocation = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationPerm('granted');
      localStorage.setItem('playgolf.perm_location', 'granted');
      return true;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPerm('granted');
          localStorage.setItem('playgolf.perm_location', 'granted');
          resolve(true);
        },
        () => {
          setLocationPerm('denied');
          resolve(false);
        },
        { timeout: 6000, maximumAge: 60000 }
      );
    });
  };

  const handleRequestOfflinePassStorage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
    } catch {}
    setOfflineStoragePerm(true);
    localStorage.setItem('playgolf.perm_offline_pass', 'granted');
    return true;
  };

  const handleAllowAllFromPromptModal = async () => {
    setRequestingAll(true);
    try {
      // 1. Notifications
      const res = await requestPushPermissionAndSubscribe(user.id);
      setPermission(res.permission);
      const updatedPrefs = savePushPreferences({
        enabled: true,
        pointsAlerts: true,
        bookingAlerts: true,
        flashOfferAlerts: true,
      });
      setPrefs(updatedPrefs);

      // 2. Offline Pass & Club Terms Storage
      await handleRequestOfflinePassStorage();

      // 3. Location Services (if not already granted)
      if (locationPerm !== 'granted') {
        await handleRequestLocation();
      }

      // 4. Camera Access (if on admin/scanner or user wants QR scanning ready)
      if (cameraPerm !== 'granted') {
        await handleRequestCamera();
      }

      localStorage.setItem('playgolf.notifications_allowed_prompt_done', 'true');
      localStorage.setItem('playgolf.app_permissions_prompt_done', 'true');
      setShowPermissionPrompt(false);
    } finally {
      setRequestingAll(false);
    }
  };

  const handleDismissPromptModal = () => {
    sessionStorage.setItem('playgolf.notif_prompt_dismissed', 'true');
    setShowPermissionPrompt(false);
  };

  const isNotifAllowed = permission === 'granted' || prefs.enabled;

  const overlays =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {/* In-App App Permissions & Conditions Pop-Up Modal */}
            {showPermissionPrompt && !open && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(9, 13, 22, 0.82)',
                  backdropFilter: 'blur(7px)',
                  WebkitBackdropFilter: 'blur(7px)',
                  zIndex: 10040,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '16px',
                  overflowY: 'auto',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'linear-gradient(160deg, #0f172a 0%, #111c30 100%)',
                    border: '1.5px solid rgba(16, 185, 129, 0.45)',
                    borderRadius: '24px',
                    padding: '22px 20px',
                    color: '#ffffff',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '17px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(4, 120, 87, 0.4) 100%)',
                      border: '1px solid rgba(52, 211, 153, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <Shield size={25} style={{ color: '#34d399' }} />
                  </div>

                  <div
                    style={{
                      display: 'inline-block',
                      background: 'rgba(16, 185, 129, 0.16)',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                      color: '#34d399',
                      fontSize: '0.67rem',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      marginBottom: '6px',
                    }}
                  >
                    APP PERMISSIONS &amp; CLUB ACCESS
                  </div>

                  <h3 style={{ fontSize: '1.18rem', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0' }}>
                    Allow App Permissions
                  </h3>

                  <p style={{ fontSize: '0.79rem', color: '#cbd5e1', lineHeight: 1.45, margin: '0 0 16px 0' }}>
                    Please allow the permissions below so your digital pass, QR scanner, and real-time loyalty points work seamlessly:
                  </p>

                  {/* Interactive Permission Rows */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '9px',
                      textAlign: 'left',
                      marginBottom: '18px',
                    }}
                  >
                    {/* 1. Push Notifications */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: isNotifAllowed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        border: isNotifAllowed ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <BellRing size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                            Push Notifications
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>
                            Instant +100/+200 PTS scan alerts, booking passes &amp; 2× flash deals
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        style={{
                          background: isNotifAllowed ? 'rgba(16, 185, 129, 0.2)' : '#10b981',
                          border: isNotifAllowed ? '1px solid #34d399' : 'none',
                          color: isNotifAllowed ? '#6ee7b7' : '#090d16',
                          borderRadius: '999px',
                          padding: '5px 11px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {isNotifAllowed ? '✓ Allowed' : 'Allow'}
                      </button>
                    </div>

                    {/* 2. Camera Access for QR Scanning */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: cameraPerm === 'granted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        border: cameraPerm === 'granted' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Camera size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                            Camera Access
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>
                            Required for scanning QR club passes, range bay codes &amp; vouchers
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestCamera}
                        style={{
                          background: cameraPerm === 'granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          border: cameraPerm === 'granted' ? '1px solid #34d399' : '1px solid rgba(56, 189, 248, 0.45)',
                          color: cameraPerm === 'granted' ? '#6ee7b7' : '#7dd3fc',
                          borderRadius: '999px',
                          padding: '5px 11px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {cameraPerm === 'granted' ? '✓ Allowed' : 'Allow'}
                      </button>
                    </div>

                    {/* 3. Location Services */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: locationPerm === 'granted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        border: locationPerm === 'granted' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <MapPin size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                            Location Services
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>
                            Northwick Park arrival detection, course weather &amp; Quiet-Time prompts
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestLocation}
                        style={{
                          background: locationPerm === 'granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.18)',
                          border: locationPerm === 'granted' ? '1px solid #34d399' : '1px solid rgba(251, 191, 36, 0.45)',
                          color: locationPerm === 'granted' ? '#6ee7b7' : '#fde68a',
                          borderRadius: '999px',
                          padding: '5px 11px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {locationPerm === 'granted' ? '✓ Allowed' : 'Allow'}
                      </button>
                    </div>

                    {/* 4. Offline Digital Pass & Club Conditions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        background: offlineStoragePerm ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        border: offlineStoragePerm ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <HardDrive size={18} style={{ color: '#a78bfa', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                            Offline Digital Pass &amp; Club Terms
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.3 }}>
                            Keeps your QR membership card &amp; vouchers scannable with zero signal
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestOfflinePassStorage}
                        style={{
                          background: offlineStoragePerm ? 'rgba(16, 185, 129, 0.2)' : 'rgba(167, 139, 250, 0.2)',
                          border: offlineStoragePerm ? '1px solid #34d399' : '1px solid rgba(167, 139, 250, 0.45)',
                          color: offlineStoragePerm ? '#6ee7b7' : '#ddd6fe',
                          borderRadius: '999px',
                          padding: '5px 11px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {offlineStoragePerm ? '✓ Active' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={requestingAll}
                      onClick={handleAllowAllFromPromptModal}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '13px 16px',
                        borderRadius: '14px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 10px 24px rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <CheckCircle2 size={18} />
                      <span>{requestingAll ? 'Enabling Permissions...' : 'Allow All & Continue'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDismissPromptModal}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        padding: '7px',
                        fontSize: '0.77rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Continue with Current Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Native-Style Slide-Down Live Push Banner Toast */}
            {liveToast && (
              <div
                style={{
                  position: 'fixed',
                  top: '14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 'calc(100% - 24px)',
                  maxWidth: '420px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.55)',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
                  zIndex: 10050,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  markNotificationAsRead(liveToast.id);
                  const targetUrl = liveToast.action_url || '/dashboard';
                  setLiveToast(null);
                  setOpen(false);
                  navigate(targetUrl);
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(liveToast.category)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.04em' }}>
                    PLAYGOLF PUSH ALERT • NOW
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {liveToast.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.4 }}>
                    {liveToast.body}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLiveToast(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Notification Center Modal / Drawer (Rendered via Portal at document.body) */}
            {open && (
              <div
                onClick={() => setOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(9, 13, 22, 0.75)',
                  backdropFilter: 'blur(5px)',
                  WebkitBackdropFilter: 'blur(5px)',
                  zIndex: 10000,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  padding: '16px',
                  overflowY: 'auto',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '22px',
                    padding: '20px 18px',
                    color: '#ffffff',
                    marginTop: '48px',
                    marginBottom: '24px',
                    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BellRing size={19} style={{ color: '#34d399' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                        Push Notifications
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllNotificationsAsRead(user.id, user.member_id, user.tier)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399',
                            borderRadius: '999px',
                            padding: '5px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <CheckCheck size={13} /> Mark all read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: '#cbd5e1',
                          width: '32px',
                          height: '32px',
                          borderRadius: '999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Device Push Permission & One-Tap Test Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '16px',
                      padding: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>
                          <Smartphone size={15} />
                          <span>
                            {permission === 'granted'
                              ? 'Lock-Screen Push Active'
                              : 'Enable Lock-Screen Push Alerts'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.4 }}>
                          {isIosNeedHomeScreenInstall()
                            ? 'On iPhone: tap Share → "Add to Home Screen" to unlock iOS lock-screen push.'
                            : 'Get instant alerts when staff scan your QR pass, confirm bookings, or drop 2× points.'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {permission !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleEnablePush}
                            style={{
                              background: '#10b981',
                              border: 'none',
                              color: '#090d16',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.76rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                            }}
                          >
                            Allow Push Alerts
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setShowPermissionPrompt(true);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#e2e8f0',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Shield size={13} style={{ color: '#34d399' }} />
                          <span>App Permissions</span>
                        </button>
                      </div>
                    </div>

                    {statusFeedback && (
                      <div style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 700, marginTop: '8px' }}>
                        {statusFeedback}
                      </div>
                    )}

                    {/* Category Preference Pills */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {[
                        { key: 'pointsAlerts', label: 'Points & Check-In' },
                        { key: 'bookingAlerts', label: 'Bookings' },
                        { key: 'flashOfferAlerts', label: '2× Points & Offers' },
                      ].map((item) => {
                        const active = (prefs as any)[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              const updated = savePushPreferences({ [item.key]: !active });
                              setPrefs(updated);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: active ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.12)',
                              background: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                              color: active ? '#6ee7b7' : '#94a3b8',
                            }}
                          >
                            {active ? '✓ ' : ''}{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notification Inbox List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '28px 12px', color: '#94a3b8', fontSize: '0.84rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setOpen(false);
                            if (n.action_url) navigate(n.action_url);
                          }}
                          style={{
                            background: n.read ? 'rgba(255, 255, 255, 0.03)' : 'rgba(16, 185, 129, 0.09)',
                            border: n.read
                              ? '1px solid rgba(255, 255, 255, 0.07)'
                              : '1px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            {getCategoryIcon(n.category)}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>
                                {n.title}
                              </span>
                              {!n.read && (
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '999px',
                                    background: '#10b981',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.4 }}>
                              {n.body}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '5px', fontWeight: 600 }}>
                              {new Date(n.created_at).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          <ChevronRight size={16} style={{ color: '#64748b', alignSelf: 'center', flexShrink: 0 }} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )
      : null;

  return (
    <>
      {/* Header Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open Push Notifications"
        title="Push Notifications & Club Alerts"
        style={{
          position: 'relative',
          background: isAdminTheme ? 'rgba(255, 255, 255, 0.07)' : '#f8fafc',
          border: isAdminTheme ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #e2e8f0',
          color: isAdminTheme ? '#e2e8f0' : '#0f172a',
          width: '36px',
          height: '36px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {unreadCount > 0 ? <BellRing size={17} style={{ color: '#10b981' }} /> : <Bell size={17} />}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              borderRadius: '999px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.66rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isAdminTheme ? '2px solid #0f172a' : '2px solid #ffffff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {overlays}
    </>
  );
}

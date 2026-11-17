import { supabase } from '../supabase';
import { checkRateLimit } from './securityGuard';

export type NotificationCategory = 'points' | 'booking' | 'reward' | 'offer' | 'security';

export interface AppNotification {
  id: string;
  user_id: string | null; // null = broadcast to all members, or specific user_id / member_id, or 'TIER_GOLD_PLATINUM'
  category: NotificationCategory;
  title: string;
  body: string;
  action_url?: string;
  created_at: string;
  read?: boolean;
}

export interface PushPreferences {
  enabled: boolean;
  pointsAlerts: boolean;
  bookingAlerts: boolean;
  flashOfferAlerts: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'playgolf.notifications_inbox';
const READ_IDS_STORAGE_KEY = 'playgolf.notifications_read_ids';
const PUSH_PREFS_STORAGE_KEY = 'playgolf.push_preferences';
const LAST_OS_PUSH_ID_KEY = 'playgolf.last_os_push_id';

export function getPushPreferences(): PushPreferences {
  try {
    const raw = localStorage.getItem(PUSH_PREFS_STORAGE_KEY);
    if (raw) {
      return {
        enabled: true,
        pointsAlerts: true,
        bookingAlerts: true,
        flashOfferAlerts: true,
        ...JSON.parse(raw),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    enabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
    pointsAlerts: true,
    bookingAlerts: true,
    flashOfferAlerts: true,
  };
}

export function savePushPreferences(prefs: Partial<PushPreferences>): PushPreferences {
  const updated = { ...getPushPreferences(), ...prefs };
  try {
    localStorage.setItem(PUSH_PREFS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('playgolf-notifications-updated'));
  } catch {
    /* ignore */
  }
  return updated;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isIosNeedHomeScreenInstall(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return isIOS && !isStandalone && !('Notification' in window);
}

/**
 * Triggers a real OS / Lock-Screen Notification via the PWA Service Worker (or Notification API fallback).
 */
export async function triggerNativeOsNotification(
  title: string,
  body: string,
  actionUrl: string = '/dashboard',
  tag?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || `playgolf_${Date.now()}`,
          data: { url: actionUrl },
        } as NotificationOptions);
        return true;
      }
    }

    const n = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: tag || `playgolf_${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      if (actionUrl) {
        window.location.href = actionUrl;
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests browser/OS Push Notification permission on user tap and registers subscription in Supabase.
 */
export async function requestPushPermissionAndSubscribe(userId?: string): Promise<{
  granted: boolean;
  permission: NotificationPermission | 'unsupported';
  reason?: string;
}> {
  if (isIosNeedHomeScreenInstall()) {
    return {
      granted: false,
      permission: 'unsupported',
      reason: 'On iPhone/iPad: tap Share → "Add to Home Screen" first to enable lock-screen push notifications.',
    };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    savePushPreferences({ enabled: true });
    return {
      granted: true,
      permission: 'unsupported',
      reason: 'In-app real-time push banners enabled (OS notifications not supported in this browser).',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    savePushPreferences({ enabled: granted });

    if (granted) {
      // Save subscription record in Supabase push_subscriptions if table exists
      if (userId) {
        try {
          await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: `webpush://${window.location.host}/${userId}`,
            user_agent: navigator.userAgent.slice(0, 180),
            prefs: getPushPreferences(),
            updated_at: new Date().toISOString(),
          });
        } catch {
          /* ignore if table not yet migrated */
        }
      }

      await triggerNativeOsNotification(
        '⛳ PlayGolf Push Alerts Enabled!',
        'You will now receive instant points check-ins, booking passes, and 2× points flash alerts.',
        '/dashboard',
        'playgolf_welcome_push'
      );
    }

    return {
      granted,
      permission,
      reason: granted
        ? undefined
        : 'Notification permission was blocked by the browser. Click the lock icon in your address bar to allow Notifications.',
    };
  } catch (err: any) {
    return {
      granted: false,
      permission: 'default',
      reason: err?.message || 'Could not request notification permission.',
    };
  }
}

function getReadIdsSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIdsSet(set: Set<string>): void {
  try {
    localStorage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch {
    /* ignore */
  }
}

export function getStoredNotifications(userId?: string, memberId?: string, tier?: string): AppNotification[] {
  const readSet = getReadIdsSet();
  let list: AppNotification[] = [];

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }
  } catch {
    /* ignore */
  }

  if (list.length === 0) {
    const now = Date.now();
    list = [
      {
        id: 'notif_seed_1',
        user_id: null,
        category: 'offer',
        title: '⚡ Quiet-Time 2× Points Active Today',
        body: 'Check in at the Driving Range during off-peak hours (Mon–Thu before 4 PM) to earn double loyalty points!',
        action_url: '/journey',
        created_at: new Date(now - 1000 * 60 * 25).toISOString(),
      },
      {
        id: 'notif_seed_2',
        user_id: null,
        category: 'reward',
        title: '☕ Early Win: 50 PTS Barista Coffee',
        body: 'Redeem your first instant reward in the Rewards Shop with just 50 points.',
        action_url: '/rewards',
        created_at: new Date(now - 1000 * 60 * 120).toISOString(),
      },
    ];
  }

  const prefs = getPushPreferences();

  return list
    .filter((n) => {
      if (n.title && n.title.includes('Live Push Test')) return false;
      // Category preference filter
      if (n.category === 'points' && !prefs.pointsAlerts) return false;
      if (n.category === 'booking' && !prefs.bookingAlerts) return false;
      if (n.category === 'offer' && !prefs.flashOfferAlerts) return false;

      // Target recipient filter
      if (!n.user_id || n.user_id === 'ALL') return true;
      if (n.user_id === 'TIER_VIP' && (tier === 'Gold' || tier === 'Platinum')) return true;
      if (userId && n.user_id.toLowerCase() === userId.toLowerCase()) return true;
      if (memberId && n.user_id.toUpperCase() === memberId.toUpperCase()) return true;
      return false;
    })
    .map((n) => ({
      ...n,
      read: Boolean(n.read || readSet.has(n.id)),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function markNotificationAsRead(notificationId: string): void {
  const set = getReadIdsSet();
  set.add(notificationId);
  saveReadIdsSet(set);
  window.dispatchEvent(new Event('playgolf-notifications-updated'));
}

export function markAllNotificationsAsRead(userId?: string, memberId?: string, tier?: string): void {
  const set = getReadIdsSet();
  const visible = getStoredNotifications(userId, memberId, tier);
  for (const n of visible) {
    set.add(n.id);
  }
  saveReadIdsSet(set);
  window.dispatchEvent(new Event('playgolf-notifications-updated'));
}

/**
 * Dispatches a push notification to local storage, Supabase `notifications` table (for cross-device sync),
 * in-app slide-down toast banner, and native OS notification tray.
 */
export async function sendPushNotification(params: {
  user_id?: string | null; // null or 'ALL' = broadcast to all members
  category: NotificationCategory;
  title: string;
  body: string;
  action_url?: string;
  isBroadcast?: boolean;
}): Promise<AppNotification> {
  if (params.isBroadcast) {
    const rl = checkRateLimit('admin_push_broadcast', 6, 60 * 60 * 1000, 5 * 60 * 1000);
    if (!rl.allowed) {
      throw new Error(
        `Anti-Spam Shield: Maximum 6 club-wide push broadcasts per hour. Please wait ${rl.retryAfterSeconds}s.`
      );
    }
  }

  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: params.user_id ?? null,
    category: params.category,
    title: params.title.trim(),
    body: params.body.trim(),
    action_url: params.action_url || '/dashboard',
    created_at: new Date().toISOString(),
    read: false,
  };

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const existing: AppNotification[] = raw ? JSON.parse(raw) : [];
    const updated = [newNotif, ...existing].slice(0, 60);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(LAST_OS_PUSH_ID_KEY, newNotif.id);
  } catch {
    /* ignore */
  }

  // Trigger in-app live toast banner & state refresh
  window.dispatchEvent(new CustomEvent('playgolf-live-push', { detail: newNotif }));
  window.dispatchEvent(new Event('playgolf-notifications-updated'));

  // Trigger native OS / Service Worker notification if permission is granted
  const prefs = getPushPreferences();
  if (prefs.enabled) {
    triggerNativeOsNotification(newNotif.title, newNotif.body, newNotif.action_url, newNotif.id).catch(() => {});
  }

  // Best-effort sync to Supabase `public.notifications` so other open devices receive it via Realtime
  try {
    await supabase.from('notifications').insert({
      id: newNotif.id,
      user_id: newNotif.user_id,
      category: newNotif.category,
      title: newNotif.title,
      body: newNotif.body,
      action_url: newNotif.action_url,
      created_at: newNotif.created_at,
    });
  } catch {
    /* ignore if table not yet migrated */
  }

  return newNotif;
}

/**
 * Fetches latest notifications from Supabase and subscribes to real-time inserts
 * so members get instant push alerts when staff scan their QR code or broadcast an offer.
 */
export function startRealtimePushListener(
  currentUserId?: string,
  currentMemberId?: string,
  currentTier?: string
): () => void {
  // 1. Initial pull from Supabase notifications table if available
  supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40)
    .then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        try {
          const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
          const localList: AppNotification[] = raw ? JSON.parse(raw) : [];
          const byId = new Map<string, AppNotification>();
          for (const item of localList) byId.set(item.id, item);
          for (const rem of data) {
            byId.set(rem.id, {
              id: rem.id,
              user_id: rem.user_id,
              category: (rem.category as NotificationCategory) || 'offer',
              title: rem.title,
              body: rem.body,
              action_url: rem.action_url || '/dashboard',
              created_at: rem.created_at,
            });
          }
          const merged = Array.from(byId.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 60);
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new Event('playgolf-notifications-updated'));
        } catch {
          /* ignore */
        }
      }
    }, () => {});

  // 2. Subscribe to Supabase Realtime INSERTs on public.notifications
  const channel = supabase
    .channel('playgolf-live-push-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const row = payload.new as any;
        if (!row || !row.id) return;

        // Avoid duplicate firing if this browser tab created it
        if (localStorage.getItem(LAST_OS_PUSH_ID_KEY) === row.id) return;

        const target = row.user_id;
        const isForMe =
          !target ||
          target === 'ALL' ||
          (target === 'TIER_VIP' && (currentTier === 'Gold' || currentTier === 'Platinum')) ||
          (currentUserId && String(target).toLowerCase() === currentUserId.toLowerCase()) ||
          (currentMemberId && String(target).toUpperCase() === currentMemberId.toUpperCase());

        if (!isForMe) return;

        const incoming: AppNotification = {
          id: row.id,
          user_id: row.user_id,
          category: (row.category as NotificationCategory) || 'offer',
          title: row.title || 'PlayGolf Club Alert',
          body: row.body || '',
          action_url: row.action_url || '/dashboard',
          created_at: row.created_at || new Date().toISOString(),
          read: false,
        };

        try {
          const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
          const existing: AppNotification[] = raw ? JSON.parse(raw) : [];
          if (!existing.some((e) => e.id === incoming.id)) {
            localStorage.setItem(
              NOTIFICATIONS_STORAGE_KEY,
              JSON.stringify([incoming, ...existing].slice(0, 60))
            );
          }
          localStorage.setItem(LAST_OS_PUSH_ID_KEY, incoming.id);
        } catch {
          /* ignore */
        }

        window.dispatchEvent(new CustomEvent('playgolf-live-push', { detail: incoming }));
        window.dispatchEvent(new Event('playgolf-notifications-updated'));

        if (getPushPreferences().enabled) {
          triggerNativeOsNotification(incoming.title, incoming.body, incoming.action_url, incoming.id).catch(
            () => {}
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}

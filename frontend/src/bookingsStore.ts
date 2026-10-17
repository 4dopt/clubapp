import {
  fetchBookingsFromSupabase,
  saveBookingToSupabase,
  updateBookingStatusInSupabase,
} from './supabaseService';

export interface BookingItem {
  id: string;
  booking_code: string;
  user_id: string;
  user_name: string;
  user_member_id: string;
  member_tier?: 'Silver' | 'Gold' | 'Platinum';
  activity_id: string;
  activity_name: string;
  date: string;
  time: string;
  duration?: string;
  party_size?: number;
  bay_assignment?: string;
  payment_status?: 'paid' | 'pay_at_desk' | 'comp';
  price?: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  created_at: string;
  checked_in_at?: string;
}

const STORAGE_KEY = 'playgolf.bookings';

export const ACTIVITY_METADATA: Record<
  string,
  {
    name: string;
    shortTag: string;
    category: string;
    defaultDuration: string;
    defaultBay: string;
    defaultPrice: string;
    color: string;
    bgTint: string;
    serviceInstructions: string;
  }
> = {
  'driving-range': {
    name: 'TrackMan 4 Driving Range Bay',
    shortTag: 'DRIVING RANGE',
    category: 'TrackMan Radar Range Bay',
    defaultDuration: '60 mins',
    defaultBay: 'TrackMan Bay 12',
    defaultPrice: '£14.00',
    color: '#10b981',
    bgTint: 'rgba(16, 185, 129, 0.14)',
    serviceInstructions: 'Issue range ball token/basket & direct guest to their assigned TrackMan bay.',
  },
  'nine-holes': {
    name: '9 Holes Championship Course',
    shortTag: '9-HOLE COURSE',
    category: 'Course Tee Time',
    defaultDuration: '120 mins',
    defaultBay: 'Tee 1 (Championship)',
    defaultPrice: '£28.00',
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.14)',
    serviceInstructions: 'Issue course scorecard, check any buggy/club hire extras, and direct to Tee 1.',
  },
  'putt-crazy': {
    name: 'Putt Crazy Adventure Minigolf',
    shortTag: 'ADVENTURE MINIGOLF',
    category: '18-Hole Crazy Golf',
    defaultDuration: '2 Course Laps',
    defaultBay: 'Adventure Course A',
    defaultPrice: '£12.00',
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.14)',
    serviceInstructions: 'Hand guest official scorecard, pencils & age-colored putters (2 full course laps included).',
  },
  'darts-interactive': {
    name: 'Darts Interactive Lane',
    shortTag: 'AR TARGET DARTS',
    category: 'Smart AR Social Lane',
    defaultDuration: '60 mins',
    defaultBay: 'AR Darts Lane 2',
    defaultPrice: '£20.00',
    color: '#a78bfa',
    bgTint: 'rgba(167, 139, 250, 0.14)',
    serviceInstructions: 'Issue 3x steel-tip darts set, unlock tablet at assigned AR Darts Lane, and check drinks add-ons.',
  },
  'golf-coaching': {
    name: 'PGA Golf Coaching & Lesson',
    shortTag: 'PGA PRO LESSON',
    category: '1-on-1 Studio Coaching',
    defaultDuration: '60 mins',
    defaultBay: 'TrackMan Studio 1',
    defaultPrice: '£65.00',
    color: '#34d399',
    bgTint: 'rgba(52, 211, 153, 0.14)',
    serviceInstructions: 'Notify PGA Coaching Pro on duty and escort member to TrackMan Studio.',
  },
  'club-fitting': {
    name: 'Custom Club Fitting Session',
    shortTag: 'CUSTOM FITTING',
    category: 'Pro Equipment Lab',
    defaultDuration: '90 mins',
    defaultBay: 'Fitting Lab Bay 1',
    defaultPrice: '£50.00',
    color: '#f472b6',
    bgTint: 'rgba(244, 114, 182, 0.14)',
    serviceInstructions: 'Direct member to Custom Fitting Lab Bay 1 and alert Pro Shop specialist.',
  },
};

const todayStr = new Date().toISOString().split('T')[0];

export function enrichBookingItem(b: BookingItem): BookingItem {
  const meta = ACTIVITY_METADATA[b.activity_id];
  return {
    ...b,
    duration: b.duration || meta?.defaultDuration || '60 mins',
    party_size: b.party_size || (b.notes?.includes('6') ? 6 : b.notes?.includes('4') ? 4 : b.notes?.includes('2') ? 2 : 1),
    bay_assignment: b.bay_assignment || meta?.defaultBay || 'Assigned at Reception',
    payment_status: b.payment_status || 'paid',
    member_tier: b.member_tier || 'Silver',
    price: b.price || meta?.defaultPrice || '£20.00',
  };
}

function isDemoBooking(b: BookingItem): boolean {
  return Boolean(b?.id && b.id.startsWith('bk_demo_'));
}

export function getStoredBookings(): BookingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BookingItem[];
    if (!Array.isArray(parsed)) return [];
    const realOnly = parsed.filter((b) => !isDemoBooking(b)).map(enrichBookingItem);
    if (realOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
    }
    return realOnly;
  } catch {
    return [];
  }
}

export function saveStoredBookings(bookings: BookingItem[]): void {
  try {
    const realOnly = bookings.filter((b) => !isDemoBooking(b));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
    window.dispatchEvent(new Event('playgolf-bookings-updated'));
  } catch {
    /* ignore */
  }
}

/**
 * Syncs local bookings with Supabase database so bookings created on the Member side
 * (on any tab, browser, or account) always appear on the Admin side.
 */
export async function syncBookingsFromSupabase(): Promise<BookingItem[]> {
  const localList = getStoredBookings();
  try {
    const remoteList = await fetchBookingsFromSupabase();
    if (!remoteList || remoteList.length === 0) {
      return localList;
    }

    const byCode = new Map<string, BookingItem>();

    // First index real local bookings
    for (const loc of localList) {
      if (!isDemoBooking(loc)) {
        byCode.set(loc.booking_code.toUpperCase(), enrichBookingItem(loc));
      }
    }

    // Merge remote Supabase bookings (remote user bookings + updated statuses)
    const remoteCodes = new Set<string>();
    for (const rem of remoteList) {
      const code = (rem.booking_code || '').toUpperCase();
      if (!code || isDemoBooking(rem)) continue;
      remoteCodes.add(code);
      const existingLocal = byCode.get(code);
      const enrichedRemote = enrichBookingItem(rem);

      if (existingLocal) {
        const finalStatus =
          existingLocal.status !== 'confirmed' ? existingLocal.status : enrichedRemote.status;
        byCode.set(code, {
          ...existingLocal,
          ...enrichedRemote,
          status: finalStatus,
          duration: enrichedRemote.duration || existingLocal.duration,
          party_size: enrichedRemote.party_size || existingLocal.party_size,
          bay_assignment: enrichedRemote.bay_assignment || existingLocal.bay_assignment,
          price: enrichedRemote.price || existingLocal.price,
          payment_status: enrichedRemote.payment_status || existingLocal.payment_status,
        });
      } else {
        byCode.set(code, enrichedRemote);
      }
    }

    // Push any local user-created bookings that aren't in Supabase yet
    for (const loc of localList) {
      const code = loc.booking_code.toUpperCase();
      if (!isDemoBooking(loc) && !remoteCodes.has(code)) {
        saveBookingToSupabase(loc).catch(() => {});
      }
    }

    const merged = Array.from(byCode.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return localList;
  }
}

export function createBooking(params: {
  user_id: string;
  user_name: string;
  user_member_id: string;
  member_tier?: 'Silver' | 'Gold' | 'Platinum';
  activity_id: string;
  activity_name: string;
  date: string;
  time: string;
  duration?: string;
  party_size?: number;
  bay_assignment?: string;
  payment_status?: 'paid' | 'pay_at_desk' | 'comp';
  price?: string;
  notes?: string;
}): BookingItem {
  const bookings = getStoredBookings();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const meta = ACTIVITY_METADATA[params.activity_id];

  const newBk: BookingItem = {
    id: 'bk_' + Date.now(),
    booking_code: `PG-BK${randomNum}`,
    user_id: params.user_id,
    user_name: params.user_name,
    user_member_id: params.user_member_id,
    member_tier: params.member_tier || 'Silver',
    activity_id: params.activity_id,
    activity_name: params.activity_name || meta?.name || params.activity_id,
    date: params.date,
    time: params.time,
    duration: params.duration || meta?.defaultDuration || '60 mins',
    party_size: params.party_size || 2,
    bay_assignment: params.bay_assignment || meta?.defaultBay || 'Assigned at Reception',
    payment_status: params.payment_status || 'paid',
    price: params.price || meta?.defaultPrice || '£25.00',
    status: 'confirmed',
    notes: params.notes || '',
    created_at: new Date().toISOString(),
  };

  const updated = [newBk, ...bookings];
  saveStoredBookings(updated);

  // Sync to Supabase DB
  saveBookingToSupabase(newBk).catch(() => {});

  return newBk;
}

export function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
): BookingItem | null {
  const bookings = getStoredBookings();
  let updatedBooking: BookingItem | null = null;
  const updated = bookings.map((b) => {
    if (b.id === bookingId) {
      updatedBooking = {
        ...b,
        status,
        checked_in_at: status === 'completed' ? new Date().toISOString() : b.checked_in_at,
      };
      return updatedBooking;
    }
    return b;
  });

  saveStoredBookings(updated);

  // Sync status update to Supabase DB
  updateBookingStatusInSupabase(bookingId, status).catch(() => {});

  return updatedBooking;
}

export function updateBookingDetails(
  bookingId: string,
  updates: Partial<BookingItem>
): BookingItem | null {
  const bookings = getStoredBookings();
  let updatedBooking: BookingItem | null = null;
  const updated = bookings.map((b) => {
    if (b.id === bookingId) {
      updatedBooking = { ...b, ...updates };
      return updatedBooking;
    }
    return b;
  });

  saveStoredBookings(updated);
  if (updatedBooking) {
    saveBookingToSupabase(updatedBooking).catch(() => {});
  }
  return updatedBooking;
}

/**
 * Encodes a self-contained JSON payload for the Member's Reception QR Pass so that
 * scanning the QR code on ANY Admin device immediately displays the full booking details.
 */
export function buildBookingQrPayload(booking: BookingItem): string {
  return JSON.stringify({
    t: 'PG_BK',
    code: booking.booking_code,
    id: booking.id,
    uid: booking.user_id,
    uname: booking.user_name,
    mid: booking.user_member_id,
    tier: booking.member_tier || 'Silver',
    aid: booking.activity_id,
    aname: booking.activity_name,
    d: booking.date,
    tm: booking.time,
    dur: booking.duration || '60 mins',
    pax: booking.party_size || 1,
    bay: booking.bay_assignment || 'Assigned at Reception',
    pay: booking.payment_status || 'paid',
    pr: booking.price || '£20.00',
    n: booking.notes || '',
  });
}

/**
 * Parses a scanned QR string into a BookingItem if it contains a PG_BK JSON payload.
 */
export function parseBookingQrPayload(rawQr: string): BookingItem | null {
  try {
    const clean = (rawQr || '').trim();
    if (!clean.startsWith('{')) return null;
    const obj = JSON.parse(clean);
    if (obj.t !== 'PG_BK' && !obj.booking_code && !obj.code) return null;

    const code = obj.code || obj.booking_code;
    if (!code || !String(code).toUpperCase().startsWith('PG-BK')) return null;

    return enrichBookingItem({
      id: obj.id || `bk_${Date.now()}`,
      booking_code: code,
      user_id: obj.uid || obj.user_id || 'usr_member_1',
      user_name: obj.uname || obj.user_name || 'Club Member',
      user_member_id: obj.mid || obj.user_member_id || 'PG-MEMBER',
      member_tier: obj.tier || obj.member_tier || 'Silver',
      activity_id: obj.aid || obj.activity_id || 'nine-holes',
      activity_name: obj.aname || obj.activity_name || 'Club Activity',
      date: obj.d || obj.date || todayStr,
      time: obj.tm || obj.time || '14:00',
      duration: obj.dur || obj.duration || '60 mins',
      party_size: Number(obj.pax || obj.party_size || 1),
      bay_assignment: obj.bay || obj.bay_assignment || 'Assigned at Reception',
      payment_status: obj.pay || obj.payment_status || 'paid',
      price: obj.pr || obj.price || '£20.00',
      status: 'confirmed',
      notes: obj.n || obj.notes || '',
      created_at: new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

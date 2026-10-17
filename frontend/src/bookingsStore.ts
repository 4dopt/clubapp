import { saveBookingToSupabase, updateBookingStatusInSupabase } from './supabaseService';

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
  }
> = {
  'nine-holes': {
    name: '9 Holes Championship Course',
    shortTag: '9-HOLE COURSE',
    category: 'Course Tee Time',
    defaultDuration: '120 mins',
    defaultBay: 'Tee 1 (Championship)',
    defaultPrice: '£28.00',
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.14)',
  },
  'putt-crazy': {
    name: 'Putt Crazy Adventure Minigolf',
    shortTag: 'ADVENTURE MINIGOLF',
    category: '18-Hole Crazy Golf',
    defaultDuration: '60 mins',
    defaultBay: 'Adventure Course A',
    defaultPrice: '£12.00',
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.14)',
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
  },
};

const todayStr = new Date().toISOString().split('T')[0];
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const twoDaysStr = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

const DEFAULT_BOOKINGS: BookingItem[] = [
  {
    id: 'bk_demo_0',
    booking_code: 'PG-BK904112',
    user_id: 'usr_m_elena',
    user_name: 'Elena Rostova',
    user_member_id: 'PG-5120D2',
    member_tier: 'Platinum',
    activity_id: 'golf-coaching',
    activity_name: 'PGA Golf Coaching & Lesson',
    date: todayStr,
    time: '13:00',
    duration: '60 mins',
    party_size: 1,
    bay_assignment: 'TrackMan Studio 1',
    payment_status: 'paid',
    price: '£65.00',
    status: 'completed',
    notes: 'Driver launch angle & spin optimization with Head Pro',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    checked_in_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'bk_demo_3',
    booking_code: 'PG-BK109283',
    user_id: 'usr_member_2',
    user_name: 'Sarah Connor',
    user_member_id: 'PG-9812A4',
    member_tier: 'Gold',
    activity_id: 'darts-interactive',
    activity_name: 'Darts Interactive Lane',
    date: todayStr,
    time: '16:00',
    duration: '60 mins',
    party_size: 4,
    bay_assignment: 'AR Darts Lane 2',
    payment_status: 'paid',
    price: '£20.00',
    status: 'confirmed',
    notes: '4 players — Clubhouse drinks package requested',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bk_demo_4',
    booking_code: 'PG-BK639410',
    user_id: 'usr_m_james',
    user_name: 'James Wilson',
    user_member_id: 'PG-7731C9',
    member_tier: 'Gold',
    activity_id: 'nine-holes',
    activity_name: '9 Holes Championship Course',
    date: todayStr,
    time: '17:30',
    duration: '120 mins',
    party_size: 2,
    bay_assignment: 'Tee 1 (Championship)',
    payment_status: 'pay_at_desk',
    price: '£56.00',
    status: 'confirmed',
    notes: '2 electric buggies reserved at pro shop',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'bk_demo_1',
    booking_code: 'PG-BK883102',
    user_id: 'usr_member_1',
    user_name: 'Alex Morgan',
    user_member_id: 'PG-2445B5',
    member_tier: 'Silver',
    activity_id: 'nine-holes',
    activity_name: '9 Holes Championship Course',
    date: tomorrowStr,
    time: '14:30',
    duration: '120 mins',
    party_size: 2,
    bay_assignment: 'Tee 1 (Championship)',
    payment_status: 'paid',
    price: '£56.00',
    status: 'confirmed',
    notes: 'Executive round for 2 players, rental clubs needed',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'bk_demo_2',
    booking_code: 'PG-BK472019',
    user_id: 'usr_member_1',
    user_name: 'Alex Morgan',
    user_member_id: 'PG-2445B5',
    member_tier: 'Silver',
    activity_id: 'putt-crazy',
    activity_name: 'Putt Crazy Adventure Minigolf',
    date: twoDaysStr,
    time: '16:00',
    duration: '60 mins',
    party_size: 4,
    bay_assignment: 'Adventure Course A',
    payment_status: 'paid',
    price: '£40.00',
    status: 'confirmed',
    notes: 'Family 4-pack minigolf pass',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getStoredBookings(): BookingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    const parsed = JSON.parse(raw) as BookingItem[];
    // Enrich any older stored bookings with default metadata so they are easy to read
    return parsed.map((b) => {
      const meta = ACTIVITY_METADATA[b.activity_id];
      return {
        ...b,
        duration: b.duration || meta?.defaultDuration || '60 mins',
        party_size: b.party_size || (b.notes?.includes('4') ? 4 : b.notes?.includes('2') ? 2 : 1),
        bay_assignment: b.bay_assignment || meta?.defaultBay || 'Main Facility',
        payment_status: b.payment_status || 'paid',
        member_tier: b.member_tier || 'Silver',
        price: b.price || meta?.defaultPrice || '£20.00',
      };
    });
  } catch {
    return DEFAULT_BOOKINGS;
  }
}

export function saveStoredBookings(bookings: BookingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    /* ignore */
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
    bay_assignment: params.bay_assignment || meta?.defaultBay || 'Assigned at Desk',
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
  return updatedBooking;
}


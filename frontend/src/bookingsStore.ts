import { saveBookingToSupabase, updateBookingStatusInSupabase } from './supabaseService';

export interface BookingItem {
  id: string;
  booking_code: string;
  user_id: string;
  user_name: string;
  user_member_id: string;
  activity_id: string;
  activity_name: string;
  date: string;
  time: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  checked_in_at?: string;
}

const STORAGE_KEY = 'playgolf.bookings';

const DEFAULT_BOOKINGS: BookingItem[] = [
  {
    id: 'bk_demo_1',
    booking_code: 'PG-BK883102',
    user_id: 'usr_member_1',
    user_name: 'Alex Morgan',
    user_member_id: 'PG-2445B5',
    activity_id: 'nine-holes',
    activity_name: '9 Holes Course',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:30',
    status: 'confirmed',
    notes: 'Executive round for 2 players',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'bk_demo_2',
    booking_code: 'PG-BK472019',
    user_id: 'usr_member_1',
    user_name: 'Alex Morgan',
    user_member_id: 'PG-2445B5',
    activity_id: 'putt-crazy',
    activity_name: 'Putt Crazy Adventure Minigolf',
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    time: '16:00',
    status: 'confirmed',
    notes: 'Family 4-pack minigolf pass',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'bk_demo_3',
    booking_code: 'PG-BK109283',
    user_id: 'usr_member_2',
    user_name: 'Sarah Connor',
    user_member_id: 'PG-9812A4',
    activity_id: 'darts-interactive',
    activity_name: 'Darts Interactive',
    date: new Date().toISOString().split('T')[0],
    time: '17:30',
    status: 'confirmed',
    notes: 'AR Target Darts lane',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export function getStoredBookings(): BookingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    return JSON.parse(raw);
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
  activity_id: string;
  activity_name: string;
  date: string;
  time: string;
  notes?: string;
}): BookingItem {
  const bookings = getStoredBookings();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const newBk: BookingItem = {
    id: 'bk_' + Date.now(),
    booking_code: `PG-BK${randomNum}`,
    user_id: params.user_id,
    user_name: params.user_name,
    user_member_id: params.user_member_id,
    activity_id: params.activity_id,
    activity_name: params.activity_name,
    date: params.date,
    time: params.time,
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

export function updateBookingStatus(bookingId: string, status: 'confirmed' | 'completed' | 'cancelled'): BookingItem | null {
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

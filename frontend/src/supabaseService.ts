import { supabase } from './supabase';
import { User, Reward, Transaction } from './api';
import { BookingItem } from './bookingsStore';

// Helper to generate member ID
export function generateMemberId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PG-${n}`;
}

// ==================== AUTH SERVICES ====================

export async function supabaseSignUp(email: string, password: string, name: string, phone?: string) {
  const memberId = generateMemberId();
  
  // 1. Create auth user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || '',
        member_id: memberId,
      },
    },
  });

  if (authError) throw authError;
  const userObj = authData.user;
  if (!userObj) throw new Error('Sign up failed. Please check your credentials.');

  // 2. Create matching profile record in 'profiles' database table
  const newProfile: User = {
    id: userObj.id,
    email: email.toLowerCase(),
    name,
    role: email.toLowerCase().includes('admin') ? 'admin' : 'member',
    member_id: memberId,
    tier: 'Silver',
    points: 250, // Welcome bonus points!
    points_ytd: 250,
    qr_token: `QR_MEMBER_${memberId.replace('-', '')}`,
    created_at: new Date().toISOString(),
  };

  try {
    const { error: dbError } = await supabase.from('profiles').upsert(newProfile);
    if (dbError) {
      console.warn('Supabase profiles DB table upsert warning:', dbError.message);
    }
  } catch (e) {
    console.warn('Profiles DB sync fallback used');
  }

  return { authUser: userObj, profile: newProfile };
}

export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Invalid email or password');

  // Fetch user profile from Supabase DB 'profiles'
  let profile = await fetchProfileFromSupabase(data.user.id);
  
  if (!profile) {
    // Construct default profile if database row doesn't exist yet
    profile = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
      role: email.toLowerCase().includes('admin') ? 'admin' : 'member',
      member_id: data.user.user_metadata?.member_id || generateMemberId(),
      tier: 'Silver',
      points: 250,
      points_ytd: 250,
      qr_token: `QR_MEMBER_${data.user.id.slice(0, 8)}`,
      created_at: new Date().toISOString(),
    };
  }

  return { session: data.session, user: profile };
}

export async function supabaseSignOut() {
  await supabase.auth.signOut();
}

// ==================== DATABASE PROFILE SERVICES ====================

export async function fetchProfileFromSupabase(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data as User;
  } catch {
    return null;
  }
}

// ==================== DATABASE BOOKINGS SERVICES ====================

export async function fetchBookingsFromSupabase(): Promise<BookingItem[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as BookingItem[];
  } catch {
    return [];
  }
}

export async function saveBookingToSupabase(booking: BookingItem): Promise<boolean> {
  try {
    const { error } = await supabase.from('bookings').upsert(booking);
    if (error) {
      console.warn('Supabase booking insert warning:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function updateBookingStatusInSupabase(bookingId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status, checked_in_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', bookingId);

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

-- ===============================================================
-- PlayGolf Club App — Supabase Database Schema Setup Script
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ===============================================================

-- 1. Create Profiles Table (Members & Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'staff', 'admin')),
  member_id TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'Silver' CHECK (tier IN ('Silver', 'Gold', 'Platinum')),
  points INT DEFAULT 250,
  points_ytd INT DEFAULT 250,
  qr_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles read access" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- 2. Create Bookings Table (Course, Minigolf, Darts, Coaching)
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_member_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ
);

-- Enable RLS on Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to bookings" ON public.bookings
  FOR SELECT USING (true);

CREATE POLICY "Allow insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update bookings" ON public.bookings
  FOR UPDATE USING (true);


-- 3. Create Rewards Table
CREATE TABLE IF NOT EXISTS public.rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  redemption_type TEXT DEFAULT 'qr',
  discount_code TEXT
);

-- Enable RLS on Rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to rewards" ON public.rewards
  FOR SELECT USING (true);

CREATE POLICY "Allow all management for rewards" ON public.rewards
  FOR ALL USING (true);


-- 4. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('earn', 'redeem', 'adjust')),
  title TEXT NOT NULL,
  points INT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);


-- 5. Automatic User Profile Trigger Function
-- Automatically creates a member profile whenever a new user registers in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, member_id, role, tier, points, points_ytd, qr_token)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'member_id', 'PG-' || floor(100000 + random() * 900000)::text),
    CASE WHEN new.email LIKE '%admin%' THEN 'admin' ELSE 'member' END,
    'Silver',
    250,
    250,
    'QR_MEMBER_' || UPPER(substr(md5(random()::text), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


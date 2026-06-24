-- Users table (extends auth.users)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  phone text UNIQUE,
  email text UNIQUE,
  name text,
  member_id text UNIQUE,
  tier text DEFAULT 'Silver' CHECK (tier IN ('Silver', 'Gold', 'Platinum')),
  points_balance integer DEFAULT 0,
  lifetime_points integer DEFAULT 0,
  joined_at timestamp with time zone DEFAULT now(),
  suspended boolean DEFAULT false
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile." ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Rewards table
CREATE TABLE public.rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  points_cost integer NOT NULL,
  category text NOT NULL,
  image_url text,
  active boolean DEFAULT true
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rewards are viewable by everyone." ON public.rewards
  FOR SELECT USING (true);

-- Transactions table
CREATE TABLE public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users NOT NULL,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  points integer NOT NULL,
  title text NOT NULL,
  description text,
  reward_id uuid REFERENCES public.rewards,
  redemption_code text,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  by_admin boolean DEFAULT false
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions." ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions." ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seeding some default rewards
INSERT INTO public.rewards (title, description, points_cost, category, image_url) VALUES
('Free Bucket of Balls', 'Get a medium bucket of balls for the driving range.', 500, 'Range', 'https://images.unsplash.com/photo-1592916314725-b4bfab2e3db0?auto=format&fit=crop&q=80&w=600'),
('18 Holes Green Fee', 'Play 18 holes at no cost.', 5000, 'Course', 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=600'),
('Pro Shop $20 Voucher', 'Use this voucher towards any apparel in the pro shop.', 1000, 'Pro Shop', 'https://images.unsplash.com/photo-1535136104956-68bdebbc8b62?auto=format&fit=crop&q=80&w=600');

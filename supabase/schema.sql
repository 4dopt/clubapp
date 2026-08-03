-- PlayGolf Club Supabase Schema Definition

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'staff', 'admin')),
  member_id VARCHAR(10) UNIQUE NOT NULL,
  tier VARCHAR(20) DEFAULT 'Silver' CHECK (tier IN ('Silver', 'Gold', 'Platinum')),
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  points_ytd INTEGER DEFAULT 0 CHECK (points_ytd >= 0),
  qr_token VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  category VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  redemption_type VARCHAR(20) DEFAULT 'qr' CHECK (redemption_type IN ('qr', 'discount')),
  discount_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  reward_title VARCHAR(255) NOT NULL,
  points_cost INTEGER NOT NULL,
  redemption_type VARCHAR(20) NOT NULL,
  discount_code VARCHAR(50),
  qr_code_token VARCHAR(100),
  fulfilled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem')),
  title VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

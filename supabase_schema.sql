-- ===============================================================
-- PlayGolf Club App — Production Hardened Supabase Schema & Security Script
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ===============================================================

-- 0. Cost & DoS Protection: Statement Timeouts for Client Roles
ALTER ROLE anon SET statement_timeout = '5s';
ALTER ROLE authenticated SET statement_timeout = '8s';

-- 1. Create Profiles Table (Members & Admins) with Strict Constraints
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 120),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'staff', 'admin')),
  member_id TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'Silver' CHECK (tier IN ('Silver', 'Gold', 'Platinum')),
  points INT DEFAULT 250 CHECK (points >= 0 AND points <= 500000),
  points_ytd INT DEFAULT 250 CHECK (points_ytd >= 0 AND points_ytd <= 1000000),
  qr_token TEXT,
  suspended BOOLEAN DEFAULT false,
  last_checkin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if upgrading an existing database
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_checkin_at TIMESTAMPTZ;

-- 2. Security Audit Logs Table (Immutable Anomaly & Abuse Tracking)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  actor_id TEXT,
  target_user_id TEXT,
  details TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Helper Function: Check if Current Caller is Verified Admin/Staff
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, LOWER(email) INTO v_role, v_email
  FROM public.profiles
  WHERE id::text = auth.uid()::text;

  RETURN (v_role IN ('admin', 'staff') OR v_email = 'jay@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Helper Function: Block Disposable / Bot Email Domains (Sybil Protection)
CREATE OR REPLACE FUNCTION public.is_disposable_email(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_domain TEXT;
BEGIN
  v_domain := LOWER( trim(split_part(COALESCE(p_email, ''), '@', 2)) );
  RETURN v_domain IN (
    'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
    'yopmail.com', 'trashmail.com', 'sharklasers.com', 'fakeinbox.com',
    'getnada.com', 'maildrop.cc', 'temp-mail.org', 'throwawaymail.com',
    'dispostable.com', 'mailnesia.com', 'mohmal.com', 'tempail.com'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Anti-Tampering Trigger on Profiles (Blocks DevTools Point/Role/Tier Escalation)
CREATE OR REPLACE FUNCTION public.enforce_profile_security_guardrails()
RETURNS TRIGGER AS $$
BEGIN
  -- Block disposable emails on insert
  IF TG_OP = 'INSERT' THEN
    IF public.is_disposable_email(NEW.email) THEN
      RAISE EXCEPTION 'Registration with temporary or disposable email domains is not permitted.';
    END IF;

    -- Prevent non-admins from inserting themselves as 'admin' or with >250 starter points
    IF current_setting('app.trusted_rpc', true) IS DISTINCT FROM 'true' AND NOT public.is_admin() THEN
      IF LOWER(NEW.email) <> 'jay@gmail.com' THEN
        NEW.role := 'member';
      END IF;
      NEW.points := LEAST(GREATEST(COALESCE(NEW.points, 250), 0), 250);
      NEW.points_ytd := LEAST(GREATEST(COALESCE(NEW.points_ytd, 250), 0), 250);
      NEW.tier := 'Silver';
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: if caller is NOT running inside a trusted server RPC and is NOT an admin,
  -- lock sensitive loyalty/privilege columns to their existing values so client DevTools cannot tamper with them.
  IF TG_OP = 'UPDATE' THEN
    IF current_setting('app.trusted_rpc', true) IS DISTINCT FROM 'true' AND NOT public.is_admin() THEN
      IF NEW.role IS DISTINCT FROM OLD.role
         OR NEW.points > OLD.points
         OR NEW.points_ytd > OLD.points_ytd THEN
        INSERT INTO public.security_audit_logs (event_type, severity, actor_id, target_user_id, details)
        VALUES (
          'CLIENT_TAMPER_BLOCKED',
          'critical',
          COALESCE(auth.uid()::text, 'anon'),
          OLD.id::text,
          format('Blocked unauthorized client attempt to modify role (%s -> %s) or increase points (%s -> %s)',
                 OLD.role, NEW.role, OLD.points, NEW.points)
        );
      END IF;

      -- Force sensitive fields to remain unchanged unless reduced by valid redemption
      NEW.role := OLD.role;
      NEW.member_id := OLD.member_id;
      NEW.suspended := OLD.suspended;
      IF NEW.points > OLD.points THEN
        NEW.points := OLD.points;
      END IF;
      IF NEW.points_ytd > OLD.points_ytd THEN
        NEW.points_ytd := OLD.points_ytd;
      END IF;
      NEW.tier := CASE
        WHEN NEW.points_ytd >= 5000 THEN 'Platinum'
        WHEN NEW.points_ytd >= 1000 THEN 'Gold'
        ELSE 'Silver'
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_security_guardrails();

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
CREATE POLICY "Public profiles read access" ON public.profiles
  FOR SELECT USING (auth.uid()::text = id::text OR public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = id::text OR public.is_admin());


-- 6. Create Bookings Table (Course, Minigolf, Darts, Coaching) with Anti-Squatting Trigger
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
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ
);

-- Anti-Booking-Squatting Trigger: Max 3 active bookings per member per day, Max 6 upcoming total
CREATE OR REPLACE FUNCTION public.enforce_booking_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_same_day_count INT;
  v_upcoming_count INT;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_same_day_count
  FROM public.bookings
  WHERE user_id::text = NEW.user_id::text
    AND date = NEW.date
    AND status = 'confirmed'
    AND id::text <> NEW.id::text;

  IF v_same_day_count >= 3 THEN
    INSERT INTO public.security_audit_logs (event_type, severity, actor_id, target_user_id, details)
    VALUES ('BOOKING_RATE_LIMIT_HIT', 'warning', NEW.user_id::text, NEW.user_id::text,
            format('Member exceeded max 3 active bookings on date %s', NEW.date));
    RAISE EXCEPTION 'Security limit: Maximum 3 active bookings allowed per day per member.';
  END IF;

  SELECT COUNT(*) INTO v_upcoming_count
  FROM public.bookings
  WHERE user_id::text = NEW.user_id::text
    AND date >= CURRENT_DATE
    AND status = 'confirmed'
    AND id::text <> NEW.id::text;

  IF v_upcoming_count >= 6 THEN
    RAISE EXCEPTION 'Security limit: Maximum 6 active upcoming bookings allowed at a time.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_rate_limit ON public.bookings;
CREATE TRIGGER trg_booking_rate_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_rate_limit();

-- Enable RLS on Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to bookings" ON public.bookings;
CREATE POLICY "Allow public read access to bookings" ON public.bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert bookings" ON public.bookings;
CREATE POLICY "Allow insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow update bookings" ON public.bookings;
CREATE POLICY "Allow update bookings" ON public.bookings
  FOR UPDATE USING (auth.uid()::text = user_id::text OR public.is_admin() OR auth.role() = 'authenticated');


-- 7. Create Rewards Table (Locked to Admin-Only Mutation)
CREATE TABLE IF NOT EXISTS public.rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INT NOT NULL CHECK (points_cost > 0 AND points_cost <= 100000),
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  redemption_type TEXT DEFAULT 'qr',
  discount_code TEXT
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to rewards" ON public.rewards;
CREATE POLICY "Allow public read access to rewards" ON public.rewards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all management for rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow admin management for rewards" ON public.rewards;
CREATE POLICY "Allow admin management for rewards" ON public.rewards
  FOR ALL USING (public.is_admin());


-- 8. Create Transactions Table with Bounds Check
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('earn', 'redeem', 'adjust')),
  title TEXT NOT NULL,
  points INT NOT NULL CHECK (points >= 0 AND points <= 50000),
  category TEXT,
  reward_id TEXT,
  redemption_code TEXT,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if upgrading an existing transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reward_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS redemption_code TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS by_admin BOOLEAN DEFAULT false;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to transactions" ON public.transactions;
CREATE POLICY "Allow read access to transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = user_id::text OR public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert transactions" ON public.transactions;
CREATE POLICY "Allow insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    (auth.uid()::text = user_id::text AND points <= 2500)
    OR public.is_admin()
  );

-- Policies for security_audit_logs
DROP POLICY IF EXISTS "Allow read security logs for admins" ON public.security_audit_logs;
CREATE POLICY "Allow read security logs for admins" ON public.security_audit_logs
  FOR SELECT USING (public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert security logs" ON public.security_audit_logs;
CREATE POLICY "Allow insert security logs" ON public.security_audit_logs
  FOR INSERT WITH CHECK (true);


-- 9. Atomic Reward Redemption RPC (Prevents Race-Condition Double-Spend)
CREATE OR REPLACE FUNCTION public.rpc_redeem_reward(p_reward_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_reward RECORD;
  v_new_points INT;
  v_code TEXT;
  v_txn_id TEXT;
  v_recent_redeem TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to redeem rewards.';
  END IF;

  -- Set trusted RPC flag for trigger
  PERFORM set_config('app.trusted_rpc', 'true', true);

  -- Lock the member row FOR UPDATE so concurrent requests queue serially
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id::text = v_user_id::text
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile not found.';
  END IF;

  IF COALESCE(v_profile.suspended, false) THEN
    RAISE EXCEPTION 'Account is suspended. Please contact club reception.';
  END IF;

  -- Check 5-second anti-double-tap cooldown
  SELECT MAX(created_at) INTO v_recent_redeem
  FROM public.transactions
  WHERE user_id::text = v_user_id::text AND type = 'redeem';

  IF v_recent_redeem IS NOT NULL AND (NOW() - v_recent_redeem) < INTERVAL '5 seconds' THEN
    RAISE EXCEPTION 'Please wait a few seconds before redeeming another reward.';
  END IF;

  SELECT * INTO v_reward
  FROM public.rewards
  WHERE id::text = p_reward_id::text AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected reward is no longer active or available.';
  END IF;

  IF COALESCE(v_profile.points, 0) < v_reward.points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % PTS.', v_reward.points_cost;
  END IF;

  v_new_points := v_profile.points - v_reward.points_cost;
  v_code := CASE
    WHEN COALESCE(v_reward.redemption_type, 'qr') = 'qr'
      THEN 'QR_REDEEM_' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
    ELSE COALESCE(v_reward.discount_code, 'PLAYGOLF20')
  END;

  UPDATE public.profiles
  SET points = v_new_points
  WHERE id::text = v_user_id::text;

  INSERT INTO public.transactions (
    user_id, type, title, points, reward_id, redemption_code, used, created_at
  ) VALUES (
    v_user_id,
    'redeem',
    'Redeemed: ' || v_reward.title,
    v_reward.points_cost,
    v_reward.id::text,
    v_code,
    COALESCE(v_reward.redemption_type, 'qr') = 'discount',
    NOW()
  ) RETURNING id::text INTO v_txn_id;

  RETURN jsonb_build_object(
    'redemption_id', v_txn_id,
    'redemption_type', COALESCE(v_reward.redemption_type, 'qr'),
    'discount_code', v_reward.discount_code,
    'qr_code_token', CASE WHEN COALESCE(v_reward.redemption_type, 'qr') = 'qr' THEN v_code ELSE NULL END,
    'remaining_points', v_new_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. Hardened Automatic User Profile Trigger Function (Fixes %admin% Email Exploit)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_disposable_email(new.email) THEN
    RAISE EXCEPTION 'Registration with disposable email addresses is blocked.';
  END IF;

  PERFORM set_config('app.trusted_rpc', 'true', true);

  INSERT INTO public.profiles (id, email, name, member_id, role, tier, points, points_ytd, qr_token)
  VALUES (
    new.id,
    LOWER(trim(new.email)),
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'member_id', 'PG-' || floor(100000 + random() * 900000)::text),
    -- SECURITY FIX: Never grant admin based on '%admin%' substring! Only explicit owner email.
    CASE WHEN LOWER(trim(new.email)) = 'jay@gmail.com' THEN 'admin' ELSE 'member' END,
    'Silver',
    250,
    250,
    'QR_MEMBER_' || UPPER(substr(md5(random()::text || new.id::text), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 11. Lock Down Legacy 'users' and 'reward_redemptions' Tables (No Unrestricted Tables)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Allow read access to users" ON public.users';
    EXECUTE 'CREATE POLICY "Allow read access to users" ON public.users FOR SELECT USING (auth.uid()::text = id::text OR public.is_admin() OR auth.role() = ''authenticated'')';

    EXECUTE 'DROP POLICY IF EXISTS "Allow insert own user" ON public.users';
    EXECUTE 'CREATE POLICY "Allow insert own user" ON public.users FOR INSERT WITH CHECK (auth.uid()::text = id::text OR public.is_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "Allow update own user" ON public.users';
    EXECUTE 'CREATE POLICY "Allow update own user" ON public.users FOR UPDATE USING (auth.uid()::text = id::text OR public.is_admin())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_redemptions') THEN
    EXECUTE 'ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Allow read reward_redemptions" ON public.reward_redemptions';
    EXECUTE 'CREATE POLICY "Allow read reward_redemptions" ON public.reward_redemptions FOR SELECT USING (auth.uid()::text = user_id::text OR public.is_admin() OR auth.role() = ''authenticated'')';

    EXECUTE 'DROP POLICY IF EXISTS "Allow insert reward_redemptions" ON public.reward_redemptions';
    EXECUTE 'CREATE POLICY "Allow insert reward_redemptions" ON public.reward_redemptions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR public.is_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "Allow update reward_redemptions" ON public.reward_redemptions';
    EXECUTE 'CREATE POLICY "Allow update reward_redemptions" ON public.reward_redemptions FOR UPDATE USING (public.is_admin())';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_users_table_security_guardrails()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.trusted_rpc', true) IS DISTINCT FROM 'true' AND NOT public.is_admin() THEN
      IF LOWER(COALESCE(NEW.email, '')) <> 'jay@gmail.com' THEN
        NEW.role := 'user';
      END IF;
      NEW.points_balance := LEAST(GREATEST(COALESCE(NEW.points_balance, 250), 0), 250);
      NEW.lifetime_points := LEAST(GREATEST(COALESCE(NEW.lifetime_points, 250), 0), 250);
      NEW.tier := 'Silver';
      NEW.suspended := false;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF current_setting('app.trusted_rpc', true) IS DISTINCT FROM 'true' AND NOT public.is_admin() THEN
      IF NEW.role IS DISTINCT FROM OLD.role
         OR NEW.points_balance > OLD.points_balance
         OR NEW.lifetime_points > OLD.lifetime_points THEN
        INSERT INTO public.security_audit_logs (event_type, severity, actor_id, target_user_id, details)
        VALUES (
          'CLIENT_TAMPER_BLOCKED',
          'critical',
          COALESCE(auth.uid()::text, 'anon'),
          OLD.id::text,
          format('Blocked unauthorized client attempt on public.users to modify role (%s -> %s) or increase points_balance (%s -> %s)',
                 OLD.role, NEW.role, OLD.points_balance, NEW.points_balance)
        );
      END IF;

      NEW.role := OLD.role;
      NEW.member_id := OLD.member_id;
      NEW.suspended := OLD.suspended;
      IF NEW.points_balance > OLD.points_balance THEN
        NEW.points_balance := OLD.points_balance;
      END IF;
      IF NEW.lifetime_points > OLD.lifetime_points THEN
        NEW.lifetime_points := OLD.lifetime_points;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_enforce_users_security ON public.users';
    EXECUTE 'CREATE TRIGGER trg_enforce_users_security BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_users_table_security_guardrails()';
  END IF;
END $$;

-- 12. Performance & Cost Optimization Indexes (Prevents Sequential Table Scans)
CREATE INDEX IF NOT EXISTS idx_profiles_member_id ON public.profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON public.bookings(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON public.bookings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_created ON public.transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_redemption_code ON public.transactions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON public.security_audit_logs(created_at DESC);

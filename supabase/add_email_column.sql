-- 1. Add email column to the users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- 2. Create trigger function to automatically create public profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, member_id, points_balance, lifetime_points)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Golfer'),
    'PG-' || upper(substring(md5(random()::text) from 1 for 6)),
    250,
    250
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create RLS policies for admin@playgolf.com
CREATE POLICY "Admins can view all profiles." ON public.users
  FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can update all profiles." ON public.users
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can insert rewards." ON public.rewards
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can update rewards." ON public.rewards
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can delete rewards." ON public.rewards
  FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can view all transactions." ON public.transactions
  FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can update all transactions." ON public.transactions
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@playgolf.com');

CREATE POLICY "Admins can insert transactions." ON public.transactions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@playgolf.com');

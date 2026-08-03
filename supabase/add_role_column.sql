-- Add role column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'staff', 'admin'));

-- Set jay@gmail.com as admin
UPDATE profiles SET role = 'admin' WHERE email = 'jay@gmail.com';

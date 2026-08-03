-- Add redemption_type and discount_code columns to rewards table
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS redemption_type VARCHAR(20) DEFAULT 'qr' CHECK (redemption_type IN ('qr', 'discount')),
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);

-- Update existing rewards to set default values
UPDATE rewards SET redemption_type = 'qr' WHERE redemption_type IS NULL;

-- Add firstName, lastName, phoneNumber, and address columns to users table
-- Split the existing 'name' into firstName and lastName if needed

-- Add new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Migrate existing 'name' data to firstName and lastName
-- This splits "John Doe" into firstName="John", lastName="Doe"
UPDATE users 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(name, ' ', 1)),
  last_name = COALESCE(last_name, CASE 
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE SPLIT_PART(name, ' ', 1)
  END)
WHERE (first_name IS NULL OR last_name IS NULL) AND name IS NOT NULL;

-- Make firstName and lastName NOT NULL after migration
ALTER TABLE users 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Drop the old 'name' column
ALTER TABLE users DROP COLUMN IF EXISTS name;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);


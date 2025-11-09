-- Add role column to users table

-- Create role enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'member');
    END IF;
END $$;

-- Add role column with default value 'member'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'member' NOT NULL;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'member' role if role is NULL
UPDATE users SET role = 'member' WHERE role IS NULL;


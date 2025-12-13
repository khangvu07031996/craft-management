-- Add 'employee' role to user_role enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'employee' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'employee';
    END IF;
END $$;

-- Add employee_id column to users table to link with employees
ALTER TABLE users
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- Add comment for documentation
COMMENT ON COLUMN users.employee_id IS 'Liên kết với bảng employees, cho phép user có role employee truy cập thông tin nhân viên';


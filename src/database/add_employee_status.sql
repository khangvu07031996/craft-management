-- Add status column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing employees to have 'active' status if null
UPDATE employees SET status = 'active' WHERE status IS NULL;

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);


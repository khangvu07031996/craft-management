-- Add calculated_at column to monthly_salaries table
-- This field stores the timestamp when salary was last calculated
ALTER TABLE monthly_salaries
ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP NULL;

-- Update existing records to set calculated_at = updated_at if calculated_at is NULL
UPDATE monthly_salaries
SET calculated_at = updated_at
WHERE calculated_at IS NULL;


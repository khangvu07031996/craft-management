-- Add date_from and date_to columns for salary by date range
ALTER TABLE monthly_salaries
ADD COLUMN IF NOT EXISTS date_from DATE,
ADD COLUMN IF NOT EXISTS date_to DATE;

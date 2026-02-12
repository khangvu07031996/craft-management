-- Add advance_payment (tạm ứng) column to monthly_salaries
ALTER TABLE monthly_salaries
ADD COLUMN IF NOT EXISTS advance_payment NUMERIC(12,2) NOT NULL DEFAULT 0;

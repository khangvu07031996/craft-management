-- Add status and allowances columns to monthly_salaries, and optional paid_at
ALTER TABLE monthly_salaries
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Tạm tính',
ADD COLUMN IF NOT EXISTS allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL;

-- Constrain status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_salaries_status_check'
      AND table_name = 'monthly_salaries'
  ) THEN
    ALTER TABLE monthly_salaries
    ADD CONSTRAINT monthly_salaries_status_check
    CHECK (status IN ('Tạm tính', 'Thanh toán'));
  END IF;
END$$;



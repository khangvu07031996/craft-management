-- Remove UNIQUE constraint on (employee_id, year, month) to allow multiple salary records per employee per month
ALTER TABLE monthly_salaries
DROP CONSTRAINT IF EXISTS monthly_salaries_employee_id_year_month_key;

-- Also check for constraint with different naming convention
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname LIKE '%employee_id%year%month%' 
        AND conrelid = 'monthly_salaries'::regclass
    ) THEN
        ALTER TABLE monthly_salaries
        DROP CONSTRAINT IF EXISTS monthly_salaries_employee_id_year_month_key;
    END IF;
END $$;


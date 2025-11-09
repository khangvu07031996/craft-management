-- Rollback: Remove overtime tables and columns if they exist
-- This script safely removes overtime-related database objects

-- Drop overtime_configs table if it exists
DROP TABLE IF EXISTS overtime_configs CASCADE;

-- Remove overtime columns from work_records table if they exist
DO $$ 
BEGIN
    -- Drop has_overtime column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_records' 
        AND column_name = 'has_overtime'
    ) THEN
        ALTER TABLE work_records DROP COLUMN has_overtime;
        RAISE NOTICE 'Dropped column has_overtime from work_records';
    END IF;

    -- Drop overtime_quantity column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_records' 
        AND column_name = 'overtime_quantity'
    ) THEN
        ALTER TABLE work_records DROP COLUMN overtime_quantity;
        RAISE NOTICE 'Dropped column overtime_quantity from work_records';
    END IF;
END $$;

-- Drop any indexes related to overtime_configs if they exist
DROP INDEX IF EXISTS idx_overtime_configs_work_type_id;

-- Note: This script is idempotent and can be run multiple times safely


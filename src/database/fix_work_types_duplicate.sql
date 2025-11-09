-- Migration script to fix duplicate work_types
-- This script will:
-- 1. Remove duplicate work_types (keep the oldest one)
-- 2. Add unique constraint on (name, department)

-- Step 1: Delete duplicate work_types (case-insensitive), keeping only the oldest one for each (name, department) pair
-- Update references to point to the kept record
DO $$
DECLARE
    dup_record RECORD;
    kept_id UUID;
    dup_ids UUID[];
    kept_name TEXT;
BEGIN
    -- Find all duplicate groups (case-insensitive)
    FOR dup_record IN
        SELECT 
            LOWER(name) as name_lower, 
            department, 
            array_agg(id ORDER BY created_at) as ids, 
            array_agg(name ORDER BY created_at) as names,
            count(*) as cnt
        FROM work_types
        GROUP BY LOWER(name), department
        HAVING count(*) > 1
    LOOP
        -- Keep the first (oldest) id and its original name
        kept_id := dup_record.ids[1];
        kept_name := dup_record.names[1];
        -- Get all other duplicate ids
        dup_ids := dup_record.ids[2:array_length(dup_record.ids, 1)];
        
        -- Normalize name to the kept name (use the oldest one's original casing)
        UPDATE work_types
        SET name = kept_name
        WHERE id = kept_id;
        
        -- Update employees to point to the kept work_type
        UPDATE employees
        SET work_type_id = kept_id
        WHERE work_type_id = ANY(dup_ids);
        
        -- Update work_records to point to the kept work_type
        UPDATE work_records
        SET work_type_id = kept_id
        WHERE work_type_id = ANY(dup_ids);
        
        -- Delete duplicate work_types
        DELETE FROM work_types
        WHERE id = ANY(dup_ids);
        
        RAISE NOTICE 'Removed % duplicates for work_type: % (case-insensitive), department: %, kept id: %, kept name: %', 
            array_length(dup_ids, 1), dup_record.name_lower, dup_record.department, kept_id, kept_name;
    END LOOP;
END $$;

-- Step 2: Add unique constraint on (name, department) - case-insensitive
-- First, drop the constraint if it exists
ALTER TABLE work_types 
DROP CONSTRAINT IF EXISTS work_types_name_department_unique;

-- Create a unique index that is case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS work_types_name_department_unique_idx 
ON work_types(LOWER(name), department);

-- Note: PostgreSQL doesn't support case-insensitive UNIQUE constraint directly,
-- so we use a unique index instead. The application layer should also validate.

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_work_types_name_department ON work_types(name, department);


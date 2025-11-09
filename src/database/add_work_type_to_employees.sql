-- Add work_type_id column to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS work_type_id UUID REFERENCES work_types(id) ON DELETE SET NULL;

-- Create index for work_type_id
CREATE INDEX IF NOT EXISTS idx_employees_work_type ON employees(work_type_id);

-- Add comment for documentation
COMMENT ON COLUMN employees.work_type_id IS 'Loại công việc của nhân viên, liên quan đến vị trí và phòng ban';


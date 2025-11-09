-- Add overtime columns to work_records table
ALTER TABLE work_records 
ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS overtime_quantity DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(10, 2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN work_records.is_overtime IS 'Có làm tăng ca hay không';
COMMENT ON COLUMN work_records.overtime_quantity IS 'Số lượng hàng làm được trong tăng ca (cho weld_count)';
COMMENT ON COLUMN work_records.overtime_hours IS 'Số giờ tăng ca (cho hourly)';


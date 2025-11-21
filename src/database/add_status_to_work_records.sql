-- Add status column to work_records table
ALTER TABLE work_records
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Tạo mới' CHECK (status IN ('Tạo mới', 'Đã thanh toán'));

-- Add comment for documentation
COMMENT ON COLUMN work_records.status IS 'Trạng thái của bản ghi công việc: Tạo mới hoặc Đã thanh toán';

-- Update existing records to have default status
UPDATE work_records
SET status = 'Tạo mới'
WHERE status IS NULL;


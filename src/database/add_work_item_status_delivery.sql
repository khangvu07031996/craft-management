-- Add status and estimated_delivery_date columns to work_items table
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Tạo mới' CHECK (status IN ('Tạo mới', 'Đang sản xuất', 'Hoàn thành')),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN work_items.status IS 'Trạng thái sản phẩm: Tạo mới, Đang sản xuất, Hoàn thành';
COMMENT ON COLUMN work_items.estimated_delivery_date IS 'Ngày ước tính cần xuất hàng';

-- Update existing records based on their current totalQuantityMade
-- This will be done via a function that calculates status from work_records
-- For now, set all to 'Tạo mới' as default, status will be updated when work records are processed


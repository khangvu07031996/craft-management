-- Add new fields to work_items table
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS welds_per_item INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN work_items.total_quantity IS 'Tổng số lượng hàng cần làm';
COMMENT ON COLUMN work_items.welds_per_item IS 'Số mối hàn trên 1 sản phẩm';


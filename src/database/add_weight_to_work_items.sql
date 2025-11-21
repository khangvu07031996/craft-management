-- Add weight_kg column to work_items table
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10, 2);

COMMENT ON COLUMN work_items.weight_kg IS 'Cân nặng sản phẩm (đơn vị: kg)';


-- Create overtime_configs table
CREATE TABLE IF NOT EXISTS overtime_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_type_id UUID NOT NULL UNIQUE REFERENCES work_types(id) ON DELETE CASCADE,
    overtime_price_per_weld DECIMAL(12, 2) DEFAULT 0,
    overtime_percentage DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_overtime_percentage CHECK (overtime_percentage >= 0 AND overtime_percentage <= 100),
    CONSTRAINT chk_overtime_price_per_weld CHECK (overtime_price_per_weld >= 0)
);

-- Create index on work_type_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_overtime_configs_work_type_id ON overtime_configs(work_type_id);

-- Add comments for documentation
COMMENT ON TABLE overtime_configs IS 'Cấu hình tăng ca cho các loại công việc';
COMMENT ON COLUMN overtime_configs.work_type_id IS 'ID của loại công việc (mỗi work_type chỉ có 1 config)';
COMMENT ON COLUMN overtime_configs.overtime_price_per_weld IS 'Giá tiền cộng thêm cho 1 mối hàn (áp dụng cho weld_count)';
COMMENT ON COLUMN overtime_configs.overtime_percentage IS 'Phần trăm tăng ca (0-100, áp dụng cho hourly)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_overtime_configs_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_overtime_configs_updated_at ON overtime_configs;
CREATE TRIGGER update_overtime_configs_updated_at
    BEFORE UPDATE ON overtime_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_overtime_configs_updated_at_column();


-- Create work_types table
CREATE TABLE IF NOT EXISTS work_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    calculation_type VARCHAR(50) NOT NULL CHECK (calculation_type IN ('weld_count', 'hourly', 'daily')),
    unit_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work_items table (for welders)
CREATE TABLE IF NOT EXISTS work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    difficulty_level VARCHAR(50) NOT NULL CHECK (difficulty_level IN ('dễ', 'khó', 'trung bình')),
    price_per_weld DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work_records table
CREATE TABLE IF NOT EXISTS work_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    work_type_id UUID NOT NULL REFERENCES work_types(id) ON DELETE RESTRICT,
    work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create monthly_salaries table
CREATE TABLE IF NOT EXISTS monthly_salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_work_days INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, year, month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_records_employee_date ON work_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_records_work_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_work_records_work_type ON work_records(work_type_id);
CREATE INDEX IF NOT EXISTS idx_monthly_salaries_employee_year_month ON monthly_salaries(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_salaries_year_month ON monthly_salaries(year, month);
CREATE INDEX IF NOT EXISTS idx_work_types_department ON work_types(department);
CREATE INDEX IF NOT EXISTS idx_work_items_difficulty ON work_items(difficulty_level);

-- Function to update updated_at timestamp for work_types
CREATE OR REPLACE FUNCTION update_work_types_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for work_items
CREATE OR REPLACE FUNCTION update_work_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for work_records
CREATE OR REPLACE FUNCTION update_work_records_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for monthly_salaries
CREATE OR REPLACE FUNCTION update_monthly_salaries_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_work_types_updated_at ON work_types;
CREATE TRIGGER update_work_types_updated_at
    BEFORE UPDATE ON work_types
    FOR EACH ROW
    EXECUTE FUNCTION update_work_types_updated_at_column();

DROP TRIGGER IF EXISTS update_work_items_updated_at ON work_items;
CREATE TRIGGER update_work_items_updated_at
    BEFORE UPDATE ON work_items
    FOR EACH ROW
    EXECUTE FUNCTION update_work_items_updated_at_column();

DROP TRIGGER IF EXISTS update_work_records_updated_at ON work_records;
CREATE TRIGGER update_work_records_updated_at
    BEFORE UPDATE ON work_records
    FOR EACH ROW
    EXECUTE FUNCTION update_work_records_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_salaries_updated_at ON monthly_salaries;
CREATE TRIGGER update_monthly_salaries_updated_at
    BEFORE UPDATE ON monthly_salaries
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_salaries_updated_at_column();

-- Insert default work types
INSERT INTO work_types (name, department, calculation_type, unit_price) VALUES
    ('Thợ hàn', 'Xưởng sắt', 'weld_count', 0),
    ('Thợ đứng máy', 'Xưởng sắt', 'hourly', 50000),
    ('Công ngày', 'Xưởng bèo', 'daily', 100000)
ON CONFLICT DO NOTHING;


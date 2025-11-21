-- Create junction table to link monthly_salaries with work_records
CREATE TABLE IF NOT EXISTS monthly_salary_work_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_salary_id UUID NOT NULL REFERENCES monthly_salaries(id) ON DELETE CASCADE,
    work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(monthly_salary_id, work_record_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_salary_work_records_salary ON monthly_salary_work_records(monthly_salary_id);
CREATE INDEX IF NOT EXISTS idx_monthly_salary_work_records_record ON monthly_salary_work_records(work_record_id);

-- Add comment
COMMENT ON TABLE monthly_salary_work_records IS 'Bảng trung gian lưu mối quan hệ giữa monthly_salaries và work_records';


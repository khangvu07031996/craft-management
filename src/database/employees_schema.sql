-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    position VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    salary DECIMAL(12, 2),
    hire_date DATE NOT NULL,
    manager_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employees_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at_column();

-- Create sequence for employee_id generation (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'employee_seq') THEN
        CREATE SEQUENCE employee_seq START 1;
    END IF;
END $$;

-- Function to generate employee_id if not provided
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
        NEW.employee_id := 'EMP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('employee_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-generate employee_id
DROP TRIGGER IF EXISTS generate_employee_id_trigger ON employees;
CREATE TRIGGER generate_employee_id_trigger
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION generate_employee_id();


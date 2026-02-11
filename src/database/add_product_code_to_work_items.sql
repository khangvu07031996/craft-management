-- Add product code, size, shape, and description columns to work_items table
-- Product code format: YYMMSSSIZE (e.g., 260101A)

ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS product_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS size VARCHAR(10),
ADD COLUMN IF NOT EXISTS shape VARCHAR(50),
ADD COLUMN IF NOT EXISTS description VARCHAR(255);

-- Add unique constraint on product_code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'work_items_product_code_unique'
    ) THEN
        ALTER TABLE work_items ADD CONSTRAINT work_items_product_code_unique UNIQUE (product_code);
    END IF;
END$$;

-- Create index for faster queries on product_code
CREATE INDEX IF NOT EXISTS idx_work_items_product_code ON work_items(product_code);

-- Create index on size for filtering
CREATE INDEX IF NOT EXISTS idx_work_items_size ON work_items(size);

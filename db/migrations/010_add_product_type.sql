-- Add type column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';

-- Create index for type
CREATE INDEX IF NOT EXISTS idx_products_type ON products (type);

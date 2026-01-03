
-- Add order_id to faturalar table
ALTER TABLE faturalar
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

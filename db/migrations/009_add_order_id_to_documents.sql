-- Add order_id column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Index for order_id
CREATE INDEX IF NOT EXISTS idx_documents_order ON documents (order_id);

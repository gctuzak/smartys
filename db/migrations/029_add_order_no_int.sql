
-- Add generated column for numeric sorting of order numbers
-- This extracts digits from order_no and stores them as integer
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_no_int BIGINT 
GENERATED ALWAYS AS (
  CASE 
    WHEN order_no ~ '^[0-9]+$' THEN CAST(order_no AS BIGINT)
    ELSE NULL 
  END
) STORED;

-- Index for faster sorting
CREATE INDEX IF NOT EXISTS idx_orders_order_no_int ON orders(order_no_int);

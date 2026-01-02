-- Create a function to get the next order number safely
CREATE OR REPLACE FUNCTION get_next_order_no()
RETURNS text AS $$
DECLARE
  max_val integer;
BEGIN
  -- Find the maximum numeric order_no
  -- We use regex to ensure we only look at numeric order numbers
  SELECT MAX(CAST(order_no AS integer)) INTO max_val 
  FROM orders 
  WHERE order_no ~ '^[0-9]+$';
  
  IF max_val IS NULL THEN
    RETURN '1000';
  END IF;
  
  RETURN CAST(max_val + 1 AS text);
END;
$$ LANGUAGE plpgsql;

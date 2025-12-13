-- Update default currency to EUR
ALTER TABLE public.products 
ALTER COLUMN currency SET DEFAULT 'EUR';

-- Optional: Update existing 'TRY' records to 'EUR' if desired, otherwise leave them
-- UPDATE public.products SET currency = 'EUR' WHERE currency = 'TRY';

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  description text,
  unit text,
  cost decimal(10, 2),
  default_price decimal(10, 2),
  currency text DEFAULT 'TRY',
  vat_rate integer DEFAULT 20,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update for authenticated users only" ON public.products
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable delete for authenticated users only" ON public.products
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

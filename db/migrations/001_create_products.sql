-- Create products table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text,
  description text,
  unit text,
  default_price decimal(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for faster search
create index if not exists products_name_idx on public.products using btree (name);
create index if not exists products_code_idx on public.products using btree (code);

-- Enable Row Level Security (RLS)
alter table public.products enable row level security;

-- Create policies (Adjust based on your auth needs, here allowing public read for demo)
create policy "Allow public read access" on public.products for select using (true);
create policy "Allow authenticated insert" on public.products for insert with check (true);
create policy "Allow authenticated update" on public.products for update using (true);

-- Seed initial data
insert into public.products (name, code, unit, default_price) values
('Translucent Gergi Tavan', 'GT-001', 'mt', 30.00),
('Lake Gergi Tavan', 'GT-002', 'mt', 35.00),
('UV Baskılı Gergi Tavan', 'GT-003', 'mt', 45.00),
('LED Profil (Alüminyum)', 'PR-001', 'boy', 150.00),
('Samsung LED Bar', 'LED-001', 'adet', 12.50),
('Trafo 12V 30A', 'TR-030', 'adet', 450.00),
('Trafo 12V 12.5A', 'TR-012', 'adet', 250.00);

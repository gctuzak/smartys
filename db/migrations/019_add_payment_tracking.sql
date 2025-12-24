-- Add linking columns to cari_hareketler
ALTER TABLE "cari_hareketler" 
ADD COLUMN IF NOT EXISTS "order_id" uuid REFERENCES "orders"("id"),
ADD COLUMN IF NOT EXISTS "fatura_id" uuid REFERENCES "faturalar"("id");

-- Add tracking columns to faturalar
ALTER TABLE "faturalar"
ADD COLUMN IF NOT EXISTS "kalan_tutar" decimal(10, 2) DEFAULT 0;

-- Update existing faturalar: set kalan_tutar = genel_toplam for unpaid/partial ones
-- Assuming 'ODENDI' means fully paid, anything else might be unpaid.
-- But wait, we don't know if existing payments covered them.
-- For safety, for existing records, if status is 'ODENDI', set kalan_tutar = 0.
-- If status is NOT 'ODENDI', set kalan_tutar = genel_toplam.
-- This might be inaccurate if there were partial payments, but we can't know without history.
-- The user said "şu an kesilen faturaların ödeme vadelerini nasıl takip ediyoruz?" implies they are manually tracking or not tracking well.

UPDATE "faturalar"
SET "kalan_tutar" = CASE 
    WHEN "durum" = 'ODENDI' THEN 0
    ELSE "genel_toplam"
END;

-- Update status options? No, it's text.

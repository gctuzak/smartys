-- 1. Add linking columns to cari_hareketler
ALTER TABLE "cari_hareketler" 
ADD COLUMN IF NOT EXISTS "order_id" uuid REFERENCES "orders"("id"),
ADD COLUMN IF NOT EXISTS "fatura_id" uuid REFERENCES "faturalar"("id");

-- 2. Add tracking columns to faturalar
ALTER TABLE "faturalar"
ADD COLUMN IF NOT EXISTS "kalan_tutar" decimal(10, 2) DEFAULT 0;

-- 3. Update existing faturalar: set kalan_tutar = genel_toplam for unpaid/partial ones
UPDATE "faturalar"
SET "kalan_tutar" = CASE 
    WHEN "durum" = 'ODENDI' THEN 0
    ELSE "genel_toplam"
END;

-- 4. Update add_cari_hareket RPC to handle invoice closing and order linking
CREATE OR REPLACE FUNCTION add_cari_hareket(
  p_company_id uuid,
  p_islem_turu text,
  p_belge_no text,
  p_aciklama text,
  p_borc decimal,
  p_alacak decimal,
  p_tarih timestamp,
  p_order_id uuid DEFAULT NULL,
  p_fatura_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_current_bakiye decimal;
  v_new_bakiye decimal;
  v_current_kalan decimal;
BEGIN
  -- Get current balance
  SELECT guncel_bakiye INTO v_current_bakiye FROM companies WHERE id = p_company_id;
  
  IF v_current_bakiye IS NULL THEN
    v_current_bakiye := 0;
  END IF;

  -- Calculate new balance
  -- Borç (Satış) bakiyeyi artırır (+), Alacak (Tahsilat) bakiyeyi azaltır (-)
  v_new_bakiye := v_current_bakiye + p_borc - p_alacak;

  -- Insert transaction
  INSERT INTO cari_hareketler (
    company_id, islem_turu, belge_no, aciklama, borc, alacak, bakiye, tarih, order_id, fatura_id
  ) VALUES (
    p_company_id, p_islem_turu, p_belge_no, p_aciklama, p_borc, p_alacak, v_new_bakiye, p_tarih, p_order_id, p_fatura_id
  );

  -- Update company balance
  UPDATE companies SET guncel_bakiye = v_new_bakiye WHERE id = p_company_id;

  -- Update Invoice Remaining Amount (if payment)
  IF p_fatura_id IS NOT NULL AND p_alacak > 0 THEN
      SELECT kalan_tutar INTO v_current_kalan FROM faturalar WHERE id = p_fatura_id;
      
      -- Prevent negative remaining amount
      v_current_kalan := v_current_kalan - p_alacak;
      IF v_current_kalan < 0 THEN
          v_current_kalan := 0;
      END IF;

      -- Update Invoice
      UPDATE faturalar SET 
          kalan_tutar = v_current_kalan,
          durum = CASE 
              WHEN v_current_kalan <= 0.01 THEN 'ODENDI'
              ELSE 'KISMI_ODENDI'
          END
      WHERE id = p_fatura_id;
  END IF;

END;
$$ LANGUAGE plpgsql;

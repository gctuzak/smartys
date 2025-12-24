-- Drop first to avoid signature ambiguity if needed, but CREATE OR REPLACE with new signature usually works if types differ. 
-- However, adding default params to existing function might require DROP if signature matches but defaults change.
-- Safest is to just CREATE OR REPLACE with new params.

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
  v_old_balance decimal;
  v_new_balance decimal;
  v_current_kalan decimal;
  v_payment_amount decimal;
BEGIN
  -- Mevcut bakiyeyi al
  SELECT COALESCE(guncel_bakiye, 0) INTO v_old_balance FROM companies WHERE id = p_company_id;
  
  -- Yeni bakiyeyi hesapla
  v_new_balance := v_old_balance + p_borc - p_alacak;
  
  -- Hareketi kaydet
  INSERT INTO cari_hareketler (
    company_id, islem_turu, belge_no, aciklama, borc, alacak, bakiye, tarih, order_id, fatura_id
  ) VALUES (
    p_company_id, p_islem_turu, p_belge_no, p_aciklama, p_borc, p_alacak, v_new_balance, p_tarih, p_order_id, p_fatura_id
  );
  
  -- Şirket bakiyesini güncelle
  UPDATE companies SET guncel_bakiye = v_new_balance WHERE id = p_company_id;

  -- Eğer Fatura ID varsa ve Tahsilat ise (Alacak > 0), Fatura durumunu güncelle
  IF p_fatura_id IS NOT NULL AND p_alacak > 0 THEN
    -- Mevcut kalan tutarı al
    SELECT kalan_tutar INTO v_current_kalan FROM faturalar WHERE id = p_fatura_id;
    
    -- Ödeme tutarı (Alacak)
    v_payment_amount := p_alacak;
    
    -- Yeni kalan tutar
    v_current_kalan := v_current_kalan - v_payment_amount;
    
    IF v_current_kalan < 0 THEN
       v_current_kalan := 0;
    END IF;
    
    -- Faturayı güncelle
    UPDATE faturalar SET 
        kalan_tutar = v_current_kalan,
        durum = CASE 
            WHEN v_current_kalan <= 0.01 THEN 'ODENDI' -- Floating point tolerance
            ELSE 'KISMI_ODENDI'
        END
    WHERE id = p_fatura_id;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

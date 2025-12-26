-- Fix fatura_sil function to handle multiple linked transactions and use SECURITY DEFINER
CREATE OR REPLACE FUNCTION fatura_sil(p_fatura_id uuid) RETURNS json AS $$
DECLARE
  v_fatura RECORD;
  v_item RECORD;
  v_cari_hareket RECORD;
  v_diff decimal;
BEGIN
  -- 1. Fatura bilgilerini al
  SELECT * INTO v_fatura FROM faturalar WHERE id = p_fatura_id;
  
  IF v_fatura IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fatura bulunamadı');
  END IF;

  -- 2. Stok Hareketlerini Geri Al
  FOR v_item IN SELECT * FROM fatura_kalemleri WHERE fatura_id = p_fatura_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      IF v_fatura.tip = 'SATIS' THEN
        -- Satış faturası siliniyor -> Stok artırılmalı
        UPDATE products SET stok_miktari = stok_miktari + v_item.miktar WHERE id = v_item.product_id;
      ELSIF v_fatura.tip = 'ALIS' THEN
        -- Alış faturası siliniyor -> Stok azaltılmalı
        UPDATE products SET stok_miktari = stok_miktari - v_item.miktar WHERE id = v_item.product_id;
      END IF;
    END IF;
  END LOOP;

  -- Stok hareketlerini sil
  DELETE FROM stok_hareketleri WHERE fatura_id = p_fatura_id;

  -- 3. Cari Hareketleri Geri Al (TÜMÜNÜ)
  FOR v_cari_hareket IN SELECT * FROM cari_hareketler WHERE fatura_id = p_fatura_id
  LOOP
    v_diff := COALESCE(v_cari_hareket.alacak, 0) - COALESCE(v_cari_hareket.borc, 0);
    
    UPDATE cari_hareketler
    SET bakiye = bakiye + v_diff
    WHERE company_id = v_cari_hareket.company_id
      AND (tarih > v_cari_hareket.tarih OR (tarih = v_cari_hareket.tarih AND id > v_cari_hareket.id));
      
    UPDATE companies
    SET guncel_bakiye = guncel_bakiye + v_diff
    WHERE id = v_cari_hareket.company_id;
    
    DELETE FROM cari_hareketler WHERE id = v_cari_hareket.id;
  END LOOP;

  -- 4. Faturayı Sil
  DELETE FROM faturalar WHERE id = p_fatura_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

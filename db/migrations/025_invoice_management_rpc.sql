-- 1. Update fatura_olustur to accept optional ID
-- First drop the old function to avoid ambiguity
DROP FUNCTION IF EXISTS fatura_olustur(uuid, text, timestamp, timestamp, text, text, decimal, text, jsonb);

CREATE OR REPLACE FUNCTION fatura_olustur(
  p_company_id uuid,
  p_fatura_no text,
  p_tarih timestamp,
  p_son_odeme_tarihi timestamp,
  p_tip text,
  p_para_birimi text,
  p_doviz_kuru decimal,
  p_notlar text,
  p_kalemler jsonb,
  p_id uuid DEFAULT NULL -- New optional parameter
) RETURNS json AS $$
DECLARE
  v_fatura_id uuid;
  v_item jsonb;
  v_ara_toplam decimal := 0;
  v_kdv_toplam decimal := 0;
  v_genel_toplam decimal := 0;
  v_item_total decimal;
  v_old_stock decimal;
BEGIN
  -- 1. Faturayı oluştur (önce toplamlar 0)
  -- Eğer ID verilmişse onu kullan, yoksa yeni üret
  INSERT INTO faturalar (
    id, company_id, fatura_no, tarih, son_odeme_tarihi, tip, 
    para_birimi, doviz_kuru, notlar, durum,
    ara_toplam, kdv_toplam, genel_toplam
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_company_id, p_fatura_no, p_tarih, p_son_odeme_tarihi, p_tip,
    p_para_birimi, p_doviz_kuru, p_notlar, 'ONAYLI',
    0, 0, 0
  ) RETURNING id INTO v_fatura_id;

  -- 2. Kalemleri işle
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_kalemler)
  LOOP
    v_item_total := (v_item->>'miktar')::decimal * (v_item->>'birim_fiyat')::decimal;
    
    INSERT INTO fatura_kalemleri (
      fatura_id, product_id, aciklama, miktar, birim_fiyat, kdv_orani, toplam_tutar
    ) VALUES (
      v_fatura_id,
      (v_item->>'urun_id')::uuid,
      v_item->>'aciklama',
      (v_item->>'miktar')::decimal,
      (v_item->>'birim_fiyat')::decimal,
      (v_item->>'kdv_orani')::integer,
      v_item_total
    );

    -- Toplamları güncelle
    v_ara_toplam := v_ara_toplam + v_item_total;
    v_kdv_toplam := v_kdv_toplam + (v_item_total * (v_item->>'kdv_orani')::decimal / 100);

    -- Stok güncelleme
    IF (v_item->>'urun_id') IS NOT NULL THEN
      -- Mevcut stoğu al
      SELECT stok_miktari INTO v_old_stock FROM products WHERE id = (v_item->>'urun_id')::uuid;
      
      IF p_tip = 'SATIS' THEN
        -- Stok düş
        UPDATE products SET stok_miktari = stok_miktari - (v_item->>'miktar')::decimal 
        WHERE id = (v_item->>'urun_id')::uuid;
        
        -- Stok hareketi ekle (CIKIS)
        INSERT INTO stok_hareketleri (
          product_id, fatura_id, islem_turu, miktar, aciklama, tarih
        ) VALUES (
          (v_item->>'urun_id')::uuid, v_fatura_id, 'CIKIS', (v_item->>'miktar')::decimal, 'Satış Faturası: ' || p_fatura_no, p_tarih
        );
      ELSIF p_tip = 'ALIS' THEN
        -- Stok artır
        UPDATE products SET stok_miktari = stok_miktari + (v_item->>'miktar')::decimal 
        WHERE id = (v_item->>'urun_id')::uuid;
        
        -- Stok hareketi ekle (GIRIS)
        INSERT INTO stok_hareketleri (
          product_id, fatura_id, islem_turu, miktar, aciklama, tarih
        ) VALUES (
          (v_item->>'urun_id')::uuid, v_fatura_id, 'GIRIS', (v_item->>'miktar')::decimal, 'Alış Faturası: ' || p_fatura_no, p_tarih
        );
      END IF;
    END IF;
  END LOOP;

  v_genel_toplam := v_ara_toplam + v_kdv_toplam;

  -- 3. Fatura toplamlarını güncelle
  UPDATE faturalar SET
    ara_toplam = v_ara_toplam,
    kdv_toplam = v_kdv_toplam,
    genel_toplam = v_genel_toplam
  WHERE id = v_fatura_id;

  -- 4. Cari Hesap Hareketi ve Bakiye Güncelleme (Sadece Firma Seçiliyse)
  IF p_company_id IS NOT NULL THEN
    IF p_tip = 'SATIS' THEN
        -- Müşteriye satış -> Borçlandır
        PERFORM add_cari_hareket(
        p_company_id,
        'FATURA',
        p_fatura_no,
        'Satış Faturası',
        v_genel_toplam, -- Borç
        0,              -- Alacak
        p_tarih,
        NULL,           -- Order ID
        v_fatura_id     -- Fatura ID
        );
    ELSIF p_tip = 'ALIS' THEN
        -- Tedarikçiden alış -> Alacaklandır (Biz borçlandık)
        PERFORM add_cari_hareket(
        p_company_id,
        'FATURA',
        p_fatura_no,
        'Alış Faturası',
        0,              -- Borç
        v_genel_toplam, -- Alacak
        p_tarih,
        NULL,           -- Order ID
        v_fatura_id     -- Fatura ID
        );
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'fatura_id', v_fatura_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- 2. Create fatura_sil function
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

  -- 3. Cari Hareketi Geri Al
  SELECT * INTO v_cari_hareket FROM cari_hareketler WHERE fatura_id = p_fatura_id;
  
  IF v_cari_hareket IS NOT NULL THEN
    -- Bakiye farkını hesapla (Silinen işlem ne yaptıysa tersi)
    v_diff := COALESCE(v_cari_hareket.alacak, 0) - COALESCE(v_cari_hareket.borc, 0);
    
    -- Sonraki hareketleri güncelle
    UPDATE cari_hareketler
    SET bakiye = bakiye + v_diff
    WHERE company_id = v_cari_hareket.company_id
      AND (tarih > v_cari_hareket.tarih OR (tarih = v_cari_hareket.tarih AND id > v_cari_hareket.id));
      
    -- Şirket bakiyesini güncelle
    UPDATE companies
    SET guncel_bakiye = guncel_bakiye + v_diff
    WHERE id = v_cari_hareket.company_id;
    
    -- Hareketi sil
    DELETE FROM cari_hareketler WHERE id = v_cari_hareket.id;
  END IF;

  -- 4. Faturayı Sil
  DELETE FROM faturalar WHERE id = p_fatura_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- 3. Create fatura_guncelle function
CREATE OR REPLACE FUNCTION fatura_guncelle(
  p_fatura_id uuid,
  p_company_id uuid,
  p_fatura_no text,
  p_tarih timestamp,
  p_son_odeme_tarihi timestamp,
  p_tip text,
  p_para_birimi text,
  p_doviz_kuru decimal,
  p_notlar text,
  p_kalemler jsonb
) RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Eski faturayı sil
  v_result := fatura_sil(p_fatura_id);
  
  IF (v_result->>'success')::boolean = false THEN
    RETURN v_result;
  END IF;

  -- 2. Yeni faturayı oluştur (aynı ID ile)
  RETURN fatura_olustur(
    p_company_id, p_fatura_no, p_tarih, p_son_odeme_tarihi, p_tip, 
    p_para_birimi, p_doviz_kuru, p_notlar, p_kalemler, p_fatura_id
  );
END;
$$ LANGUAGE plpgsql;

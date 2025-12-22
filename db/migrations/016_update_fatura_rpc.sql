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
  p_kalemler jsonb
) RETURNS json AS $$
DECLARE
  v_fatura_id uuid;
  v_item jsonb;
  v_ara_toplam decimal := 0;
  v_kdv_toplam decimal := 0;
  v_genel_toplam decimal := 0;
  v_item_total decimal;
  v_old_stock integer;
BEGIN
  -- 1. Faturayı oluştur (önce toplamlar 0)
  INSERT INTO faturalar (
    company_id, fatura_no, tarih, son_odeme_tarihi, tip, 
    para_birimi, doviz_kuru, notlar, durum,
    ara_toplam, kdv_toplam, genel_toplam
  ) VALUES (
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
      (v_item->>'miktar')::integer,
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
        UPDATE products SET stok_miktari = stok_miktari - (v_item->>'miktar')::integer 
        WHERE id = (v_item->>'urun_id')::uuid;
        
        -- Stok hareketi ekle (CIKIS)
        INSERT INTO stok_hareketleri (
          product_id, fatura_id, islem_turu, miktar, aciklama, tarih
        ) VALUES (
          (v_item->>'urun_id')::uuid, v_fatura_id, 'CIKIS', (v_item->>'miktar')::integer, 'Satış Faturası: ' || p_fatura_no, p_tarih
        );
      ELSIF p_tip = 'ALIS' THEN
        -- Stok artır
        UPDATE products SET stok_miktari = stok_miktari + (v_item->>'miktar')::integer 
        WHERE id = (v_item->>'urun_id')::uuid;
        
        -- Stok hareketi ekle (GIRIS)
        INSERT INTO stok_hareketleri (
          product_id, fatura_id, islem_turu, miktar, aciklama, tarih
        ) VALUES (
          (v_item->>'urun_id')::uuid, v_fatura_id, 'GIRIS', (v_item->>'miktar')::integer, 'Alış Faturası: ' || p_fatura_no, p_tarih
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

  -- 4. Cari Hesap Hareketi ve Bakiye Güncelleme
  IF p_tip = 'SATIS' THEN
    -- Müşteriye satış -> Borçlandır
    PERFORM add_cari_hareket(
      p_company_id,
      'FATURA',
      p_fatura_no,
      'Satış Faturası',
      v_genel_toplam, -- Borç
      0,              -- Alacak
      p_tarih
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
      p_tarih
    );
  END IF;

  RETURN json_build_object('id', v_fatura_id, 'fatura_no', p_fatura_no);
END;
$$ LANGUAGE plpgsql;

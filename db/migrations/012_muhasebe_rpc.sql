-- Fatura Oluşturma Fonksiyonu
-- Bu fonksiyon tek bir transaction içinde faturayı, kalemlerini oluşturur, stok hareketlerini işler ve bakiyeyi günceller.
CREATE OR REPLACE FUNCTION fatura_olustur(
  p_company_id uuid,
  p_fatura_no text,
  p_tarih timestamp,
  p_son_odeme_tarihi timestamp,
  p_tip text, -- SATIS, ALIS
  p_para_birimi text,
  p_doviz_kuru decimal,
  p_notlar text,
  p_kalemler jsonb -- [{ product_id, aciklama, miktar, birim, birim_fiyat, kdv_orani }]
) RETURNS uuid AS $$
DECLARE
  v_fatura_id uuid;
  v_kalem jsonb;
  v_ara_toplam decimal(10, 2) := 0;
  v_kdv_toplam decimal(10, 2) := 0;
  v_genel_toplam decimal(10, 2) := 0;
  v_satir_tutar decimal(10, 2);
  v_satir_kdv decimal(10, 2);
  v_islem_turu text;
  v_stok_degisim_yonu integer;
BEGIN
  -- İşlem türüne göre stok yönünü belirle
  IF p_tip = 'SATIS' THEN
    v_islem_turu := 'CIKIS';
    v_stok_degisim_yonu := -1; -- Stoktan düş
  ELSIF p_tip = 'ALIS' THEN
    v_islem_turu := 'GIRIS';
    v_stok_degisim_yonu := 1; -- Stoka ekle
  ELSE
    RAISE EXCEPTION 'Geçersiz fatura tipi: %', p_tip;
  END IF;

  -- 1. Faturayı TASLAK olarak oluştur (Önce ID lazım)
  INSERT INTO faturalar (
    company_id, fatura_no, tarih, son_odeme_tarihi, tip, durum,
    para_birimi, doviz_kuru, notlar
  ) VALUES (
    p_company_id, p_fatura_no, p_tarih, p_son_odeme_tarihi, p_tip, 'ONAYLI', -- Doğrudan onaylı oluşturuyoruz
    p_para_birimi, p_doviz_kuru, p_notlar
  ) RETURNING id INTO v_fatura_id;

  -- 2. Kalemleri dön ve işle
  FOR v_kalem IN SELECT * FROM jsonb_array_elements(p_kalemler)
  LOOP
    -- Hesaplamalar
    v_satir_tutar := (v_kalem->>'miktar')::decimal * (v_kalem->>'birim_fiyat')::decimal;
    v_satir_kdv := v_satir_tutar * ((v_kalem->>'kdv_orani')::integer / 100.0);
    
    v_ara_toplam := v_ara_toplam + v_satir_tutar;
    v_kdv_toplam := v_kdv_toplam + v_satir_kdv;

    -- Kalem Ekle
    INSERT INTO fatura_kalemleri (
      fatura_id, product_id, aciklama, miktar, birim,
      birim_fiyat, kdv_orani, toplam_tutar
    ) VALUES (
      v_fatura_id,
      (v_kalem->>'product_id')::uuid,
      v_kalem->>'aciklama',
      (v_kalem->>'miktar')::integer,
      v_kalem->>'birim',
      (v_kalem->>'birim_fiyat')::decimal,
      (v_kalem->>'kdv_orani')::integer,
      v_satir_tutar + v_satir_kdv
    );

    -- Stok Hareketi Ekle
    IF (v_kalem->>'product_id') IS NOT NULL THEN
      INSERT INTO stok_hareketleri (
        product_id, fatura_id, islem_turu, miktar, tarih, aciklama
      ) VALUES (
        (v_kalem->>'product_id')::uuid,
        v_fatura_id,
        v_islem_turu,
        (v_kalem->>'miktar')::integer,
        p_tarih,
        'Fatura No: ' || p_fatura_no
      );

      -- Ürün Stoğunu Güncelle
      UPDATE products
      SET stok_miktari = stok_miktari + ((v_kalem->>'miktar')::integer * v_stok_degisim_yonu)
      WHERE id = (v_kalem->>'product_id')::uuid;
      
      -- Negatif stok kontrolü (Trigger veya Constraint ile de korunuyor ama burada explicit check iyi olur)
      -- Eğer constraint hatası alırsak transaction otomatik rollback olur.
    END IF;
  END LOOP;

  v_genel_toplam := v_ara_toplam + v_kdv_toplam;

  -- 3. Fatura Toplamlarını Güncelle
  UPDATE faturalar
  SET
    ara_toplam = v_ara_toplam,
    kdv_toplam = v_kdv_toplam,
    genel_toplam = v_genel_toplam
  WHERE id = v_fatura_id;

  -- 4. Cari Bakiyeyi Güncelle
  -- SATIS ise Müşteri Borçlanır (+), ALIS ise Alacaklanır (-)
  -- Burada basit mantık: Bakiye = Alacak - Borç değil, Bakiye = Müşterinin bize borcu olarak düşünelim.
  -- Satış faturası kestiğimizde müşterinin borcu artar.
  IF p_tip = 'SATIS' THEN
    UPDATE companies
    SET guncel_bakiye = COALESCE(guncel_bakiye, 0) + v_genel_toplam
    WHERE id = p_company_id;
  ELSIF p_tip = 'ALIS' THEN
    UPDATE companies
    SET guncel_bakiye = COALESCE(guncel_bakiye, 0) - v_genel_toplam
    WHERE id = p_company_id;
  END IF;

  RETURN v_fatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fatura İptal Fonksiyonu
CREATE OR REPLACE FUNCTION fatura_iptal_et(
  p_fatura_id uuid
) RETURNS void AS $$
DECLARE
  v_fatura record;
  v_hareket record;
  v_stok_yonu integer;
BEGIN
  -- Faturayı bul
  SELECT * INTO v_fatura FROM faturalar WHERE id = p_fatura_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura bulunamadı';
  END IF;

  IF v_fatura.durum = 'IPTAL' THEN
    RAISE EXCEPTION 'Fatura zaten iptal edilmiş';
  END IF;

  -- 1. Stok Hareketlerini Tersine Çevir
  -- Mevcut stok hareketlerini bul
  FOR v_hareket IN SELECT * FROM stok_hareketleri WHERE fatura_id = p_fatura_id
  LOOP
    -- Hareket 'CIKIS' ise (Satış), stoğu geri ekle (+1)
    -- Hareket 'GIRIS' ise (Alış), stoğu geri düş (-1)
    IF v_hareket.islem_turu = 'CIKIS' THEN
      v_stok_yonu := 1;
    ELSE
      v_stok_yonu := -1;
    END IF;

    UPDATE products
    SET stok_miktari = stok_miktari + (v_hareket.miktar * v_stok_yonu)
    WHERE id = v_hareket.product_id;

    -- İptal hareketi logla (Opsiyonel, şimdilik sadece eski hareketi "etkisiz" kılıyoruz ama kaydı silmiyoruz)
    -- Muhasebe kaydı olarak "İptal" statüsüne çekmek yeterli mi? 
    -- Stok hareketini silmek yerine ters kayıt atmak daha doğrudur ama basitlik için stok miktarını düzeltip faturayı iptal yapıyoruz.
  END LOOP;

  -- 2. Cari Bakiyeyi Düzelt
  IF v_fatura.tip = 'SATIS' THEN
    UPDATE companies
    SET guncel_bakiye = guncel_bakiye - v_fatura.genel_toplam
    WHERE id = v_fatura.company_id;
  ELSIF v_fatura.tip = 'ALIS' THEN
    UPDATE companies
    SET guncel_bakiye = guncel_bakiye + v_fatura.genel_toplam
    WHERE id = v_fatura.company_id;
  END IF;

  -- 3. Faturayı İptal Olarak İşaretle
  UPDATE faturalar
  SET durum = 'IPTAL'
  WHERE id = p_fatura_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

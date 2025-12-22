-- Cari hareket ekleme ve bakiye güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION add_cari_hareket(
  p_company_id uuid,
  p_islem_turu text,
  p_belge_no text,
  p_aciklama text,
  p_borc decimal,
  p_alacak decimal,
  p_tarih timestamp
) RETURNS void AS $$
DECLARE
  v_old_balance decimal;
  v_new_balance decimal;
BEGIN
  -- Mevcut bakiyeyi al
  SELECT COALESCE(guncel_bakiye, 0) INTO v_old_balance FROM companies WHERE id = p_company_id;
  
  -- Yeni bakiyeyi hesapla (Borç artırır, Alacak azaltır - Müşteri için)
  -- Not: Bu mantık "Müşteri" (Alıcı) için geçerlidir. Tedarikçi ise tam tersi olabilir.
  -- Ancak genelde sistem tek taraflı tutulur:
  -- Borç: Bize borçlandı (Satış Faturası)
  -- Alacak: Bize ödeme yaptı veya bizden alacaklandı (Tahsilat / Alış Faturası)
  
  -- Standart Muhasebe Mantığı:
  -- Satış Faturası -> Müşteri Borçlanır (Borç Artar)
  -- Tahsilat -> Müşteri Alacaklanır (Borç Azalır / Alacak Artar) -> Bakiye (Borç - Alacak) düşer.
  
  -- Burada Bakiye = Toplam Borç - Toplam Alacak olarak düşünelim.
  -- Pozitif Bakiye: Müşteri bize borçlu.
  -- Negatif Bakiye: Biz müşteriye borçluyuz (Avans vs).
  
  v_new_balance := v_old_balance + p_borc - p_alacak;
  
  -- Hareketi kaydet
  INSERT INTO cari_hareketler (
    company_id, islem_turu, belge_no, aciklama, borc, alacak, bakiye, tarih
  ) VALUES (
    p_company_id, p_islem_turu, p_belge_no, p_aciklama, p_borc, p_alacak, v_new_balance, p_tarih
  );
  
  -- Şirket bakiyesini güncelle
  UPDATE companies SET guncel_bakiye = v_new_balance WHERE id = p_company_id;
  
END;
$$ LANGUAGE plpgsql;

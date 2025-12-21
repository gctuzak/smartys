-- Önceki migration'da tanımlanan politikaları güncelle (Anon erişimine izin ver - Uygulama katmanında güvenlik sağlanacak)
-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Faturaları görüntüleme (Auth)" ON "faturalar";
DROP POLICY IF EXISTS "Fatura oluşturma (Auth)" ON "faturalar";
DROP POLICY IF EXISTS "Fatura güncelleme (Auth)" ON "faturalar";
DROP POLICY IF EXISTS "Kalemleri görüntüleme (Auth)" ON "fatura_kalemleri";
DROP POLICY IF EXISTS "Kalem ekleme (Auth)" ON "fatura_kalemleri";
DROP POLICY IF EXISTS "Kalem düzenleme (Auth)" ON "fatura_kalemleri";
DROP POLICY IF EXISTS "Kalem silme (Auth)" ON "fatura_kalemleri";
DROP POLICY IF EXISTS "Hareketleri görüntüleme (Auth)" ON "stok_hareketleri";
DROP POLICY IF EXISTS "Hareket ekleme (Auth)" ON "stok_hareketleri";

-- FATURALAR TABLOSU
ALTER TABLE "faturalar" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faturaları görüntüleme (Anon)" ON "faturalar"
  FOR SELECT USING (true); -- Auth check uygulama katmanında

CREATE POLICY "Fatura oluşturma (Anon)" ON "faturalar"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Fatura güncelleme (Anon)" ON "faturalar"
  FOR UPDATE USING (true);

-- FATURA KALEMLERİ TABLOSU
ALTER TABLE "fatura_kalemleri" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kalemleri görüntüleme (Anon)" ON "fatura_kalemleri"
  FOR SELECT USING (true);

CREATE POLICY "Kalem ekleme (Anon)" ON "fatura_kalemleri"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Kalem düzenleme (Anon)" ON "fatura_kalemleri"
  FOR UPDATE USING (true);

CREATE POLICY "Kalem silme (Anon)" ON "fatura_kalemleri"
  FOR DELETE USING (true);

-- STOK HAREKETLERİ TABLOSU
ALTER TABLE "stok_hareketleri" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hareketleri görüntüleme (Anon)" ON "stok_hareketleri"
  FOR SELECT USING (true);

CREATE POLICY "Hareket ekleme (Anon)" ON "stok_hareketleri"
  FOR INSERT WITH CHECK (true);

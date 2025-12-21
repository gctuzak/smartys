-- Companies tablosuna bakiye alanı ekle
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "guncel_bakiye" decimal(10, 2) DEFAULT 0;

-- Products tablosuna stok alanları ekle
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stok_miktari" integer DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "kritik_stok_seviyesi" integer DEFAULT 10;

-- Negatif stok kontrolü için constraint
ALTER TABLE "products" ADD CONSTRAINT "check_stok_pozitif" CHECK (stok_miktari >= 0);

-- Faturalar tablosu
CREATE TABLE IF NOT EXISTS "faturalar" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid REFERENCES "companies"("id"),
  "fatura_no" text NOT NULL UNIQUE,
  "tarih" timestamp DEFAULT now() NOT NULL,
  "son_odeme_tarihi" timestamp,
  "tip" text NOT NULL, -- SATIS, ALIS, IADE
  "durum" text DEFAULT 'TASLAK', -- TASLAK, ONAYLI, IPTAL
  "ara_toplam" decimal(10, 2) DEFAULT 0,
  "kdv_toplam" decimal(10, 2) DEFAULT 0,
  "genel_toplam" decimal(10, 2) DEFAULT 0,
  "para_birimi" text DEFAULT 'TRY',
  "doviz_kuru" decimal(10, 4) DEFAULT 1,
  "notlar" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Fatura Kalemleri tablosu
CREATE TABLE IF NOT EXISTS "fatura_kalemleri" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fatura_id" uuid NOT NULL REFERENCES "faturalar"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id"),
  "aciklama" text NOT NULL,
  "miktar" integer NOT NULL,
  "birim" text DEFAULT 'Adet',
  "birim_fiyat" decimal(10, 2) NOT NULL,
  "kdv_orani" integer DEFAULT 20,
  "toplam_tutar" decimal(10, 2) NOT NULL
);

-- Stok Hareketleri tablosu
CREATE TABLE IF NOT EXISTS "stok_hareketleri" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "fatura_id" uuid REFERENCES "faturalar"("id"),
  "islem_turu" text NOT NULL, -- GIRIS, CIKIS
  "miktar" integer NOT NULL,
  "tarih" timestamp DEFAULT now() NOT NULL,
  "aciklama" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- RLS Politikaları (Başlangıç - Detaylar sonraki adımda)
ALTER TABLE "faturalar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fatura_kalemleri" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stok_hareketleri" ENABLE ROW LEVEL SECURITY;

-- Okuma izinleri (Şimdilik tüm authenticated kullanıcılar)
CREATE POLICY "Faturaları herkes görebilir" ON "faturalar" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Kalemleri herkes görebilir" ON "fatura_kalemleri" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Stok hareketlerini herkes görebilir" ON "stok_hareketleri" FOR SELECT USING (auth.role() = 'authenticated');

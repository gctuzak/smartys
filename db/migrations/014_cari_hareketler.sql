CREATE TABLE IF NOT EXISTS "cari_hareketler" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "tarih" timestamp NOT NULL DEFAULT now(),
  "islem_turu" text NOT NULL, -- FATURA, TAHSILAT, ODEME, ACILIS_BAKIYESI, VIRMAN
  "belge_no" text,
  "aciklama" text,
  "borc" decimal(10, 2) DEFAULT 0,
  "alacak" decimal(10, 2) DEFAULT 0,
  "bakiye" decimal(10, 2) DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

"use server";

import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function runMigration022Action() {
  try {
    console.log("Starting migration 022 via Server Action...");
    
    const migrationSql = `
CREATE OR REPLACE FUNCTION delete_cari_hareket(
  p_id uuid
) RETURNS void AS $$
DECLARE
  v_hareket RECORD;
  v_diff decimal;
  v_company_id uuid;
  v_fatura_id uuid;
  v_alacak decimal;
  v_new_kalan decimal;
  v_fatura_total decimal;
BEGIN
  -- 1. İşlem detaylarını al
  SELECT * INTO v_hareket FROM cari_hareketler WHERE id = p_id;
  
  IF v_hareket IS NULL THEN
    RAISE EXCEPTION 'İşlem bulunamadı';
  END IF;

  v_company_id := v_hareket.company_id;
  v_fatura_id := v_hareket.fatura_id;
  v_alacak := v_hareket.alacak;

  -- 2. Bakiye farkını hesapla
  v_diff := COALESCE(v_hareket.alacak, 0) - COALESCE(v_hareket.borc, 0);

  -- 3. Sonraki işlemlerin bakiyesini güncelle
  UPDATE cari_hareketler
  SET bakiye = bakiye + v_diff
  WHERE company_id = v_company_id
    AND (tarih > v_hareket.tarih OR (tarih = v_hareket.tarih AND id > p_id));

  -- 4. Şirket güncel bakiyesini güncelle
  UPDATE companies
  SET guncel_bakiye = guncel_bakiye + v_diff
  WHERE id = v_company_id;

  -- 5. Fatura bağlantısı varsa ve bu bir ödeme ise (Alacak > 0), faturayı güncelle
  IF v_fatura_id IS NOT NULL AND v_alacak > 0 THEN
    UPDATE faturalar
    SET kalan_tutar = kalan_tutar + v_alacak
    WHERE id = v_fatura_id
    RETURNING kalan_tutar, genel_toplam INTO v_new_kalan, v_fatura_total;

    UPDATE faturalar
    SET durum = CASE 
      WHEN v_new_kalan >= v_fatura_total - 0.01 THEN 'ONAYLI'
      WHEN v_new_kalan <= 0.01 THEN 'ODENDI'
      ELSE 'KISMI_ODENDI'
    END
    WHERE id = v_fatura_id;
  END IF;

  -- 6. İşlemi sil
  DELETE FROM cari_hareketler WHERE id = p_id;

END;
$$ LANGUAGE plpgsql;
    `;

    await db.execute(sql.raw(migrationSql));
    console.log("Migration 022 executed successfully.");
    return { success: true };
  } catch (error: any) {
    console.error("Migration 022 failed:", error);
    return { success: false, error: error.message };
  }
}

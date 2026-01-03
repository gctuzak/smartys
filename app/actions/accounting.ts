"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CreateInvoiceParams {
  company_id: string | null;
  fatura_no: string;
  tarih: string;
  son_odeme_tarihi?: string | null;
  tip: "SATIS" | "ALIS";
  para_birimi?: string;
  doviz_kuru?: number;
  notlar?: string;
  order_id?: string;
  items: {
    urun_id?: string;
    aciklama: string;
    miktar: number;
    birim_fiyat: number;
    kdv_orani: number;
  }[];
}

export async function createInvoiceAction(params: CreateInvoiceParams) {
  try {
    const { data, error } = await supabase.rpc("fatura_olustur", {
      p_company_id: params.company_id,
      p_fatura_no: params.fatura_no,
      p_tarih: params.tarih,
      p_son_odeme_tarihi: params.son_odeme_tarihi || null,
      p_tip: params.tip,
      p_para_birimi: params.para_birimi || "TRY",
      p_doviz_kuru: params.doviz_kuru || 1,
      p_notlar: params.notlar || "",
      p_kalemler: params.items
    });

    if (error) {
      console.error("Fatura oluşturma hatası:", error);
      return { success: false, error: error.message };
    }

    // If order_id is present, link it
    if (params.order_id && data) {
      // The RPC might return just ID string or object depending on version.
      // Looking at migration 025, it returns json object {"success": true} if successful?
      // Wait, migration 012 returns uuid. Migration 025 returns json.
      // Migration 025: RETURNS json AS $$ ... RETURN json_build_object('success', true);
      // Wait, if it returns json, I don't get the ID!
      // Migration 025 has: RETURNING id INTO v_fatura_id; ... but returns json_build_object('success', true).
      // This is a problem if I need the ID.
      // Let's check migration 025 again.
      
      // Ah, I need to fix the RPC to return the ID if I want to use it.
      // OR, find the invoice by number.
      
      const { data: invoice } = await supabase
        .from("faturalar")
        .select("id")
        .eq("fatura_no", params.fatura_no)
        .single();
        
      if (invoice) {
        await supabase
          .from("faturalar")
          .update({ order_id: params.order_id })
          .eq("id", invoice.id);
          
        // Also update order status to 'completed' or similar if needed?
        // Maybe 'invoiced'? But status is text.
      }
    }

    revalidatePath("/muhasebe/faturalar");
    revalidatePath("/muhasebe/stok");
    revalidatePath("/companies"); // Bakiye değiştiği için
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Beklenmeyen hata:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInvoiceAction(id: string, params: CreateInvoiceParams) {
  try {
    const { data, error } = await supabase.rpc("fatura_guncelle", {
      p_fatura_id: id,
      p_company_id: params.company_id,
      p_fatura_no: params.fatura_no,
      p_tarih: params.tarih,
      p_son_odeme_tarihi: params.son_odeme_tarihi || null,
      p_tip: params.tip,
      p_para_birimi: params.para_birimi || "TRY",
      p_doviz_kuru: params.doviz_kuru || 1,
      p_notlar: params.notlar || "",
      p_kalemler: params.items
    });

    if (error) {
      console.error("Fatura güncelleme hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/muhasebe/faturalar");
    revalidatePath("/muhasebe/stok");
    revalidatePath("/companies");
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Beklenmeyen hata:", error);
    return { success: false, error: error.message };
  }
}

export async function getOrderForInvoiceAction(orderId: string) {
  try {
    // 1. Get Order Details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        company_id,
        amount,
        currency,
        proposal_id,
        project_name
      `)
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    let items: any[] = [];

    // 2. If has proposal, get proposal items
    if (order.proposal_id) {
      const { data: proposalItems, error: itemsError } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", order.proposal_id)
        .order("order", { ascending: true });

      if (!itemsError && proposalItems) {
        items = proposalItems.map(item => ({
          product_id: null, // Proposal items don't strictly link to products table yet in this schema?
          // Wait, proposal_items has description, unit_price, etc. but maybe not product_id?
          // Checking schema: proposalItems has no product_id column in provided schema read.
          // It has description, quantity, unit, unitPrice, etc.
          aciklama: item.description,
          miktar: Number(item.quantity),
          birim: item.unit || "Adet",
          birim_fiyat: Number(item.unit_price),
          kdv_orani: 20, // Default or fetch if available
          iskonto: 0
        }));
      }
    } 
    
    // If no items found from proposal, use order total
    if (items.length === 0) {
      items.push({
        product_id: null,
        aciklama: `Sipariş #${order.order_no} - ${order.project_name || 'Genel'}`,
        miktar: 1,
        birim: "Adet",
        birim_fiyat: Number(order.amount),
        kdv_orani: 20,
        iskonto: 0
      });
    }

    return { 
      success: true, 
      data: {
        order,
        items
      } 
    };
  } catch (error: any) {
    console.error("Get Order For Invoice Error:", error);
    return { success: false, error: "Sipariş bilgileri alınamadı." };
  }
}

import { db } from "@/db";
import { sql } from "drizzle-orm";

async function fixFaturaSilRPC() {
    const query = sql.raw(`
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
    `);
    
    console.log("Applying fatura_sil RPC fix...");
    await db.execute(query);
    console.log("fatura_sil RPC fix applied.");
}

export async function deleteInvoiceAction(id: string) {
  try {
    let { data, error } = await supabase.rpc("fatura_sil", {
      p_fatura_id: id
    });

    // Eğer hata varsa veya success false ise fix'i dene
    if (error || (data && !data.success)) {
        console.warn("Fatura silme ilk deneme başarısız, RPC güncelleniyor...", error || data);
        try {
            await fixFaturaSilRPC();
            // Tekrar dene
            const retry = await supabase.rpc("fatura_sil", { p_fatura_id: id });
            data = retry.data;
            error = retry.error;
        } catch (fixErr) {
            console.error("RPC fix failed:", fixErr);
        }
    }

    if (error) {
      console.error("Fatura silme hatası (RPC Call):", error);
      return { success: false, error: error.message };
    }
    
    // RPC returns { success: boolean, error?: string }
    if (data && !data.success) {
        console.error("Fatura silme mantıksal hata:", data.error);
        return { success: false, error: data.error };
    }

    revalidatePath("/muhasebe/faturalar");
    revalidatePath("/muhasebe/stok");
    revalidatePath("/companies");

    return { success: true, data };
  } catch (error: any) {
    console.error("Beklenmeyen hata:", error);
    return { success: false, error: error.message };
  }
}

export async function getInvoicesAction(page = 1, pageSize = 20, type?: 'SATIS' | 'ALIS') {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("faturalar")
      .select(`
        *,
        company:companies (name)
      `, { count: "exact" });

    if (type) {
      query = query.eq("tip", type);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { data, count, error: null };
  } catch (error: any) {
    return { data: null, count: 0, error: error.message };
  }
}

export async function getStockAction(page = 1, pageSize = 20) {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
  
      const { data, count, error } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);
  
      if (error) throw error;
  
      return { data, count, error: null };
    } catch (error: any) {
      return { data: null, count: 0, error: error.message };
    }
  }

export async function getUnpaidInvoicesAction(companyId: string) {
    try {
        const { data, error } = await supabase
            .from("faturalar")
            .select("id, fatura_no, genel_toplam, kalan_tutar, tarih, tip")
            .eq("company_id", companyId)
            .neq("durum", "ODENDI")
            .order("tarih", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInvoiceDetailAction(invoiceId: string) {
  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from("faturalar")
      .select(`
        *,
        company:companies (name, tax_no, address, district, city),
        items:fatura_kalemleri (
            id,
            product_id,
            aciklama,
            miktar,
            birim_fiyat,
            kdv_orani,
            toplam_tutar,
            birim
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    return { success: true, data: invoice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

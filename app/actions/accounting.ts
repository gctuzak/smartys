"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CreateInvoiceParams {
  company_id: string;
  fatura_no: string;
  tarih: string;
  son_odeme_tarihi?: string | null;
  tip: "SATIS" | "ALIS";
  para_birimi?: string;
  doviz_kuru?: number;
  notlar?: string;
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

    revalidatePath("/muhasebe/faturalar");
    revalidatePath("/muhasebe/stok");
    revalidatePath("/companies"); // Bakiye değiştiği için
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Beklenmeyen hata:", error);
    return { success: false, error: error.message };
  }
}

export async function getInvoicesAction(page = 1, pageSize = 20) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("faturalar")
      .select(`
        *,
        company:companies (name)
      `, { count: "exact" })
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

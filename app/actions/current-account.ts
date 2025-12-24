"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AddTransactionParams {
  company_id: string;
  islem_turu: "TAHSILAT" | "ODEME" | "ACILIS_BAKIYESI" | "VIRMAN";
  belge_no?: string;
  aciklama?: string;
  tutar: number; // Frontend sends positive amount
  tarih: string;
  order_id?: string;
  fatura_id?: string;
}

export async function addTransactionAction(params: AddTransactionParams) {
  try {
    let borc = 0;
    let alacak = 0;

    if (params.islem_turu === "TAHSILAT") {
      alacak = params.tutar;
    } else if (params.islem_turu === "ODEME") {
      borc = params.tutar;
    } else if (params.islem_turu === "ACILIS_BAKIYESI") {
        borc = params.tutar;
    }

    const { error } = await supabase.rpc("add_cari_hareket", {
      p_company_id: params.company_id,
      p_islem_turu: params.islem_turu,
      p_belge_no: params.belge_no || "",
      p_aciklama: params.aciklama || "",
      p_borc: borc,
      p_alacak: alacak,
      p_tarih: params.tarih,
      p_order_id: params.order_id || null,
      p_fatura_id: params.fatura_id || null
    });

    if (error) throw error;

    revalidatePath(`/muhasebe/cariler/${params.company_id}`);
    revalidatePath("/companies");
    if (params.fatura_id) {
        revalidatePath("/muhasebe/faturalar");
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Transaction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompanyTransactionsAction(companyId: string, page = 1, pageSize = 20) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("cari_hareketler")
      .select(`
        *,
        order:orders (order_no),
        fatura:faturalar (fatura_no)
      `, { count: "exact" })
      .eq("company_id", companyId)
      .order("tarih", { ascending: false }) // Newest first
      .range(from, to);

    if (error) throw error;

    return { success: true, data, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCompanyOrdersAction(companyId: string) {
    try {
        const { data, error } = await supabase
            .from("orders")
            .select("id, order_no, amount, status")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

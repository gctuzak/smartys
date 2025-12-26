"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getExchangeRates } from "@/lib/tcmb";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AddTransactionParams {
  company_id: string;
  islem_turu: "TAHSILAT" | "ODEME" | "ACILIS_BAKIYESI" | "VIRMAN";
  belge_no?: string;
  aciklama?: string;
  tutar: number; // Frontend sends positive amount (in selected currency)
  tarih: string;
  order_id?: string;
  fatura_id?: string;
  currency?: string; // 'TRY', 'USD', 'EUR'
  exchangeRate?: number; // User provided rate or fetched
}

export async function getLatestRatesAction() {
  try {
    const rates = await getExchangeRates();
    return { success: true, data: rates };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addTransactionAction(params: AddTransactionParams) {
  try {
    let borc = 0;
    let alacak = 0;
    
    // Determine Currency and Amounts
    let doviz_turu = null;
    let doviz_kuru = null;
    let doviz_tutari = null;
    let tlAmount = params.tutar;

    // 1. Explicit Foreign Currency Transaction (User selected USD/EUR)
    if (params.currency && params.currency !== 'TRY') {
        doviz_turu = params.currency;
        doviz_kuru = params.exchangeRate || 1; // Should be provided, fallback 1
        doviz_tutari = params.tutar;
        
        // Calculate TL Equivalent
        tlAmount = Number((params.tutar * doviz_kuru).toFixed(2));
    } 
    // 2. TRY Transaction (User selected TRY or default)
    else {
        // Check if we need to convert to FX for tracking (Invoice/Order context)
        let targetCurrency = 'TRY';
        if (params.fatura_id) {
            const { data: fatura } = await supabase.from('faturalar').select('para_birimi').eq('id', params.fatura_id).single();
            if (fatura && fatura.para_birimi) targetCurrency = fatura.para_birimi;
        } else if (params.order_id) {
            const { data: order } = await supabase.from('orders').select('currency').eq('id', params.order_id).single();
            if (order && order.currency) targetCurrency = order.currency;
        }

        if (targetCurrency !== 'TRY') {
             const rates = await getExchangeRates();
             if (rates) {
                 doviz_turu = targetCurrency;
                 let rate = 1;
                 
                 // Use Selling Rate for conversion
                 if (targetCurrency === 'USD') rate = rates.usdSelling;
                 else if (targetCurrency === 'EUR') rate = rates.eurSelling;

                 if (rate > 0) {
                     doviz_kuru = rate;
                     // Amount in FX = Amount (TL) / Rate
                     doviz_tutari = Number((params.tutar / rate).toFixed(2));
                 }
             }
        }
    }

    // Set Borç/Alacak based on TL Amount
    if (params.islem_turu === "TAHSILAT") {
      alacak = tlAmount;
    } else if (params.islem_turu === "ODEME") {
      borc = tlAmount;
    } else if (params.islem_turu === "ACILIS_BAKIYESI") {
        borc = tlAmount;
    }

    const { error } = await supabase.rpc("add_cari_hareket", {
      p_company_id: params.company_id,
      p_islem_turu: params.islem_turu,
      p_belge_no: params.belge_no || "",
      p_aciklama: params.aciklama || "",
      p_borc: borc,
      p_alacak: alacak,
      p_tarih: params.tarih,
      p_order_id: (params.order_id && params.order_id !== "none") ? params.order_id : null,
      p_fatura_id: (params.fatura_id && params.fatura_id !== "none") ? params.fatura_id : null,
      p_doviz_turu: doviz_turu,
      p_doviz_kuru: doviz_kuru,
      p_doviz_tutari: doviz_tutari
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

export async function deleteTransactionAction(id: string, company_id: string) {
  try {
    const { error } = await supabase.rpc("delete_cari_hareket", {
      p_id: id,
    });

    if (error) throw error;

    revalidatePath(`/muhasebe/cariler/${company_id}`);
    revalidatePath("/companies");
    revalidatePath("/muhasebe/faturalar");

    return { success: true };
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompanyTransactionsAction(companyId: string) {
  try {
    const { data, error } = await supabase
      .from("cari_hareketler")
      .select(`
        *,
        order:orders(order_no),
        fatura:faturalar(fatura_no)
      `)
      .eq("company_id", companyId)
      .order("tarih", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error("Get transactions error:", error);
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
    console.error("Get company orders error:", error);
    return { success: false, error: error.message };
  }
}

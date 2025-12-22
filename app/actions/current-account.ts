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
}

export async function addTransactionAction(params: AddTransactionParams) {
  try {
    // Determine Borç/Alacak based on type
    // TAHSILAT (Collection) -> Reduces Customer Debt -> Alacak
    // ODEME (Payment) -> We pay to supplier (or refund) -> Borç (if we view it as reducing our debt to them)
    // Actually, let's standardize:
    // Company is usually a Customer in this CRM context?
    // If Customer:
    // - Sale Invoice -> Borç (Debt increases)
    // - Collection -> Alacak (Debt decreases)
    // If Supplier:
    // - Purchase Invoice -> Alacak (Our debt increases)
    // - Payment -> Borç (Our debt decreases)
    
    // For simplicity, we assume "Borç" increases the balance (receivable), "Alacak" decreases it.
    // TAHSILAT -> Alacak
    // ODEME -> Borç (Refund or payment to us? Or payment TO them?)
    // "Tahsilat" = We received money. Customer debt decreases. -> Alacak.
    // "Ödeme" = We paid money. 
    //   If to Supplier: Supplier balance (Credit) decreases. -> Borç.
    //   If to Customer (Refund): Customer debt decreases? No, we pay them, so they owe us less? Or we owe them?
    // Let's assume standard "Cari" logic:
    // Borç = Debit (Money leaving us / They owe us)
    // Alacak = Credit (Money coming to us / We owe them)
    
    // Wait, Standard Accounting:
    // Asset (Cash) increases -> Debit.
    // Customer Account (Asset) increases -> Debit. (Sale)
    // Customer Account decreases -> Credit. (Collection)
    
    // So:
    // TAHSILAT -> Alacak (Credit)
    // ODEME -> Borç (Debit) - assuming we are paying a supplier or refunding.
    // But if we are paying a supplier, the supplier account is a Liability.
    // Liability decreases -> Debit.
    
    // So "Ödeme" (Payment Out) is always DEBIT (Borç) to the Current Account.
    // "Tahsilat" (Collection In) is always CREDIT (Alacak) to the Current Account.
    
    let borc = 0;
    let alacak = 0;

    if (params.islem_turu === "TAHSILAT") {
      alacak = params.tutar;
    } else if (params.islem_turu === "ODEME") {
      borc = params.tutar;
    } else if (params.islem_turu === "ACILIS_BAKIYESI") {
        // Depends on positive/negative, but usually user enters "Borç Bakiyesi" or "Alacak Bakiyesi".
        // For now, let's assume positive input means Debt (Borç).
        // To support both, UI should ask "Borç mu Alacak mı?".
        // For simplicity here, let's say "ACILIS_BAKIYESI" adds to Borç (They owe us).
        // If we want Alacak, we might need a flag.
        // Let's assume the user handles sign in "tutar" or we treat it as Debt.
        // Actually, let's stick to TAHSILAT/ODEME for now.
        borc = params.tutar;
    }

    const { error } = await supabase.rpc("add_cari_hareket", {
      p_company_id: params.company_id,
      p_islem_turu: params.islem_turu,
      p_belge_no: params.belge_no || "",
      p_aciklama: params.aciklama || "",
      p_borc: borc,
      p_alacak: alacak,
      p_tarih: params.tarih
    });

    if (error) throw error;

    revalidatePath(`/muhasebe/cariler/${params.company_id}`);
    revalidatePath("/companies");
    
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
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .order("tarih", { ascending: false }) // Newest first
      .range(from, to);

    if (error) throw error;

    return { success: true, data, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

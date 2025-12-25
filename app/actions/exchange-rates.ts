"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getExchangeRatesHistory(page = 1, pageSize = 20) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("exchange_rates")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return { success: true, data, count };
  } catch (error: any) {
    console.error("Error fetching exchange rates:", error);
    return { success: false, error: error.message };
  }
}

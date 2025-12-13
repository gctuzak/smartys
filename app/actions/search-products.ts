"use server";

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ProductSearchResult {
  id: string;
  name: string;
  code: string | null;
  unit: string | null;
  defaultPrice: number | null;
}

export async function searchProductsAction(query: string): Promise<ProductSearchResult[]> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, code, unit, default_price')
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Product Search Error:", error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      unit: item.unit,
      defaultPrice: item.default_price
    }));

  } catch (err) {
    console.error("Search Action Error:", err);
    return [];
  }
}

"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  defaultPrice: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default("EUR"),
  vatRate: z.coerce.number().min(0).default(20),
});

export type Product = z.infer<typeof productSchema>;

export async function getProductsAction(page = 1, pageSize = 20, search = "", sortField = "created_at", sortOrder = "desc") {
  try {
    let query = supabase
      .from("products")
      .select("*", { count: "exact" });

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`name.ilike.%${search}%,name.ilike.%${sLower}%,name.ilike.%${sUpper}%,code.ilike.%${search}%,code.ilike.%${sLower}%,code.ilike.%${sUpper}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Map frontend fields to DB columns
    let dbSortField = sortField;
    if (sortField === "defaultPrice") dbSortField = "default_price";
    if (sortField === "vatRate") dbSortField = "vat_rate";

    const { data, count, error } = await query
      .order(dbSortField, { ascending: sortOrder === "asc" })
      .range(from, to);

    if (error) throw error;

    const mappedData = data?.map((item: any) => ({
      ...item,
      defaultPrice: item.default_price,
      vatRate: item.vat_rate,
    }));

    return {
      success: true,
      data: mappedData as Product[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Products Error:", error);
    return { success: false, error: "Ürünler getirilemedi." };
  }
}

export async function saveProductAction(data: Product) {
  const result = productSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: "Geçersiz veri formatı" };
  }

  const productData = {
    name: result.data.name,
    code: result.data.code,
    type: result.data.type,
    description: result.data.description,
    unit: result.data.unit,
    cost: result.data.cost,
    default_price: result.data.defaultPrice,
    currency: result.data.currency,
    vat_rate: result.data.vatRate,
  };

  try {
    let error;
    if (data.id) {
      // Update
      const res = await supabase
        .from("products")
        .update(productData)
        .eq("id", data.id);
      error = res.error;
    } else {
      // Insert
      const res = await supabase.from("products").insert(productData);
      error = res.error;
    }

    if (error) throw error;

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Save Product Error:", error);
    return { success: false, error: "Ürün kaydedilemedi." };
  }
}

export async function deleteProductAction(id: string) {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Delete Product Error:", error);
    return { success: false, error: "Ürün silinemedi." };
  }
}

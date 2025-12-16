'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function checkUserDependenciesAction(id: string) {
  try {
    const [companiesResult, personsResult, ordersResult] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("representative_id", id),
      supabase.from("persons").select("id", { count: "exact", head: true }).eq("representative_id", id),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("representative_id", id),
    ]);

    const companyCount = companiesResult.count || 0;
    const personCount = personsResult.count || 0;
    const orderCount = ordersResult.count || 0;

    return {
      success: true,
      hasDependencies: companyCount > 0 || personCount > 0 || orderCount > 0,
      counts: {
        companies: companyCount,
        persons: personCount,
        orders: orderCount,
      },
    };
  } catch (error) {
    console.error("Check Dependencies Error:", error);
    return { success: false, error: "Bağımlılıklar kontrol edilemedi." };
  }
}

export async function transferAndDeleteUserAction(oldUserId: string, newUserId: string) {
  try {
    // Start a transaction-like sequence (Supabase doesn't support multi-table transactions via JS client easily without RPC, 
    // but we can do sequential updates. If one fails, we might have partial state, but it's better than nothing.
    // Ideally we would use a stored procedure, but for now client-side calls are okay for this scale.)

    // Update Companies
    const { error: companyError } = await supabase
      .from("companies")
      .update({ representative_id: newUserId })
      .eq("representative_id", oldUserId);
    
    if (companyError) throw companyError;

    // Update Persons
    const { error: personError } = await supabase
      .from("persons")
      .update({ representative_id: newUserId })
      .eq("representative_id", oldUserId);

    if (personError) throw personError;

    // Update Orders
    const { error: orderError } = await supabase
      .from("orders")
      .update({ representative_id: newUserId })
      .eq("representative_id", oldUserId);

    if (orderError) throw orderError;

    // Finally Delete User
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", oldUserId);

    if (deleteError) throw deleteError;

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Transfer and Delete Error:", error);
    return { success: false, error: "Transfer ve silme işlemi başarısız oldu." };
  }
}

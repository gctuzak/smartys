'use server'

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveCompanyAction(data: any) {
  try {
    const companyData = {
      name: data.name,
      tax_no: data.tax_no,
      tax_office: data.tax_office,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      representative_id: data.representative_id || null,
      contact_info: data.contact_info || {},
    };

    if (data.id) {
      // Update
      const { error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("id", data.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from("companies")
        .insert(companyData);

      if (error) throw error;
    }

    revalidatePath("/companies");
    return { success: true };
  } catch (error) {
    console.error("Save Company Error:", error);
    return { success: false, error: "Şirket kaydedilemedi." };
  }
}

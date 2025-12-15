'use server'

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function savePersonAction(data: any) {
  try {
    const personData = {
      company_id: data.company_id,
      first_name: data.first_name,
      last_name: data.last_name,
      salutation: data.salutation,
      tckn: data.tckn,
      email1: data.email1,
      email2: data.email2,
      phone1: data.phone1,
      phone1_type: data.phone1Type || "cep",
      phone2: data.phone2,
      phone2_type: data.phone2Type,
      phone3: data.phone3,
      phone3_type: data.phone3Type,
      title: data.title,
      address: data.address,
      city: data.city,
      district: data.district,
      country: data.country || "Türkiye",
      post_code: data.post_code,
      notes: data.notes,
      representative_id: data.representative_id || null,
    };

    if (data.id) {
      // Update
      const { error } = await supabase
        .from("persons")
        .update(personData)
        .eq("id", data.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from("persons")
        .insert(personData);

      if (error) throw error;
    }

    revalidatePath("/persons");
    return { success: true };
  } catch (error) {
    console.error("Save Person Error:", error);
    return { success: false, error: "Kişi kaydedilemedi." };
  }
}
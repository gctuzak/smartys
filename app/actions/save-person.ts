'use server'

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function savePersonAction(data: any) {
  try {
    const personData = {
      company_id: data.company_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      title: data.title,
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
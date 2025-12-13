'use server'

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveUserAction(data: any) {
  try {
    const userData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'representative',
    };

    if (data.id) {
      // Update
      const { error } = await supabase
        .from("users")
        .update(userData)
        .eq("id", data.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from("users")
        .insert(userData);

      if (error) throw error;
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("Save User Error:", error);
    // Check for unique constraint violation on email
    if (error.code === '23505') {
        return { success: false, error: "Bu e-posta adresi zaten kullanımda." };
    }
    return { success: false, error: "Kullanıcı kaydedilemedi." };
  }
}

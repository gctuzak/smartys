'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseKey);

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
      const { error } = await adminSupabase
        .from("users")
        .update(userData)
        .eq("id", data.id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await adminSupabase
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

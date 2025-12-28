'use server'

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function checkAndFixAccountAction(clientEmail: string, clientAuthId: string) {
  console.log("checkAndFixAccountAction called", { clientEmail, clientAuthId });
  
  try {
    // 1. Check if public user exists with Auth ID
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", clientAuthId)
      .single();

    if (existingUser) {
      console.log("User already exists with correct ID.");
      return { success: true, message: "Hesap zaten doğru yapılandırılmış." };
    }

    // 2. Check if public user exists with Email (but different ID)
    const { data: oldUser } = await supabase
      .from("users")
      .select("*")
      .ilike("email", clientEmail)
      .single();

    if (!oldUser) {
      console.log("No public user found with this email. Creating new...");
      // Create new user (simple version, assuming name comes from auth or is null)
      // Actually, we should probably return a message saying "Profile created"
      // But for now, let's focus on MIGRATION.
      // If no old user, we can't migrate data.
      return { success: false, message: "Eşleşen eski hesap bulunamadı." };
    }

    const oldId = oldUser.id;
    console.log(`Found old user profile. Migrating from ${oldId} to ${clientAuthId}`);

    // 3. MIGRATION PROCESS
    
    // A. Rename old user email to free up the unique constraint
    const tempEmail = `temp_${Date.now()}_${oldUser.email}`;
    const { error: renameError } = await supabase
      .from("users")
      .update({ email: tempEmail })
      .eq("id", oldId);

    if (renameError) {
      console.error("Error renaming old user:", renameError);
      throw new Error("Eski hesap güncellenemedi.");
    }

    // B. Create new user record with Auth ID
    const { error: createError } = await supabase
      .from("users")
      .insert({
        id: clientAuthId,
        first_name: oldUser.first_name,
        last_name: oldUser.last_name,
        email: clientEmail, // Original email
        phone: oldUser.phone,
        role: oldUser.role,
        created_at: oldUser.created_at
      });

    if (createError) {
      console.error("Error creating new user:", createError);
      // Rollback? (Hard to rollback manually, but let's hope it works)
      throw new Error("Yeni hesap oluşturulamadı.");
    }

    // C. Update References (Foreign Keys)
    const updates = [
      supabase.from("companies").update({ representative_id: clientAuthId }).eq("representative_id", oldId),
      supabase.from("persons").update({ representative_id: clientAuthId }).eq("representative_id", oldId),
      supabase.from("orders").update({ representative_id: clientAuthId }).eq("representative_id", oldId),
      supabase.from("activities").update({ assigned_to: clientAuthId }).eq("assigned_to", oldId),
      // Add other tables if needed
    ];

    await Promise.all(updates);

    // D. Delete Old User
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", oldId);

    if (deleteError) {
      console.error("Error deleting old user:", deleteError);
      // Not critical, but good to know
    }

    console.log("Migration successful.");
    return { success: true, migrated: true, message: "Hesabınız başarıyla onarıldı." };

  } catch (error) {
    console.error("Fix Account Error:", error);
    return { success: false, error: "Hesap onarımı sırasında bir hata oluştu." };
  }
}

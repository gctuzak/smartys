'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// Initialize admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseKey);

export async function savePersonAction(data: any) {
  try {
    const session = await getSession();
    const userId = session?.userId;

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

    let entityId = data.id;
    const fullName = `${data.first_name} ${data.last_name}`;

    if (data.id) {
      // Update
      const { error } = await adminSupabase
        .from("persons")
        .update(personData)
        .eq("id", data.id);

      if (error) throw error;

      await logActivity({
        action: 'Kişi Güncellendi',
        entityType: 'persons',
        entityId: data.id,
        entityName: fullName,
        userId: userId,
        companyId: data.company_id,
        details: personData
      });

    } else {
      // Insert
      const { data: inserted, error } = await adminSupabase
        .from("persons")
        .insert(personData)
        .select()
        .single();

      if (error) throw error;
      entityId = inserted.id;

      await logActivity({
        action: 'Kişi Oluşturuldu',
        entityType: 'persons',
        entityId: entityId,
        entityName: fullName,
        userId: userId,
        companyId: data.company_id,
        details: personData
      });
    }

    revalidatePath("/crm/persons");
    return { success: true, id: entityId };
  } catch (error: any) {
    console.error("Save Person Error:", error);
    return { success: false, error: "Kişi kaydedilemedi." };
  }
}
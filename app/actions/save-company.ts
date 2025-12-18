'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// Initialize admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseKey);

export async function saveCompanyAction(data: any) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    const companyData = {
      name: data.name,
      type: data.type,
      tax_no: data.tax_no,
      tax_office: data.tax_office,
      address: data.address,
      city: data.city,
      district: data.district,
      country: data.country || "Türkiye",
      post_code: data.post_code,
      phone1: data.phone1,
      phone1_type: data.phone1Type || "cep",
      phone2: data.phone2,
      phone2_type: data.phone2Type,
      phone3: data.phone3,
      phone3_type: data.phone3Type,
      email1: data.email1,
      email2: data.email2,
      website: data.website,
      notes: data.notes,
      authorized_person: data.authorized_person,
      representative_id: data.representative_id || null,
      contact_info: data.contact_info || {},
    };

    let entityId = data.id;

    if (data.id) {
      // Update
      const { error } = await adminSupabase
        .from("companies")
        .update(companyData)
        .eq("id", data.id);

      if (error) throw error;
      
      await logActivity({
        action: 'Şirket Güncellendi',
        entityType: 'companies',
        entityId: data.id,
        entityName: data.name,
        userId: userId,
        companyId: data.id,
        details: companyData
      });

    } else {
      // Insert
      const { data: inserted, error } = await adminSupabase
        .from("companies")
        .insert(companyData)
        .select()
        .single();

      if (error) throw error;
      entityId = inserted.id;

      await logActivity({
        action: 'Şirket Oluşturuldu',
        entityType: 'companies',
        entityId: entityId,
        entityName: data.name,
        userId: userId,
        companyId: entityId,
        details: companyData
      });
    }

    revalidatePath("/crm/companies");
    return { success: true, id: entityId };
  } catch (error: any) {
    console.error("Save Company Error:", error);
    return { success: false, error: "Şirket kaydedilemedi." };
  }
}

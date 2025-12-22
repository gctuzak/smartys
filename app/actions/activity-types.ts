"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { 
  createActivityTypeSchema, 
  updateActivityTypeSchema, 
  type CreateActivityTypeInput,
  type UpdateActivityTypeInput 
} from "@/lib/schemas/activity-types";

// Initialize admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseKey);

export async function getActivityTypes() {
  try {
    const { data, error } = await adminSupabase
      .from('activity_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    const mappedData = data.map(item => ({
      id: item.id,
      name: item.name,
      label: item.label,
      color: item.color,
      icon: item.icon,
      isActive: item.is_active,
    }));

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error fetching activity types:", error);
    return { success: false, error: "Aktivite türleri getirilemedi." };
  }
}

export async function createActivityType(data: CreateActivityTypeInput) {
  const result = createActivityTypeSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const { error } = await adminSupabase
      .from('activity_types')
      .insert({
        name: result.data.name,
        label: result.data.label,
        color: result.data.color,
        is_active: result.data.isActive,
      });

    if (error) throw error;
    revalidatePath("/settings/activity-types");
    return { success: true, message: "Aktivite türü oluşturuldu." };
  } catch (error) {
    console.error("Error creating activity type:", error);
    if ((error as any)?.code === '23505') {
      return { success: false, error: "Bu kod adına sahip bir aktivite türü zaten var." };
    }
    return { success: false, error: (error as any)?.message || "Oluşturulurken hata oluştu." };
  }
}

export async function updateActivityType(data: UpdateActivityTypeInput) {
  const result = updateActivityTypeSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const { id, ...updates } = result.data;
    const { error } = await adminSupabase
      .from('activity_types')
      .update({
        name: updates.name,
        label: updates.label,
        color: updates.color,
        is_active: updates.isActive,
      })
      .eq('id', id);

    if (error) throw error;
    revalidatePath("/settings/activity-types");
    return { success: true, message: "Aktivite türü güncellendi." };
  } catch (error) {
    console.error("Error updating activity type:", error);
    if ((error as any)?.code === '23505') {
      return { success: false, error: "Bu kod adına sahip bir aktivite türü zaten var." };
    }
    return { success: false, error: (error as any)?.message || "Güncellenirken hata oluştu." };
  }
}

export async function deleteActivityType(id: string) {
  try {
    const { error } = await adminSupabase
      .from('activity_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath("/settings/activity-types");
    return { success: true, message: "Aktivite türü silindi." };
  } catch (error) {
    console.error("Error deleting activity type:", error);
    return { success: false, error: "Silinirken hata oluştu." };
  }
}

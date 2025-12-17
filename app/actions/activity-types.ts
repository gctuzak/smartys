"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { 
  createActivityTypeSchema, 
  updateActivityTypeSchema, 
  type CreateActivityTypeInput,
  type UpdateActivityTypeInput 
} from "@/lib/schemas/activity-types";

export async function getActivityTypes() {
  try {
    const { data, error } = await supabase
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
    const { error } = await supabase
      .from('activity_types')
      .insert(result.data);

    if (error) throw error;
    revalidatePath("/settings/activity-types");
    return { success: true, message: "Aktivite türü oluşturuldu." };
  } catch (error) {
    console.error("Error creating activity type:", error);
    return { success: false, error: "Oluşturulurken hata oluştu." };
  }
}

export async function updateActivityType(data: UpdateActivityTypeInput) {
  const result = updateActivityTypeSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const { id, ...updates } = result.data;
    const { error } = await supabase
      .from('activity_types')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    revalidatePath("/settings/activity-types");
    return { success: true, message: "Aktivite türü güncellendi." };
  } catch (error) {
    console.error("Error updating activity type:", error);
    return { success: false, error: "Güncellenirken hata oluştu." };
  }
}

export async function deleteActivityType(id: string) {
  try {
    const { error } = await supabase
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

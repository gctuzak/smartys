"use server";

import { activities, users, persons, companies, proposals } from "@/db/schema";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

import { 
  createActivitySchema, 
  updateActivityStatusSchema, 
  type CreateActivityInput 
} from "@/lib/schemas/activities";

// Types
export type Activity = typeof activities.$inferSelect;
export { type CreateActivityInput };

// Server Actions

export async function createActivity(data: CreateActivityInput) {
  const result = createActivitySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
    };
  }

  try {
    const {
      type,
      subject,
      description,
      priority,
      dueDate,
      assignedTo,
      contactId,
      companyId,
      proposalId,
      isRecurring,
      recurrenceRule,
      reminders,
      status,
    } = result.data;

    console.log("Creating activity via Supabase API...");

    const session = await getSession();
    
    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    const { data: inserted, error } = await adminSupabase.from('activities').insert({
      type,
      subject,
      description,
      priority,
      due_date: dueDate,
      assigned_to: assignedTo,
      contact_id: contactId,
      company_id: companyId,
      proposal_id: proposalId,
      is_recurring: isRecurring,
      recurrence_rule: recurrenceRule,
      reminders,
      status: status || "OPEN",
    }).select().single();

    if (error) throw error;

    await logActivity({
      action: 'Görev Oluşturuldu',
      entityType: 'activities',
      entityId: inserted.id,
      entityName: subject,
      userId: session?.userId,
      companyId: companyId,
      details: { type, priority, status }
    });

    revalidatePath("/crm"); // Revalidate broadly or specific paths
    return { success: true, message: "Aktivite başarıyla oluşturuldu." };
  } catch (error) {
    console.error("Error creating activity:", error);
    return { success: false, error: "Aktivite oluşturulurken bir hata oluştu." };
  }

}

export async function updateActivityStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
  const result = updateActivityStatusSchema.safeParse({ id, status });

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
    };
  }

  try {
    console.log("Updating activity status via Supabase API...");

    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await adminSupabase
      .from('activities')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    revalidatePath("/crm");
    return { success: true, message: "Aktivite durumu güncellendi." };
  } catch (error) {
    console.error("Error updating activity status:", error);
    return { success: false, error: "Durum güncellenirken bir hata oluştu." };
  }

}

export async function updateActivity(id: string, data: CreateActivityInput) {
  const result = createActivitySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
    };
  }

  try {
    const {
      type,
      subject,
      description,
      priority,
      dueDate,
      assignedTo,
      contactId,
      companyId,
      proposalId,
      isRecurring,
      recurrenceRule,
      reminders,
      status,
    } = result.data;

    console.log("Updating activity via Supabase API...");

    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await adminSupabase.from('activities').update({
      type,
      subject,
      description,
      priority,
      due_date: dueDate,
      assigned_to: assignedTo,
      contact_id: contactId,
      company_id: companyId,
      proposal_id: proposalId,
      is_recurring: isRecurring,
      recurrence_rule: recurrenceRule,
      reminders,
      status,
    }).eq('id', id);

    if (error) throw error;

    revalidatePath("/crm");
    return { success: true, message: "Aktivite başarıyla güncellendi." };
  } catch (error) {
    console.error("Error updating activity:", error);
    return { success: false, error: "Aktivite güncellenirken bir hata oluştu." };
  }
}

export async function deleteActivity(id: string) {
  try {
    console.log("Deleting activity via Supabase API...");
    
    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await adminSupabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath("/crm");
    return { success: true, message: "Aktivite silindi." };
  } catch (error) {
    console.error("Error deleting activity:", error);
    return { success: false, error: "Aktivite silinirken bir hata oluştu." };
  }
}

export async function getActivityOptions() {
  try {
    console.log("Fetching activity options via Supabase API...");

    // Use Service Role Key to bypass RLS for dropdown options
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    
    console.log("Service Role Key available:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("Using key length:", supabaseKey?.length);

    // Create a local admin client if service role key is available
    const adminSupabase = createClient(supabaseUrl, supabaseKey);
    
    const [usersRes, personsRes, companiesRes, proposalsRes, typesRes] = await Promise.all([
      adminSupabase.from('users').select('id, first_name, last_name'),
      adminSupabase.from('persons').select('id, first_name, last_name, company_id').limit(1000),
      adminSupabase.from('companies').select('id, name').limit(1000),
      adminSupabase.from('proposals').select('id, proposal_no, company_id, person_id').limit(1000),
      adminSupabase.from('activity_types').select('name, label').eq('is_active', true),
    ]);

    if (usersRes.error) {
      console.error("Error fetching users:", usersRes.error);
      throw usersRes.error;
    }
    if (personsRes.error) {
      console.error("Error fetching persons:", personsRes.error);
      throw personsRes.error;
    }
    if (companiesRes.error) {
      console.error("Error fetching companies:", companiesRes.error);
      throw companiesRes.error;
    }
    if (proposalsRes.error) {
      console.error("Error fetching proposals:", proposalsRes.error);
      throw proposalsRes.error;
    }
    // typesRes.error is optional because table might not exist yet during dev
    if (typesRes.error) {
       console.warn("Error fetching activity types (might be missing table):", typesRes.error);
    }

    const usersList = usersRes.data || [];
    const personsList = personsRes.data || [];
    const companiesList = companiesRes.data || [];
    const proposalsList = proposalsRes.data || [];
    const typesList = typesRes.data || [];

    console.log("Activity options fetched via Drizzle:", {
      users: usersList.length,
      persons: personsList.length,
      companies: companiesList.length,
      proposals: proposalsList.length,
      types: typesList.length
    });

    if (usersList.length === 0 && personsList.length === 0 && companiesList.length === 0) {
      throw new Error("Drizzle returned empty data, likely connection issue or RLS masked as empty.");
    }

    return {
      success: true,
      data: {
        users: usersList.map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
        persons: personsList.map((p: any) => ({ value: p.id, label: `${p.first_name} ${p.last_name}`, companyId: p.company_id })),
        companies: companiesList.map((c: any) => ({ value: c.id, label: c.name })),
        proposals: proposalsList.map((p: any) => ({ value: p.id, label: `Teklif #${p.proposal_no}`, companyId: p.company_id, contactId: p.person_id })),
        types: typesList.length > 0 ? typesList.map((t: any) => ({ value: t.name.toUpperCase(), label: t.label })) : [
            { value: "TASK", label: "Görev (Task)" },
            { value: "CALL", label: "Arama (Call)" },
            { value: "MEETING", label: "Toplantı (Meeting)" },
            { value: "EMAIL", label: "E-posta (Email)" },
            { value: "NOTE", label: "Not (Note)" }
        ],
      },
    };
    } catch (supabaseError) {
      console.error("Error fetching activity options (both Drizzle and Supabase failed):", supabaseError);
      return { success: false, error: "Seçenekler getirilirken bir hata oluştu." };
    }
}


export async function getActivities(filters?: {
  contactId?: string;
  companyId?: string;
  proposalId?: string;
  sortField?: string;
  sortOrder?: string;
}) {
  try {
    console.log("Fetching activities via Supabase API...");
    
    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    let query = adminSupabase
      .from('activities')
      .select(`
        *,
        users(*),
        persons(*),
        companies(*),
        proposals(*)
      `);

    // Apply sorting
    if (filters?.sortField) {
        query = query.order(filters.sortField, { ascending: filters.sortOrder === 'asc' });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    if (filters) {
      if (filters.contactId) query = query.eq('contact_id', filters.contactId);
      if (filters.companyId) query = query.eq('company_id', filters.companyId);
      if (filters.proposalId) query = query.eq('proposal_id', filters.proposalId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const mappedData = data.map((item: any) => ({
      ...item,
      id: item.id,
      type: item.type,
      subject: item.subject,
      description: item.description,
      status: item.status,
      priority: item.priority,
      dueDate: item.due_date ? new Date(item.due_date) : null,
      assignedTo: item.assigned_to,
      contactId: item.contact_id,
      companyId: item.company_id,
      proposalId: item.proposal_id,
      isRecurring: item.is_recurring,
      recurrenceRule: item.recurrence_rule,
      reminders: item.reminders,
      createdAt: new Date(item.created_at),
      // Relations
      assignedToUser: item.users ? {
        ...item.users,
        firstName: item.users.first_name,
        lastName: item.users.last_name,
      } : null,
      contact: item.persons,
      company: item.companies,
      proposal: item.proposals,
    }));

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error fetching activities:", error);
    return { success: false, error: "Aktiviteler getirilirken bir hata oluştu." };
  }
}


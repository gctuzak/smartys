"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getProposalsAction(page = 1, pageSize = 20, search = "") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("proposals")
      .select(`
        *,
        company:companies!proposals_company_id_companies_id_fk (
          name,
          contact_info,
          tax_no,
          tax_office,
          address,
          phone,
          email,
          website
        ),
        person:persons (
          first_name,
          last_name,
          email,
          phone,
          title
        )
      `, { count: "exact" });

    if (search) {
      if (!isNaN(Number(search))) {
        // If search is a number, try to match proposal_no
        query = query.or(`proposal_no.eq.${search},status.ilike.%${search}%`);
      } else {
        query = query.ilike("status", `%${search}%`);
      }
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Proposals Error:", error);
    return { success: false, error: "Teklifler getirilemedi." };
  }
}

export async function getCompaniesAction(page = 1, pageSize = 20, search = "") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Companies Error:", error);
    return { success: false, error: "Şirketler getirilemedi." };
  }
}

export async function getPersonsAction(companyId?: string, page = 1, pageSize = 20, search = "") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("persons")
      .select(`
        *,
        company:companies (name)
      `, { count: "exact" });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Persons Error:", error);
    return { success: false, error: "Kişiler getirilemedi." };
  }
}

export async function getProposalDetailsAction(id: string) {
  try {
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        company:companies!proposals_company_id_companies_id_fk (
          id,
          name,
          contact_info,
          tax_no,
          tax_office,
          address,
          phone,
          email,
          website
        ),
        person:persons (
          id,
          first_name,
          last_name,
          email,
          phone,
          title
        ),
        items:proposal_items (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Get Proposal Details Error:", error);
    return { success: false, error: "Teklif detayları getirilemedi." };
  }
}

export async function deleteProposalAction(id: string) {
    try {
        // First delete items
        const { error: itemsError } = await supabase
            .from("proposal_items")
            .delete()
            .eq("proposal_id", id);
        
        if (itemsError) throw itemsError;

        // Then delete proposal
        const { error } = await supabase
            .from("proposals")
            .delete()
            .eq("id", id);
        
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Delete Proposal Error:", error);
        return { success: false, error: "Teklif silinemedi." };
    }
}

export async function deleteCompanyAction(id: string) {
    try {
        // Check if company has proposals
        const { count, error: checkError } = await supabase
            .from("proposals")
            .select("id", { count: "exact", head: true })
            .eq("company_id", id);
        
        if (checkError) throw checkError;

        if (count && count > 0) {
            return { success: false, error: "Bu şirkete ait teklifler var. Önce teklifleri silmelisiniz." };
        }

        // Check if company has persons
        const { count: personsCount, error: personsCheckError } = await supabase
            .from("persons")
            .select("id", { count: "exact", head: true })
            .eq("company_id", id);

        if (personsCheckError) throw personsCheckError;

        if (personsCount && personsCount > 0) {
            return { success: false, error: "Bu şirkete bağlı kişiler var. Önce kişileri silmelisiniz." };
        }

        const { error } = await supabase
            .from("companies")
            .delete()
            .eq("id", id);
        
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Delete Company Error:", error);
        return { success: false, error: "Şirket silinemedi." };
    }
}

export async function deletePersonAction(id: string) {
    try {
        // Check if person has proposals
        const { count, error: checkError } = await supabase
            .from("proposals")
            .select("id", { count: "exact", head: true })
            .eq("person_id", id);
        
        if (checkError) throw checkError;

        if (count && count > 0) {
            return { success: false, error: "Bu kişiye ait teklifler var. Önce teklifleri silmelisiniz." };
        }

        const { error } = await supabase
            .from("persons")
            .delete()
            .eq("id", id);
        
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Delete Person Error:", error);
        return { success: false, error: "Kişi silinemedi." };
    }
}

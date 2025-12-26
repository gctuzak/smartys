"use server";

import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase URL present:", !!process.env.SUPABASE_URL);
console.log("Supabase Key present:", !!process.env.SUPABASE_ANON_KEY);

export async function getProposalsAction(
  page = 1, 
  pageSize = 20, 
  search = "", 
  sortField = "proposal_no", 
  sortOrder = "desc",
  filters?: {
    status?: string[],
    dateRange?: { from?: string, to?: string },
    paymentStatus?: string[]
  }
) {
  console.log("getProposalsAction called", { page, pageSize, search, sortField, sortOrder, filters });
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("proposals")
      .select(`
        *,
        company:companies (
          name,
          contact_info,
          tax_no,
          tax_office,
          address,
          phone1,
          email1,
          website
        ),
        person:persons (
          first_name,
          last_name,
          email1,
          phone1,
          title
        )
      `, { count: "exact" });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }

    if (filters?.paymentStatus && filters.paymentStatus.length > 0) {
      query = query.in("payment_terms", filters.paymentStatus);
    }

    if (filters?.dateRange?.from) {
      query = query.gte("proposal_date", filters.dateRange.from);
    }

    if (filters?.dateRange?.to) {
      let toDate = filters.dateRange.to;
      // If it looks like YYYY-MM-DD (length 10), append end of day time
      if (toDate.length === 10) {
        toDate += " 23:59:59";
      }
      query = query.lte("proposal_date", toDate);
    }

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      
      let companyIds: string[] = [];
      let personIds: string[] = [];

      // 1. Find matching companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .or(`name.ilike.%${search}%,name.ilike.%${sLower}%,name.ilike.%${sUpper}%`)
        .limit(50);
        
      if (companies) companyIds = companies.map(c => c.id);

      // 2. Find matching persons
      const { data: persons } = await supabase
        .from('persons')
        .select('id')
        .or(`first_name.ilike.%${search}%,first_name.ilike.%${sLower}%,first_name.ilike.%${sUpper}%,last_name.ilike.%${search}%,last_name.ilike.%${sLower}%,last_name.ilike.%${sUpper}%`)
        .limit(50);
        
      if (persons) personIds = persons.map(p => p.id);

      let orString = `status.ilike.%${search}%,status.ilike.%${sLower}%,status.ilike.%${sUpper}%`;

      if (!isNaN(Number(search))) {
        orString += `,proposal_no.eq.${search}`;
      }

      if (companyIds.length > 0) {
        orString += `,company_id.in.(${companyIds.join(',')})`;
      }

      if (personIds.length > 0) {
        orString += `,person_id.in.(${personIds.join(',')})`;
      }
      
      query = query.or(orString);
    }

    // Apply sorting
    const isAsc = sortOrder === "asc";
    
    // Default sorting logic if no specific sort provided (though default is proposal_no desc)
    if (sortField) {
        query = query.order(sortField, { ascending: isAsc });
    } else {
        query = query
        .order("proposal_no", { ascending: false });
    }

    // Always secondary sort by ID to ensure stable pagination
    query = query.order("id", { ascending: false });

    const { data, count, error } = await query
      .range(from, to);

    if (error) throw error;

    console.log("getProposalsAction success", { count });

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

export async function getCompaniesAction(page = 1, pageSize = 20, search = "", sortField = "created_at", sortOrder = "desc") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("companies")
      .select("*, representative:users(first_name, last_name)", { count: "exact" });

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`name.ilike.%${search}%,name.ilike.%${sLower}%,name.ilike.%${sUpper}%`);
    }

    // Apply sorting
    const isAsc = sortOrder === "asc";
    
    if (sortField) {
        query = query.order(sortField, { ascending: isAsc });
    } else {
        query = query
            .order("created_at", { ascending: false })
            .order("name", { ascending: true });
    }

    const { data, count, error } = await query
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

export async function getCompanyAction(id: string) {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Get Company Error:", error);
    return { success: false, error: "Şirket getirilemedi." };
  }
}

export async function getPersonsAction(companyId?: string, page = 1, pageSize = 20, search = "", sortField = "first_name", sortOrder = "asc") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("persons")
      .select(`
        *,
        company:companies (name),
        representative:users (first_name, last_name)
      `, { count: "exact" });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`first_name.ilike.%${search}%,first_name.ilike.%${sLower}%,first_name.ilike.%${sUpper}%,last_name.ilike.%${search}%,last_name.ilike.%${sLower}%,last_name.ilike.%${sUpper}%`);
    }

    // Apply sorting
    const isAsc = sortOrder === "asc";
    
    if (sortField) {
        query = query.order(sortField, { ascending: isAsc });
    } else {
        query = query
            .order("created_at", { ascending: false })
            .order("first_name", { ascending: true });
    }

    const { data, count, error } = await query
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
        company:companies (
          id,
          name,
          contact_info,
          tax_no,
          tax_office,
          address,
          phone1,
          email1,
          website
        ),
        person:persons (
          id,
          first_name,
          last_name,
          email1,
          phone1,
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

export async function getRepresentativesAction(page = 1, pageSize = 20, search = "") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("users")
      .select("id, first_name, last_name", { count: "exact" })
      .eq("role", "representative");

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`first_name.ilike.%${search}%,first_name.ilike.%${sLower}%,first_name.ilike.%${sUpper}%,last_name.ilike.%${search}%,last_name.ilike.%${sLower}%,last_name.ilike.%${sUpper}%`);
    }

    const { data, count, error } = await query
      .order("first_name", { ascending: true })
      .range(from, to);

    if (error) throw error;

    return { 
      success: true, 
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Representatives Error:", error);
    return { success: false, error: "Temsilciler getirilemedi." };
  }
}

export async function getUserAction(id: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Get User Error:", error);
    return { success: false, error: "Kullanıcı getirilemedi." };
  }
}

export async function deleteProposalAction(id: string) {
    try {
        // First delete associated documents
        const { data: documents, error: docsFetchError } = await supabase
            .from("documents")
            .select("storage_path")
            .eq("proposal_id", id);
        
        if (docsFetchError) throw docsFetchError;

        if (documents && documents.length > 0) {
            // Delete files from filesystem
            await Promise.all(documents.map(async (doc) => {
                try {
                    if (doc.storage_path) {
                        await fs.unlink(doc.storage_path);
                    }
                } catch (err) {
                    console.error(`Failed to delete file at ${doc.storage_path}:`, err);
                    // Continue even if file deletion fails
                }
            }));

            // Delete document records
            const { error: docsDeleteError } = await supabase
                .from("documents")
                .delete()
                .eq("proposal_id", id);
            
            if (docsDeleteError) throw docsDeleteError;
        }

        // Then delete items
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

export async function getUsersAction(page = 1, pageSize = 20, search = "", sortField = "created_at", sortOrder = "desc") {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("users")
      .select("*", { count: "exact" });

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`first_name.ilike.%${search}%,first_name.ilike.%${sLower}%,first_name.ilike.%${sUpper}%,last_name.ilike.%${search}%,last_name.ilike.%${sLower}%,last_name.ilike.%${sUpper}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    const isAsc = sortOrder === "asc";
    
    if (sortField) {
        query = query.order(sortField, { ascending: isAsc });
    } else {
        query = query
          .order("created_at", { ascending: false })
          .order("first_name", { ascending: true });
    }

    const { data, count, error } = await query
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Users Error:", error);
    return { success: false, error: "Kullanıcılar getirilemedi." };
  }
}

export async function deleteUserAction(id: string) {
    try {
        // Check if user is representative for any company
        const { count: companyCount, error: companyCheckError } = await supabase
            .from("companies")
            .select("id", { count: "exact", head: true })
            .eq("representative_id", id);
        
        if (companyCheckError) throw companyCheckError;

        if (companyCount && companyCount > 0) {
            return { success: false, error: "Bu kullanıcıya bağlı şirketler var. Önce şirketlerdeki temsilci atamasını kaldırmalısınız." };
        }

        // Check if user is representative for any person
        const { count: personCount, error: personCheckError } = await supabase
            .from("persons")
            .select("id", { count: "exact", head: true })
            .eq("representative_id", id);
        
        if (personCheckError) throw personCheckError;

        if (personCount && personCount > 0) {
            return { success: false, error: "Bu kullanıcıya bağlı kişiler var. Önce kişilerdeki temsilci atamasını kaldırmalısınız." };
        }

        // Check if user has orders
        const { count: orderCount, error: orderCheckError } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("representative_id", id);
        
        if (orderCheckError) throw orderCheckError;

        if (orderCount && orderCount > 0) {
            return { success: false, error: "Bu kullanıcıya ait siparişler var. Kullanıcı silinemez." };
        }

        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", id);
        
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Delete User Error:", error);
        return { success: false, error: "Kullanıcı silinemedi." };
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

export async function getOrdersAction(
  page = 1, 
  pageSize = 20, 
  search = "", 
  sortField = "order_no", 
  sortOrder = "desc",
  filters?: {
    status?: string[],
    dateRange?: { from?: string, to?: string }
  }
) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("orders")
      .select(`
        *,
        company:companies (name),
        person:persons (first_name, last_name),
        representative:users (first_name, last_name)
      `, { count: "exact" });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }

    if (filters?.dateRange?.from) {
      query = query.gte("order_date", filters.dateRange.from);
    }

    if (filters?.dateRange?.to) {
      let toDate = filters.dateRange.to;
      if (toDate.length === 10) {
        toDate += " 23:59:59";
      }
      query = query.lte("order_date", toDate);
    }

    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      query = query.or(`order_no.ilike.%${search}%,status.ilike.%${sLower}%,status.ilike.%${sUpper}%`);
    }

    // Apply sorting
    const isAsc = sortOrder === "asc";
    
    if (sortField === "order_no") {
      // Use created_at for order_no sorting to handle string comparison ("999" > "1000")
      // assuming orders are created sequentially
      query = query.order("created_at", { ascending: isAsc });
    } else if (sortField) {
        query = query.order(sortField, { ascending: isAsc });
    } else {
        query = query.order("created_at", { ascending: false });
    }
    
    // Always secondary sort by ID
    query = query.order("id", { ascending: false });

    const { data, count, error } = await query
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      data: data as any[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Get Orders Error:", error);
    return { success: false, error: "Siparişler getirilemedi." };
  }
}

export async function deleteOrderAction(id: string) {
    try {
        const { error } = await supabase
            .from("orders")
            .delete()
            .eq("id", id);
        
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("Delete Order Error:", error);
        return { success: false, error: "Sipariş silinemedi." };
    }
}

export async function getOrderDetailsAction(id: string) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        company:companies (
          id,
          name,
          contact_info,
          tax_no,
          tax_office,
          address,
          phone1,
          email1,
          website
        ),
        person:persons (
          id,
          first_name,
          last_name,
          email1,
          phone1,
          title
        ),
        representative:users (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        proposal:proposals (
            id,
            proposal_no,
            grand_total,
            currency
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Get Order Details Error:", error);
    return { success: false, error: "Sipariş detayları getirilemedi." };
  }
}

export async function getProposalRevisionsAction(proposalId: string) {
  try {
    // First get the proposal to find its root
    const { data: proposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id, root_proposal_id, proposal_no, revision")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) throw new Error("Teklif bulunamadı");

    const rootId = proposal.root_proposal_id || proposal.id;

    // Fetch all proposals with this root (including the root itself)
    const { data, error } = await supabase
      .from("proposals")
      .select("id, proposal_no, revision, created_at, status")
      .or(`id.eq.${rootId},root_proposal_id.eq.${rootId}`)
      .order("revision", { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Get Proposal Revisions Error:", error);
    return { success: false, error: "Revizyon geçmişi getirilemedi." };
  }
}

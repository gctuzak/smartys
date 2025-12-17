"use server";

import { createClient } from "@supabase/supabase-js";
import { saveFileToPublicDocuments } from "@/lib/storage";
import fs from "fs/promises";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadDocumentAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "other";
  const proposalId = (formData.get("proposalId") as string) || null;
  const companyId = (formData.get("companyId") as string) || null;
  const personId = (formData.get("personId") as string) || null;
  const orderId = (formData.get("orderId") as string) || null;
  const ownerEmail = (formData.get("ownerEmail") as string) || null;
  
  if (!file) {
    return { success: false, error: "Dosya bulunamadı." };
  }
  
  try {
    const saved = await saveFileToPublicDocuments({
      file,
      type,
      proposalId,
      companyId,
      personId,
      orderId,
    });
    
    const { data, error } = await supabase
      .from("documents")
      .insert({
        proposal_id: proposalId,
        company_id: companyId,
        person_id: personId,
        order_id: orderId,
        owner_email: ownerEmail,
        type,
        storage_path: saved.storagePath,
        public_url: saved.publicUrl,
        original_name: saved.originalName,
        mime_type: saved.mimeType,
        size: saved.size,
      })
      .select("id")
      .single();
      
    if (error) {
      // If DB insert fails, maybe clean up the file?
      // For now, just return error.
      return { success: false, error: error.message };
    }
    
    return { success: true, id: data?.id, publicUrl: saved.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Dosya kaydedilemedi." };
  }
}

export async function listDocumentsAction(filters: {
  proposalId?: string | null;
  companyId?: string | null;
  personId?: string | null;
  orderId?: string | null;
  ownerEmail?: string | null;
  includeRelated?: boolean; // If true, fetches all files related to the entity (e.g. for a company, fetch its proposals' files too)
}) {
  try {
    let query = supabase.from("documents").select("*").order("created_at", { ascending: false });

    if (filters.includeRelated) {
        // "Tüm Dosyalar" görünümü için filtreleme
        // company_id veya person_id'ye göre tüm ilişkili belgeleri getirir.
        // Upload sırasında company_id ve person_id denormalize edildiği için doğrudan sorgulama yeterlidir.
        
        if (filters.companyId) {
             query = query.eq("company_id", filters.companyId);
        } else if (filters.personId) {
             query = query.eq("person_id", filters.personId);
        } else {
             // Ana varlık ID'si yoksa normal filtrelemeye dön
             if (filters.proposalId) query = query.eq("proposal_id", filters.proposalId);
             if (filters.orderId) query = query.eq("order_id", filters.orderId);
        }

    } else {
        // Strict filtering (specific tab view)
        if (filters.proposalId) query = query.eq("proposal_id", filters.proposalId);
        if (filters.companyId) query = query.eq("company_id", filters.companyId);
        if (filters.personId) query = query.eq("person_id", filters.personId);
        if (filters.orderId) query = query.eq("order_id", filters.orderId);
        if (filters.ownerEmail) query = query.eq("owner_email", filters.ownerEmail);
    }
    
    const { data, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDocumentAction(id: string) {
  // First get the file path
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
    
  if (fetchError) {
    return { success: false, error: fetchError.message };
  }
  
  // Delete from DB
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Delete from filesystem
  if (doc?.storage_path) {
    try {
      await fs.unlink(doc.storage_path);
    } catch (err) {
      console.error("File deletion failed (might be already gone):", err);
    }
  }
  
  return { success: true };
}

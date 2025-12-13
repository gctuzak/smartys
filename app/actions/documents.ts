"use server";

import { createClient } from "@supabase/supabase-js";
import { saveFileToPublicDocuments } from "@/lib/storage";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadDocumentAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "other";
  const proposalId = (formData.get("proposalId") as string) || null;
  const companyId = (formData.get("companyId") as string) || null;
  const personId = (formData.get("personId") as string) || null;
  const ownerEmail = (formData.get("ownerEmail") as string) || null;
  if (!file) {
    return { success: false, error: "Dosya bulunamadı." };
  }
  const saved = await saveFileToPublicDocuments({
    file,
    type,
    proposalId,
    companyId,
    personId,
  });
  const { data, error } = await supabase
    .from("documents")
    .insert({
      proposal_id: proposalId,
      company_id: companyId,
      person_id: personId,
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
    return { success: false, error: error.message };
  }
  return { success: true, id: data?.id, publicUrl: saved.publicUrl };
}

export async function listDocumentsAction(filters: {
  proposalId?: string | null;
  companyId?: string | null;
  personId?: string | null;
  ownerEmail?: string | null;
}) {
  let query = supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (filters.proposalId) query = query.eq("proposal_id", filters.proposalId);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.personId) query = query.eq("person_id", filters.personId);
  if (filters.ownerEmail) query = query.eq("owner_email", filters.ownerEmail);
  const { data, error } = await query;
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: data || [] };
}

export async function deleteDocumentAction(id: string) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

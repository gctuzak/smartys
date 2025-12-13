import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { saveFileToPublicDocuments } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "other";
    const proposalId = (formData.get("proposalId") as string) || null;
    const companyId = (formData.get("companyId") as string) || null;
    const personId = (formData.get("personId") as string) || null;
    const ownerEmail = (formData.get("ownerEmail") as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya bulunamadı." }, { status: 400 });
    }

    const saved = await saveFileToPublicDocuments({ file, type, proposalId, companyId, personId });

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id, publicUrl: saved.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Yükleme hatası" }, { status: 500 });
  }
}

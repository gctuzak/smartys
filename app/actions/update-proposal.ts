"use server";

import { createClient } from '@supabase/supabase-js';
import { ParsedData } from "@/types";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { revalidatePath } from "next/cache";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function updateProposalAction(proposalId: string, data: ParsedData) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    // Basic validation
    if (!data.company.name && !data.person?.name) {
       throw new Error("Şirket adı veya Kişi adı belirtilmelidir.");
    }

    // 1. Update Company Information (if changed)
    let companyId = null;
    if (data.company.name) {
        // Mevcut şirketi bulmak veya oluşturmak yerine, mevcut teklifin şirket ID'sini koruyabiliriz
        // Ancak kullanıcı şirket ismini değiştirmiş olabilir.
        // Basitlik adına, şimdilik sadece teklif üzerindeki verileri güncelleyelim.
        // Eğer şirket ismi değiştiyse yeni bir şirket oluşturma/eşleştirme mantığı `saveProposalAction` ile aynı olmalı.
        // Şimdilik sadece mevcut teklifin bağlı olduğu şirketi güncellemek yerine, teklif verilerini güncelleyelim.
        
        // Teklifin mevcut şirket ID'sini al
        const { data: currentProposal } = await supabase
            .from('proposals')
            .select('company_id')
            .eq('id', proposalId)
            .single();
            
        companyId = currentProposal?.company_id;
        
        // TODO: Şirket bilgilerini güncelleme eklenebilir
    }

    // 2. Update Proposal Main Info
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        total_amount: data.proposal.totalAmount,
        vat_rate: data.proposal.vatRate ?? 20,
        vat_amount: data.proposal.vatAmount,
        grand_total: data.proposal.grandTotal,
        currency: data.proposal.currency,
        legacy_proposal_no: data.proposal.legacyProposalNo,
        notes: data.proposal.notes,
        payment_terms: data.proposal.paymentTerms,
        proposal_date: data.proposal.proposalDate,
        // updated_at: new Date().toISOString(), // Column not yet in DB
      })
      .eq('id', proposalId);

    if (updateError) throw updateError;

    // 3. Update Items (Delete all and re-insert)
    // Transaction mantığı olmadığı için önce silip sonra eklemek riskli olabilir ama Supabase'de transaction desteği RPC ile var.
    // Basitlik için delete-insert yapalım.
    
    // Delete existing items
    const { error: deleteError } = await supabase
      .from('proposal_items')
      .delete()
      .eq('proposal_id', proposalId);
      
    if (deleteError) throw deleteError;

    // Insert new items
    if (data.proposal.items && data.proposal.items.length > 0) {
      const itemsToInsert = data.proposal.items.map((item, index) => ({
        proposal_id: proposalId,
        description: item.description,
        quantity: item.quantity ?? null,
        unit: item.unit,
        unit_price: item.unitPrice ?? null,
        total_price: item.totalPrice ?? null,
        attributes: item.attributes,
        width: item.width ?? null,
        length: item.length ?? null,
        piece_count: item.pieceCount ?? null,
        kelvin: item.kelvin ?? null,
        watt: item.watt ?? null,
        lumen: item.lumen ?? null,
        is_header: item.isHeader ?? false,
        order: index
      }));

      const { error: itemsError } = await supabase
        .from('proposal_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await logActivity({
      action: 'Teklif Güncellendi',
      entityType: 'proposals',
      entityId: proposalId,
      entityName: data.proposal.legacyProposalNo || `Teklif`,
      userId: userId,
      companyId: companyId || undefined,
      details: data.proposal
    });
    
    revalidatePath('/proposals');
    revalidatePath(`/proposals/${proposalId}`);

    return { success: true, proposalId };

  } catch (error: any) {
    console.error("Update Proposal Error:", error);
    return { success: false, error: error.message };
  }
}

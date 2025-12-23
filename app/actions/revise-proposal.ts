"use server";

import { createClient } from '@supabase/supabase-js';
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function reviseProposalAction(sourceProposalId: string) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    // 1. Fetch source proposal
    const { data: sourceProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', sourceProposalId)
      .single();

    if (fetchError || !sourceProposal) throw new Error("Teklif bulunamadı");

    // 2. Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', sourceProposalId);

    if (itemsError) throw itemsError;

    // 3. Determine revision info
    // If source is already a revision, use its root. Else source IS the root.
    const rootId = sourceProposal.root_proposal_id || sourceProposal.id;
    
    // Find the max revision for this root to determine next revision number
    // We check both the root itself (revision 0 usually) and its children
    const { data: revisions, error: revError } = await supabase
      .from('proposals')
      .select('revision')
      .or(`id.eq.${rootId},root_proposal_id.eq.${rootId}`)
      .order('revision', { ascending: false })
      .limit(1);

    let nextRevision = 1;
    if (revisions && revisions.length > 0) {
        nextRevision = (revisions[0].revision || 0) + 1;
    }

    // 4. Create new proposal
    const { data: newProposal, error: createError } = await supabase
      .from('proposals')
      .insert({
        company_id: sourceProposal.company_id,
        person_id: sourceProposal.person_id,
        status: 'draft', // Reset status for revision
        total_amount: sourceProposal.total_amount,
        vat_rate: sourceProposal.vat_rate,
        vat_amount: sourceProposal.vat_amount,
        grand_total: sourceProposal.grand_total,
        currency: sourceProposal.currency,
        legacy_proposal_no: sourceProposal.legacy_proposal_no,
        notes: sourceProposal.notes,
        payment_terms: sourceProposal.payment_terms,
        proposal_date: new Date().toISOString(), // New date
        root_proposal_id: rootId,
        revision: nextRevision,
        ai_confidence: sourceProposal.ai_confidence
      })
      .select('id, proposal_no')
      .single();

    if (createError) throw createError;

    // 5. Copy items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        proposal_id: newProposal.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        attributes: item.attributes,
        width: item.width,
        length: item.length,
        piece_count: item.piece_count,
        kelvin: item.kelvin,
        watt: item.watt,
        lumen: item.lumen,
        is_header: item.is_header,
        order: item.order
      }));

      const { error: copyItemsError } = await supabase
        .from('proposal_items')
        .insert(itemsToInsert);
      
      if (copyItemsError) throw copyItemsError;
    }

    // Log activity
    await logActivity({
      action: 'Teklif Revize Edildi',
      entityType: 'proposals',
      entityId: newProposal.id,
      entityName: `Revizyon ${nextRevision}`,
      userId: userId,
      companyId: sourceProposal.company_id || undefined,
      details: {
        sourceProposalId: sourceProposalId,
        revision: nextRevision
      }
    });

    return { success: true, data: newProposal };

  } catch (error: any) {
    console.error("Revise Proposal Error:", error);
    return { success: false, error: error.message };
  }
}

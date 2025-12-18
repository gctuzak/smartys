"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function updateProposalStatusAction(id: string, status: string) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    // Get proposal details for logging
    const { data: proposal } = await supabase
      .from('proposals')
      .select('company_id, legacy_proposal_no')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    await logActivity({
      action: 'Teklif Durumu Güncellendi',
      entityType: 'proposals',
      entityId: id,
      entityName: proposal?.legacy_proposal_no || 'Teklif',
      userId: userId,
      companyId: proposal?.company_id,
      details: { status }
    });

    revalidatePath('/proposals');
    return { success: true };
  } catch (error) {
    console.error('Update Proposal Status Error:', error);
    return { success: false, error: 'Durum güncellenemedi.' };
  }
}

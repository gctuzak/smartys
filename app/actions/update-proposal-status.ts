"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function updateProposalStatusAction(id: string, status: string) {
  try {
    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/proposals');
    return { success: true };
  } catch (error) {
    console.error('Update Proposal Status Error:', error);
    return { success: false, error: 'Durum güncellenemedi.' };
  }
}

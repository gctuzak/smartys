"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
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

    if (status === 'converted_to_order') {
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('proposal_id', id)
        .single();

      if (!existingOrder) {
        // Fetch full proposal details
        const { data: fullProposal } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();

        if (fullProposal) {
          // Get company representative
          let representativeId = userId;
          if (fullProposal.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('representative_id')
              .eq('id', fullProposal.company_id)
              .single();
            if (company?.representative_id) {
              representativeId = company.representative_id;
            }
          }

          // Generate new Order No
          const { data: orders } = await supabase
            .from('orders')
            .select('order_no');

          let maxOrderNo = 0;
          if (orders) {
            orders.forEach(o => {
              const num = parseInt(o.order_no);
              if (!isNaN(num) && num > maxOrderNo) {
                maxOrderNo = num;
              }
            });
          }

          const nextOrderNo = (maxOrderNo > 0 ? maxOrderNo + 1 : 1000).toString();

          // Create Order
          const { data: newOrder, error: createOrderError } = await supabase
            .from('orders')
            .insert({
              order_no: nextOrderNo,
              proposal_id: id,
              company_id: fullProposal.company_id,
              person_id: fullProposal.person_id,
              representative_id: representativeId,
              amount: fullProposal.grand_total,
              currency: fullProposal.currency,
              notes: fullProposal.notes,
              status: 'pending',
              order_date: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (createOrderError) {
            console.error("Error creating order:", createOrderError);
          } else if (newOrder) {
            await logActivity({
              action: 'Sipariş Oluşturuldu',
              entityType: 'orders',
              entityId: newOrder.id,
              entityName: `Sipariş #${nextOrderNo}`,
              userId: userId,
              companyId: fullProposal.company_id,
              details: { proposalId: id, orderNo: nextOrderNo }
            });
          }
        }
      }
    }

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

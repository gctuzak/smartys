'use server';

import { createClient } from "@supabase/supabase-js";

export async function getPastJobsAction(type: 'company' | 'person', id: string) {
  console.log(`[getPastJobsAction] Starting fetch for ${type} with ID: ${id}`);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    return { success: false, error: "Sunucu yapılandırma hatası" };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const filterColumn = type === 'company' ? 'company_id' : 'person_id';

    // Fetch orders
    console.log(`[getPastJobsAction] Fetching orders using Supabase client...`);
    const { data: fetchedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq(filterColumn, id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      throw ordersError;
    }
    console.log(`[getPastJobsAction] Fetched orders: ${fetchedOrders?.length}`);

    // Fetch proposals
    console.log(`[getPastJobsAction] Fetching proposals using Supabase client...`);
    const { data: fetchedProposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('*')
      .eq(filterColumn, id)
      .order('created_at', { ascending: false });

    if (proposalsError) {
      console.error("Error fetching proposals:", proposalsError);
      throw proposalsError;
    }
    console.log(`[getPastJobsAction] Fetched proposals: ${fetchedProposals?.length}`);

    // Normalize and combine
    const sanitizeCurrency = (c: any) => {
      if (typeof c !== 'string') return 'TRY';
      const clean = c.trim().toUpperCase();
      return /^[A-Z]{3}$/.test(clean) ? clean : 'TRY';
    };

    const combinedJobs = [
      ...(fetchedOrders || []).map(order => ({
        id: order.id,
        type: 'order' as const,
        date: order.order_date || order.created_at,
        amount: order.amount,
        currency: sanitizeCurrency(order.currency),
        status: order.status,
        reference: order.order_no,
        notes: order.notes,
        createdAt: order.created_at,
      })),
      ...(fetchedProposals || []).map(proposal => ({
        id: proposal.id,
        type: 'proposal' as const,
        date: proposal.proposal_date || proposal.created_at,
        amount: proposal.grand_total,
        currency: sanitizeCurrency(proposal.currency),
        status: proposal.status,
        reference: proposal.proposal_no,
        notes: proposal.notes,
        createdAt: proposal.created_at,
      }))
    ];

    // Sort by date (newest first)
    combinedJobs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return { success: true, data: combinedJobs };
  } catch (error) {
    console.error("Error fetching past jobs:", error);
    return { success: false, error: "Geçmiş işler getirilemedi." };
  }
}

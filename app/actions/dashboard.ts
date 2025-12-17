'use server'

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { startOfMonth, subMonths, format } from "date-fns";
import { tr } from "date-fns/locale";

export interface DashboardStats {
  user: {
    totalProposals: number;
    totalOrders: number;
    totalOrderAmount: number;
    pendingTasks: number;
  };
  company: {
    totalProposals: number;
    totalOrders: number;
    totalOrderAmount: number;
    activeCustomers: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.userId;

  // --- USER STATS ---

  // 1. My Proposals (Count)
  // Logic: Proposals linked to companies where representative_id is current user
  // OR owner_email matches (if we had user email, but we have ID). 
  // Let's rely on company relationship for now as it's cleaner in SQL.
  const { count: myProposalsCount } = await supabase
    .from('proposals')
    .select('id, companies!inner(representative_id)', { count: 'exact', head: true })
    .eq('companies.representative_id', userId);

  // 2. My Orders (Count & Amount)
  let myOrders: { amount: any }[] = [];
  let myPage = 0;
  const myPageSize = 1000;
  let myHasMore = true;

  while (myHasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('amount')
      .eq('representative_id', userId)
      .range(myPage * myPageSize, (myPage + 1) * myPageSize - 1);

    if (error) {
      console.error("Error fetching my orders:", error);
      break;
    }

    if (data && data.length > 0) {
      myOrders = [...myOrders, ...data];
      if (data.length < myPageSize) myHasMore = false;
    } else {
      myHasMore = false;
    }
    myPage++;
  }

  const myOrdersCount = myOrders.length;
  const myOrderAmount = myOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

  // 3. My Pending Tasks
  const { count: myPendingTasks } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED');


  // --- COMPANY STATS ---
  
  // 1. Total Proposals
  const { count: totalProposals } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true });

  // 2. Total Orders
  let allOrders: { amount: any }[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('amount')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching orders:", error);
      break;
    }

    if (data && data.length > 0) {
      allOrders = [...allOrders, ...data];
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
    page++;
  }
    
  const totalOrders = allOrders.length;
  const totalOrderAmount = allOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

  // 3. Active Customers (Companies)
  const { count: activeCustomers } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true });

  return {
    user: {
      totalProposals: myProposalsCount || 0,
      totalOrders: myOrdersCount,
      totalOrderAmount: myOrderAmount,
      pendingTasks: myPendingTasks || 0,
    },
    company: {
      totalProposals: totalProposals || 0,
      totalOrders: totalOrders,
      totalOrderAmount: totalOrderAmount,
      activeCustomers: activeCustomers || 0,
    }
  };
}

export async function getRecentProposals() {
  const session = await getSession();
  if (!session) return [];

  // Fetch proposals for companies owned by the user
  const { data } = await supabase
    .from('proposals')
    .select(`
      id,
      proposal_no,
      created_at,
      total_amount,
      currency,
      status,
      companies!inner (
        *
      ),
      persons (
        first_name,
        last_name
      )
    `)
    .eq('companies.representative_id', session.userId)
    .order('proposal_no', { ascending: false })
    .limit(5);

  return data || [];
}

export async function getRecentOrders() {
  const session = await getSession();
  if (!session) return [];

  const { data } = await supabase
    .from('orders')
    .select(`
      id,
      order_no,
      amount,
      currency,
      status,
      order_date,
      companies (
        name
      )
    `)
    .eq('representative_id', session.userId)
    .order('order_no', { ascending: false })
    .limit(5);

  return data || [];
}

export async function getUpcomingTasks() {
  const session = await getSession();
  if (!session) return [];

  const { data } = await supabase
    .from('activities')
    .select(`
      *,
      companies (
        *
      )
    `)
    .eq('assigned_to', session.userId)
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED')
    .order('due_date', { ascending: true })
    .limit(5);

  return data || [];
}

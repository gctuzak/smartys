'use server'

import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { startOfMonth, subMonths, format } from "date-fns";
import { tr } from "date-fns/locale";

// Initialize Admin Client for Server Actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  // TODO: Remove this debug override once confirmed
  // If user is admin or we want to show ALL data regardless of owner:
  const showAllData = true; 

  // --- USER STATS ---

  // 1. My Proposals (Count)
  // Logic: Proposals linked to companies where representative_id is current user
  // OR owner_email matches (if we had user email, but we have ID). 
  // Let's rely on company relationship for now as it's cleaner in SQL.
  let myProposalsQuery = supabase
    .from('proposals')
    .select('id, companies!inner(representative_id)', { count: 'exact', head: true });
    
  if (!showAllData) {
     myProposalsQuery = myProposalsQuery.eq('companies.representative_id', userId);
  }

  const { count: myProposalsCount } = await myProposalsQuery;

  // 2. My Orders (Count & Amount)
  // Use sum aggregate for much faster performance
  // If showing all data, we can't use the specific RPC easily unless we modify it or use raw query
  // Let's use raw query for flexibility now
  
  let myOrdersCount = 0;
  let myOrderAmount = 0;

  if (showAllData) {
      // Fetch stats for ALL orders
      const { data: allStats } = await supabase.rpc('get_total_orders_stats');
      if (allStats && allStats[0]) {
          myOrdersCount = allStats[0].count;
          myOrderAmount = allStats[0].total_amount;
      }
  } else {
      const { data: myOrdersData, error: myOrdersError } = await supabase.rpc('get_my_orders_stats', { user_id: userId });
      if (!myOrdersError && myOrdersData) {
         myOrdersCount = myOrdersData[0]?.count || 0;
         myOrderAmount = myOrdersData[0]?.total_amount || 0;
      }
  }

  // 3. My Pending Tasks
  let myTasksQuery = supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED');
    
  if (!showAllData) {
      myTasksQuery = myTasksQuery.eq('assigned_to', userId);
  }
  
  const { count: myPendingTasks } = await myTasksQuery;


  // --- COMPANY STATS ---
  
  // 1. Total Proposals
  const { count: totalProposals } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true });

  // 2. Total Orders
  // Use sum aggregate for much faster performance
  const { data: allOrdersData, error: allOrdersError } = await supabase.rpc('get_total_orders_stats');

  let totalOrders = 0;
  let totalOrderAmount = 0;

  if (!allOrdersError && allOrdersData) {
     totalOrders = allOrdersData[0]?.count || 0;
     totalOrderAmount = allOrdersData[0]?.total_amount || 0;
  } else {
    // Fallback
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });
    totalOrders = count || 0;

    // Temporary: Just fetch last 1000 orders for stats
    const { data } = await supabase
      .from('orders')
      .select('amount')
      .limit(1000);
      
    if (data) {
      totalOrderAmount = data.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
    }
  }

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
  // TEMPORARY: Removed user filter to debug data visibility
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
    // .eq('companies.representative_id', session.userId)
    .order('proposal_no', { ascending: false })
    .limit(5);

  return data || [];
}

export async function getRecentOrders() {
  const session = await getSession();
  if (!session) return [];

  // TEMPORARY: Removed user filter to debug data visibility
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
      ),
      persons (
        first_name,
        last_name
      )
    `)
    // .eq('representative_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

export async function getUpcomingTasks() {
  const session = await getSession();
  if (!session) return [];

  // TEMPORARY: Removed user filter to debug data visibility
  const { data } = await supabase
    .from('activities')
    .select(`
      *,
      companies (
        *
      )
    `)
    // .eq('assigned_to', session.userId)
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELED')
    .order('due_date', { ascending: true })
    .limit(5);

  return data || [];
}

export async function getCalendarActivities(start: Date, end: Date) {
  const session = await getSession();
  if (!session) return [];

  const { data } = await supabase
    .from('activities')
    .select(`
      *,
      companies (
        name
      ),
      persons (
        first_name,
        last_name
      )
    `)
    .eq('assigned_to', session.userId)
    .gte('due_date', start.toISOString())
    .lte('due_date', end.toISOString())
    .neq('status', 'CANCELED'); // Show COMPLETED tasks in calendar, but maybe style differently

  return data || [];
}

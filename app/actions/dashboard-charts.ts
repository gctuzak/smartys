'use server';

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export interface SalesData {
  name: string;
  total: number;
}

export interface StatusData {
  name: string;
  value: number;
  color?: string;
}

export interface ActivityData {
  name: string;
  value: number;
}

export async function getUserMonthlySales(): Promise<SalesData[]> {
  const session = await getSession();
  if (!session) return [];

  const currentYear = new Date().getFullYear();

  // Fetch orders for the current user in the current year
  // Using order_date if available, otherwise created_at
  
  // Simplification: Just fetch all orders for the user and filter in JS to avoid complex OR logic in Supabase URL parser limitations
  // Or fetch last 12 months. Let's fetch all for this user (assuming not millions) and filter for current year.
  
  const { data: allOrders } = await supabase
    .from('orders')
    .select('amount, order_date, created_at')
    .eq('representative_id', session.userId);

  if (!allOrders) return [];

  const monthlyData = new Array(12).fill(0);
  
  allOrders.forEach(order => {
    const dateStr = order.order_date || order.created_at;
    if (!dateStr) return;
    
    const date = new Date(dateStr);
    if (date.getFullYear() === currentYear) {
      const month = date.getMonth(); // 0-11
      monthlyData[month] += Number(order.amount) || 0;
    }
  });

  return monthlyData.map((total, index) => ({
    name: format(new Date(currentYear, index, 1), 'MMM', { locale: tr }),
    total: Math.round(total)
  }));
}

export async function getUserProposalStatusDistribution(): Promise<StatusData[]> {
  const session = await getSession();
  if (!session) return [];

  // Need to join with companies to filter by representative_id
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      status,
      companies!inner (
        representative_id
      )
    `)
    .eq('companies.representative_id', session.userId);

  if (!proposals) return [];

  const statusCounts: Record<string, number> = {};

  proposals.forEach(p => {
    // Normalize status (e.g. "Draft", "Sent", "Approved" -> translate if needed)
    const status = p.status || 'Bilinmiyor';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Map status codes to readable names and colors
  const statusMap: Record<string, { label: string, color: string }> = {
    'draft': { label: 'Taslak', color: '#94a3b8' }, // slate-400
    'sent': { label: 'Gönderildi', color: '#3b82f6' }, // blue-500
    'approved': { label: 'Onaylandı', color: '#22c55e' }, // green-500
    'rejected': { label: 'Reddedildi', color: '#ef4444' }, // red-500
    'pending': { label: 'Bekliyor', color: '#eab308' }, // yellow-500
    'revised': { label: 'Revize', color: '#f97316' }, // orange-500
  };

  return Object.entries(statusCounts).map(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    const info = statusMap[normalizedKey] || { label: key, color: '#64748b' };
    return {
      name: info.label,
      value,
      color: info.color
    };
  }).sort((a, b) => b.value - a.value); // Sort by count desc
}

export async function getUserActivityDistribution(): Promise<ActivityData[]> {
  const session = await getSession();
  if (!session) return [];

  const { data: activities } = await supabase
    .from('activities')
    .select('type')
    .eq('assigned_to', session.userId);

  if (!activities) return [];

  const typeCounts: Record<string, number> = {};

  activities.forEach(a => {
    const type = a.type || 'Other';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Map types to readable names
  const typeMap: Record<string, string> = {
    'TASK': 'Görev',
    'CALL': 'Arama',
    'MEETING': 'Toplantı',
    'EMAIL': 'E-posta',
    'NOTE': 'Not',
    'LUNCH': 'Öğle Yemeği',
    'DEADLINE': 'Son Tarih'
  };

  return Object.entries(typeCounts).map(([key, value]) => ({
    name: typeMap[key] || key,
    value
  })).sort((a, b) => b.value - a.value);
}

"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface UpdateOrderParams {
  amount?: number;
  currency?: string;
  status?: string;
  notes?: string;
  projectName?: string;
  orderDate?: string;
}

export async function updateOrderAction(id: string, data: UpdateOrderParams) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    // Get order details for logging
    const { data: order } = await supabase
      .from('orders')
      .select('order_no, company_id')
      .eq('id', id)
      .single();

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.projectName !== undefined) updateData.project_name = data.projectName;
    if (data.orderDate !== undefined) updateData.order_date = data.orderDate;

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    await logActivity({
      action: 'Sipariş Güncellendi',
      entityType: 'orders',
      entityId: id,
      entityName: `Sipariş #${order?.order_no}`,
      userId: userId,
      companyId: order?.company_id,
      details: data
    });

    revalidatePath('/orders');
    return { success: true };
  } catch (error) {
    console.error('Update Order Error:', error);
    return { success: false, error: 'Sipariş güncellenemedi.' };
  }
}

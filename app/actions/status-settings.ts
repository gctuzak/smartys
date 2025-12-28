"use server";

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type StatusItem = {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isActive: boolean;
};

// --- Proposal Statuses ---

export async function getProposalStatuses() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    // Return empty or throw, but better to return empty for UI safety
    return [];
  }

  const { data, error } = await supabase
    .from("proposal_statuses")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching proposal statuses:", error);
    return [];
  }

  // Map snake_case to camelCase if needed, but Supabase returns as is.
  // We'll map to our StatusItem type.
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    order: item.order,
    isDefault: item.is_default,
    isActive: item.is_active,
  })) as StatusItem[];
}

export async function addProposalStatus(data: { name: string; color: string; order: number }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("proposal_statuses").insert({
    name: data.name,
    color: data.color,
    order: data.order,
  });

  if (error) {
    console.error("Error adding proposal status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

export async function updateProposalStatus(id: string, data: Partial<StatusItem>) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

  const { error } = await supabase
    .from("proposal_statuses")
    .update(updateData)
    .eq("id", id);


  if (error) {
    console.error("Error updating proposal status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

export async function deleteProposalStatus(id: string) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("proposal_statuses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting proposal status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

// --- Order Statuses ---

export async function getOrderStatuses() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return [];
  }

  const { data, error } = await supabase
    .from("order_statuses")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    console.error("Error fetching order statuses:", error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    order: item.order,
    isDefault: item.is_default,
    isActive: item.is_active,
  })) as StatusItem[];
}

export async function addOrderStatus(data: { name: string; color: string; order: number }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("order_statuses").insert({
    name: data.name,
    color: data.color,
    order: data.order,
  });

  if (error) {
    console.error("Error adding order status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

export async function updateOrderStatus(id: string, data: Partial<StatusItem>) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

  const { error } = await supabase
    .from("order_statuses")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

export async function deleteOrderStatus(id: string) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("order_statuses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting order status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/statuses");
  return { success: true };
}

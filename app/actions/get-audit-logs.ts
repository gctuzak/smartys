'use server'

import { supabase } from "@/lib/supabase";

export async function getAuditLogs(limit = 20) {
  try {
    // We select user info manually if relation syntax fails, but let's try standard join
    // Note: Supabase JS client joins might require correct foreign key detection.
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!user_id (
          first_name,
          last_name
        ),
        company:companies!company_id (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
        console.error("Supabase error fetching logs:", error);
        return { data: [] };
    }
    
    return { data };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { data: [] };
  }
}

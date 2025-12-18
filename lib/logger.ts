import { supabase } from "@/lib/supabase";

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
export type AuditEntityType = 'COMPANY' | 'PERSON' | 'PROPOSAL' | 'ORDER' | 'TASK' | 'USER' | 'DOCUMENT';

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  userId?: string;
  companyId?: string;
  details?: any;
}

export async function logActivity(params: LogActivityParams) {
  try {
    // We use the Supabase client which might be using the anon key.
    // Ensure RLS policies allow insertion for authenticated users, 
    // or use a service role client if this is strictly server-side and secure.
    // For now, we assume the server actions have proper auth context or the table allows insert.
    
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        user_id: params.userId,
        company_id: params.companyId,
        details: params.details,
      });

    if (error) {
      console.error("Error logging activity:", error);
    }
  } catch (err) {
    console.error("Exception logging activity:", err);
  }
}

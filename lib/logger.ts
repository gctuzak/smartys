import { createClient } from "@supabase/supabase-js";

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

// Use Service Role Key if available (Server Side), otherwise Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function logActivity(params: LogActivityParams) {
  try {
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

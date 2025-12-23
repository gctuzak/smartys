"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkEntitiesAction(companyName: string | null, personName: string | null) {
  const result = {
    company: null as any,
    person: null as any,
  };

  if (companyName) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', companyName.trim())
      .limit(1)
      .single();
    
    result.company = data;
  }

  if (personName) {
    const parts = personName.trim().split(' ');
    let firstName = personName.trim();
    let lastName = '';
    
    if (parts.length > 1) {
      lastName = parts.pop() || '';
      firstName = parts.join(' ');
    }

    let query = supabase
      .from('persons')
      .select('*')
      .ilike('first_name', firstName);

    if (lastName) {
      query = query.ilike('last_name', lastName);
    }

    // Ideally we filter by company too, but we might not know the company ID yet if it's new.
    // So we just return the first match or null.
    // If the company exists (found above), we can refine this.
    
    if (result.company) {
      query = query.eq('company_id', result.company.id);
    }

    const { data } = await query.limit(1).single();
    result.person = data;
  }

  return result;
}

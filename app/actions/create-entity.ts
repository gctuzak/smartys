"use server";

import { createClient } from '@supabase/supabase-js';
import { Company, Person } from "@/types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createCompanyAction(company: Partial<Company>) {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: company.name,
      contact_info: company.contactInfo || {},
      tax_no: company.taxNo,
      tax_office: company.taxOffice,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createPersonAction(person: Partial<Person>) {
  const { data, error } = await supabase
    .from('persons')
    .insert({
      first_name: person.firstName,
      last_name: person.lastName,
      email: person.email,
      phone: person.phone,
      title: person.title,
      company_id: person.companyId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

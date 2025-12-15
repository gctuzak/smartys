
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function linkCompanyContacts() {
  console.log('Starting company contact linking...');

  // 1. Get proposals with Company but no Person
  // Fetch in chunks if needed, but let's try 1000 first
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, proposal_no, company_id, company:companies(id, name, authorized_person)')
    .not('company_id', 'is', null)
    .is('person_id', null);

  if (error) {
    console.error('Error fetching proposals:', error);
    return;
  }

  console.log(`Found ${proposals.length} proposals with Company but no Person.`);

  let updatedCount = 0;

  for (const proposal of proposals) {
    const company = proposal.company as any;
    if (!company || !company.authorized_person) continue;

    const authPersonName = company.authorized_person.trim();
    if (!authPersonName) continue;

    // Search for this person in 'persons' table
    // Strategy: 
    // 1. Search by exact full name match (if we construct full name from first/last) -> Hard because split is ambiguous
    // 2. Search by company_id AND name match
    
    // Split name
    const parts = authPersonName.split(' ');
    let firstName = authPersonName;
    let lastName = '';
    
    if (parts.length > 1) {
       lastName = parts.pop()!;
       firstName = parts.join(' ');
    }

    // Try to find person linked to this company
    const { data: persons } = await supabase
      .from('persons')
      .select('id, first_name, last_name')
      .eq('company_id', company.id)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .limit(1);

    if (persons && persons.length > 0) {
      // Found a match linked to the company!
      await supabase
        .from('proposals')
        .update({ person_id: persons[0].id })
        .eq('id', proposal.id);
        
      console.log(`[#${proposal.proposal_no}] Linked '${authPersonName}' (Person ID: ${persons[0].id})`);
      updatedCount++;
      continue;
    }

    // If not found by company_id, try global search (maybe person is not linked to company in DB?)
    // Be careful with common names.
    const { data: globalPersons } = await supabase
      .from('persons')
      .select('id, first_name, last_name, company_id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .limit(5); // Get a few to see if ambiguous

    if (globalPersons && globalPersons.length === 1) {
       // Only one person with this name exists, safe to link?
       // Maybe, but safer if we also link the person to the company?
       const p = globalPersons[0];
       
       await supabase
        .from('proposals')
        .update({ person_id: p.id })
        .eq('id', proposal.id);
       
       console.log(`[#${proposal.proposal_no}] Linked '${authPersonName}' (Global Search ID: ${p.id})`);
       updatedCount++;
       
       // Optional: Link person to company if not linked?
       if (!p.company_id) {
         await supabase.from('persons').update({ company_id: company.id }).eq('id', p.id);
         console.log(`   -> Also linked Person to Company ${company.name}`);
       }
    } else if (globalPersons && globalPersons.length > 1) {
        console.log(`[#${proposal.proposal_no}] Ambiguous match for '${authPersonName}' (${globalPersons.length} found). Skipping.`);
    }
  }

  console.log(`Finished. Updated ${updatedCount} proposals.`);
}

linkCompanyContacts();

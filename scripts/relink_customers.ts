
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function relinkCustomers() {
  console.log('Starting customer relinking...');

  const filePath = path.join(process.cwd(), 'excel_data', 'teklif3.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any>(sheet);

  console.log(`Processing ${data.length} rows...`);

  let linkedCount = 0;
  let notFoundCount = 0;
  let alreadyLinkedCount = 0;

  for (const row of data) {
    const proposalNoRaw = row['Ad/Teklif Ref No'];
    if (!proposalNoRaw) continue;
    const proposalNo = parseInt(String(proposalNoRaw).replace(/\D/g, ''));
    if (isNaN(proposalNo)) continue;

    const customerName = row['Müşteri Adı'];
    if (!customerName) continue;
    
    const cleanName = String(customerName).trim();

    // Fetch proposal
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id, company_id, person_id')
      .eq('proposal_no', proposalNo)
      .single();

    if (!proposal) continue;

    if (proposal.company_id || proposal.person_id) {
      alreadyLinkedCount++;
      continue;
    }

    // Try to find Company
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', cleanName) // Exact case-insensitive match first
      .limit(1);

    if (companies && companies.length > 0) {
      await supabase.from('proposals').update({ company_id: companies[0].id }).eq('id', proposal.id);
      console.log(`Linked Proposal ${proposalNo} to Company: ${cleanName}`);
      linkedCount++;
      continue;
    }

    // Try to find Person
    // Try full name match if stored as one string? No, person has first/last.
    // Heuristic split: Last word is surname, rest is first name.
    const parts = cleanName.split(' ');
    let firstName = cleanName;
    let lastName = '';
    
    if (parts.length > 1) {
       lastName = parts.pop()!;
       firstName = parts.join(' ');
    }

    let personId = null;

    // Search logic for person
    if (lastName) {
       const { data: persons } = await supabase
         .from('persons')
         .select('id')
         .ilike('first_name', firstName)
         .ilike('last_name', lastName)
         .limit(1);
       
       if (persons && persons.length > 0) personId = persons[0].id;
    }

    // If not found, try searching just by first name + last name combined in some way? 
    // Or maybe the name in Excel is "Last First"? Unlikely.
    // What if "Gülsen Kalan" is in DB as "Gülsen" "Kalan"? Yes.
    
    if (personId) {
      await supabase.from('proposals').update({ person_id: personId }).eq('id', proposal.id);
      console.log(`Linked Proposal ${proposalNo} to Person: ${cleanName}`);
      linkedCount++;
    } else {
      console.log(`Could not find match for: ${cleanName} (Proposal ${proposalNo})`);
      
      // Auto-create missing person/company?
      // User complaint implies they expect it to be there.
      // If I create it, I need to guess if it's Company or Person.
      
      const isCompany = /A\.Ş\.|LTD\.|TİC\.|SAN\.|YAPI|MİMARLIK|TURİZM|OTOMOTİV/i.test(cleanName);
      
      if (isCompany) {
         const { data: newComp, error } = await supabase
           .from('companies')
           .insert({ name: cleanName })
           .select('id')
           .single();
         if (!error && newComp) {
             await supabase.from('proposals').update({ company_id: newComp.id }).eq('id', proposal.id);
             console.log(`Created Company and Linked: ${cleanName}`);
             linkedCount++;
         }
      } else {
         // Assume Person
         const { data: newPers, error } = await supabase
            .from('persons')
            .insert({ 
                first_name: firstName, 
                last_name: lastName || '-' // Require last name? 
            })
            .select('id')
            .single();
            
         if (!error && newPers) {
             await supabase.from('proposals').update({ person_id: newPers.id }).eq('id', proposal.id);
             console.log(`Created Person and Linked: ${cleanName}`);
             linkedCount++;
         }
      }
      
      notFoundCount++;
    }
  }

  console.log('Relink complete.');
  console.log(`Linked: ${linkedCount}`);
  console.log(`Already Linked: ${alreadyLinkedCount}`);
  console.log(`Not Found (and attempted create): ${notFoundCount}`);
}

relinkCustomers();

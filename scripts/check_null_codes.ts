
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Anon Key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNullCodes() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .is('code', null)
    .limit(10); // Check first 10

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Checking ${companies?.length} companies with NULL code against Persons table...`);
  
  for (const c of companies || []) {
    if (!c.name) continue;
    
    // Check if name exists in persons
    const { data: persons } = await supabase
        .from('persons')
        .select('id, code, first_name, last_name')
        .textSearch('fts', `'${c.name}'`, { config: 'turkish' }) // Simple text search or just use ilike
        // Actually fts might be complex setup, let's use ilike on first/last name logic
        // But c.name is full name.
        // Let's try simple exact match logic simulation
    
    // We can't easily split name perfectly, but let's try to find if any person has this name
    // Maybe just search by first word as first name?
    
    const parts = c.name.split(' ');
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    
    const { data: pMatch } = await supabase
         .from('persons')
         .select('id, code, first_name, last_name')
         .ilike('first_name', `${first}%`)
         .ilike('last_name', `${last}%`);
         
     console.log(`Company: "${c.name}" (ID: ${c.id})`);
     
     // Check for linked orders
     const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', c.id);
        
     console.log(`  -> Linked Orders: ${orderCount}`);

     if (pMatch && pMatch.length > 0) {
         console.log(`  -> Potential Person Match: ${pMatch[0].first_name} ${pMatch[0].last_name} (${pMatch[0].code})`);
     } else {
         console.log(`  -> No direct Person match found.`);
     }
  }
}

checkNullCodes();

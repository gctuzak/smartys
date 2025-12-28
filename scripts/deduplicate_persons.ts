
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon Key as per project config

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Anon Key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to normalize strings for comparison
function normalizeName(first: any, last: any): string {
  const full = `${first || ''} ${last || ''}`;
  return full
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric (spaces, dashes, etc.)
}

async function getAllPersons() {
  let allPersons: any[] = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('persons')
      .select('id, code, first_name, last_name, email1')
      .range(from, from + step - 1);
      
    if (error) {
      console.error("Error fetching page:", error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allPersons = allPersons.concat(data);
    
    if (data.length < step) break; // Last page
    from += step;
  }
  
  return allPersons;
}

async function deduplicatePersons() {
  console.log("Starting deduplication process (Enhanced)...");

  // 1. Fetch all persons
  const persons = await getAllPersons();
  console.log(`Total persons found: ${persons.length}`);

  // 2. Group by Normalized Name
  const groups = new Map<string, any[]>();
  
  persons.forEach(p => {
    const key = normalizeName(p.first_name, p.last_name);
    if (!key) return;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(p);
  });

  let processedCount = 0;
  let deletedCount = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue; // No duplicates

    // Filter by prefix (Case Insensitive)
    const pRecords = group.filter(p => p.code && p.code.toUpperCase().startsWith('P'));
    const kRecords = group.filter(p => p.code && p.code.toUpperCase().startsWith('K'));

    // We look for cases where we have K records (keepers) and P records (to delete)
    if (pRecords.length > 0 && kRecords.length > 0) {
      const keeper = kRecords[0]; // Keep the first K record
      
      console.log(`Match found for: "${key}"`);
      console.log(`  Keeper: ${keeper.code} (${keeper.first_name} ${keeper.last_name})`);
      
      for (const pRecord of pRecords) {
        if (pRecord.id === keeper.id) continue; // Should not happen given prefixes, but safety first

        console.log(`  Removing: ${pRecord.code} (${pRecord.first_name} ${pRecord.last_name})`);
        
        // 3. Migrate related data
        
        // Update Orders
        const { error: orderErr } = await supabase
          .from('orders')
          .update({ person_id: keeper.id })
          .eq('person_id', pRecord.id);
        if (orderErr) console.error(`    Error moving orders:`, orderErr);
        
        // Update Proposals
        const { error: propErr } = await supabase
          .from('proposals')
          .update({ person_id: keeper.id })
          .eq('person_id', pRecord.id);
        if (propErr) console.error(`    Error moving proposals:`, propErr);

        // Update Documents
        const { error: docErr } = await supabase
          .from('documents')
          .update({ person_id: keeper.id })
          .eq('person_id', pRecord.id);
        if (docErr) console.error(`    Error moving documents:`, docErr);

        // Update Activities
        const { error: actErr } = await supabase
          .from('activities')
          .update({ contact_id: keeper.id })
          .eq('contact_id', pRecord.id);
        if (actErr) console.error(`    Error moving activities:`, actErr);

        // 4. Delete P record
        const { error: delErr } = await supabase
          .from('persons')
          .delete()
          .eq('id', pRecord.id);
          
        if (delErr) {
          console.error(`    Error deleting person ${pRecord.code}:`, delErr);
        } else {
          console.log(`    Deleted ${pRecord.code}`);
          deletedCount++;
        }
      }
      processedCount++;
    }
  }

  console.log("Deduplication complete.");
  console.log(`Processed ${processedCount} groups.`);
  console.log(`Deleted ${deletedCount} duplicate records.`);
}

deduplicatePersons();

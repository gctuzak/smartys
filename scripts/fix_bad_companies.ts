
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

async function fixBadCompanies() {
  console.log("Fetching companies with NULL code...");
  
  // Fetch all bad companies
  // Use pagination if too many, but for now let's try fetching all or first 1000
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .is('code', null);

  if (error) {
    console.error("Error fetching companies:", error);
    return;
  }

  console.log(`Found ${companies?.length} bad companies.`);

  let deletedCount = 0;
  let migratedCount = 0;
  let skippedCount = 0;

  for (const c of companies || []) {
    if (!c.name) {
        // If name is empty, just delete if no orders
        const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', c.id);
        if (count === 0) {
            await supabase.from('companies').delete().eq('id', c.id);
            deletedCount++;
        }
        continue;
    }

    // Check for linked orders/proposals/activities
    const { count: orderCount } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', c.id);
    const { count: proposalCount } = await supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('company_id', c.id);
    
    // Simple check: if total linked items > 0, we need to migrate
    const totalLinked = (orderCount || 0) + (proposalCount || 0);

    if (totalLinked === 0) {
        // Safe to delete (check activities too? usually activities are linked to person primarily but let's check company_id)
        const { count: actCount } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('company_id', c.id);
        
        if (!actCount || actCount === 0) {
            const { error: delErr } = await supabase.from('companies').delete().eq('id', c.id);
            if (delErr) {
                console.error(`Error deleting ${c.name}:`, delErr);
            } else {
                console.log(`Deleted unused: ${c.name}`);
                deletedCount++;
            }
            continue;
        }
    }

    // Has linked items, try to find person
    const parts = c.name.split(' ');
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : '';

    const { data: pMatch } = await supabase
        .from('persons')
        .select('id, code, first_name, last_name')
        .ilike('first_name', `${first}%`)
        .ilike('last_name', `${last}%`)
        .limit(1);

    if (pMatch && pMatch.length > 0) {
        const person = pMatch[0];
        console.log(`Migrating data for ${c.name} -> Person: ${person.first_name} ${person.last_name} (${person.code})`);
        
        // Update Orders
        if (orderCount && orderCount > 0) {
            const { error: ordErr } = await supabase
                .from('orders')
                .update({ company_id: null, person_id: person.id })
                .eq('company_id', c.id);
            if (ordErr) console.error(`  Error updating orders:`, ordErr);
        }

        // Update Proposals
        if (proposalCount && proposalCount > 0) {
            const { error: propErr } = await supabase
                .from('proposals')
                .update({ company_id: null, person_id: person.id })
                .eq('company_id', c.id);
            if (propErr) console.error(`  Error updating proposals:`, propErr);
        }

        // Update Activities
        const { error: actErr } = await supabase
            .from('activities')
            .update({ company_id: null, contact_id: person.id })
            .eq('company_id', c.id);
        if (actErr) console.error(`  Error updating activities:`, actErr);

        // Update Documents
        const { error: docErr } = await supabase
            .from('documents')
            .update({ company_id: null, person_id: person.id })
            .eq('company_id', c.id);
        if (docErr) console.error(`  Error updating documents:`, docErr);

        // Now delete company
        const { error: delErr } = await supabase.from('companies').delete().eq('id', c.id);
        if (delErr) {
            console.error(`  Error deleting company after migrate:`, delErr);
        } else {
            console.log(`  Migrated & Deleted.`);
            migratedCount++;
            deletedCount++;
        }
    } else {
        console.warn(`Skipping ${c.name} (Linked items) - No matching person found.`);
        skippedCount++;
    }
  }

  console.log("--- Summary ---");
  console.log(`Total Found: ${companies?.length}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Migrated & Deleted: ${migratedCount}`);
  console.log(`Skipped (Safety): ${skippedCount}`);
}

fixBadCompanies();

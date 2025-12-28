
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting deduplication process...");

  // 1. Get total count
  const { count, error: countError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("Error counting proposals:", countError);
    return;
  }
  console.log(`Total proposals in DB: ${count}`);

  // 2. Fetch ALL proposals (using loop to bypass 1000 limit)
  let allProposals: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  console.log("Fetching all proposals...");
  while (hasMore) {
    const { data, error } = await supabase
      .from('proposals')
      .select('id, legacy_proposal_no, created_at, proposal_no')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching page:", error);
      break;
    }

    if (data && data.length > 0) {
      allProposals = allProposals.concat(data);
      console.log(`Fetched ${data.length} rows (Total: ${allProposals.length})`);
      if (data.length < pageSize) hasMore = false;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Finished fetching. Total loaded: ${allProposals.length}`);

  // 3. Group by legacy_proposal_no
  const legacyMap = new Map<string, any[]>();
  let nullLegacyCount = 0;

  allProposals.forEach(p => {
    if (!p.legacy_proposal_no) {
      nullLegacyCount++;
      return;
    }
    
    // Normalize key just in case
    const key = String(p.legacy_proposal_no).trim();
    
    if (!legacyMap.has(key)) {
      legacyMap.set(key, []);
    }
    legacyMap.get(key)?.push(p);
  });

  console.log(`Proposals with null legacy_proposal_no: ${nullLegacyCount}`);
  
  // 4. Identify Duplicates
  const idsToDelete: string[] = [];
  let duplicateGroups = 0;

  for (const [key, items] of legacyMap.entries()) {
    if (items.length > 1) {
      duplicateGroups++;
      // Sort by ID (assuming higher ID = newer) or created_at
      // We usually want to keep the LATEST one if they are identical, 
      // OR the OLDEST one if we want to preserve original creation time.
      // But typically "latest imported" might be the duplicate.
      // Actually, if data is identical, it doesn't matter much.
      // Let's keep the one with the HIGHEST ID (newest) so we don't break references? 
      // No, usually older ID is better to keep if there are relations.
      // But here we just imported them.
      // Let's keep the FIRST one (lowest ID).
      
      items.sort((a, b) => a.id - b.id); // String comparison for UUIDs? No, IDs are integers usually? 
      // Wait, IDs in Supabase are usually integer or UUID. 
      // If UUID, sort doesn't work for time. 
      // Use created_at.
      
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // Keep the first one (oldest), delete the rest
      const [keep, ...remove] = items;
      
      // console.log(`Duplicate Group for ${key}: Keeping ${keep.id}, Removing ${remove.length} items`);
      remove.forEach(r => idsToDelete.push(r.id));
    }
  }

  console.log(`Found ${duplicateGroups} groups with duplicates.`);
  console.log(`Total records to delete: ${idsToDelete.length}`);

  if (idsToDelete.length === 0) {
    console.log("No duplicates found to delete.");
    return;
  }

  // 5. Delete in chunks (with re-linking)
  console.log("Deleting duplicates with re-linking...");
  
  for (const [key, items] of legacyMap.entries()) {
    if (items.length > 1) {
       // Sort by created_at (keep oldest)
       items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
       const [winner, ...losers] = items;
       
       console.log(`Processing duplicate group ${key}. Winner: ${winner.id}`);
       
       for (const loser of losers) {
           console.log(`  - Merging loser ${loser.id} into winner...`);
           
           // Re-link Proposal Items
           await supabase.from('proposal_items').update({ proposal_id: winner.id }).eq('proposal_id', loser.id);
           
           // Re-link Orders
           await supabase.from('orders').update({ proposal_id: winner.id }).eq('proposal_id', loser.id);
           
           // Re-link Documents
           await supabase.from('documents').update({ proposal_id: winner.id }).eq('proposal_id', loser.id);
           
           // Re-link Activities
           await supabase.from('activities').update({ proposal_id: winner.id }).eq('proposal_id', loser.id);
           
           // Finally Delete Proposal
           const { error } = await supabase.from('proposals').delete().eq('id', loser.id);
           if (error) {
               console.error(`  - Failed to delete ${loser.id}:`, error.message);
           } else {
               console.log(`  - Deleted ${loser.id}`);
           }
       }
    }
  }

  console.log("Deduplication complete.");
}

main();

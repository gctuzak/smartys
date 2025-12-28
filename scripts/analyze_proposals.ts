
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Analyzing proposals table...");

  // 1. Get total count
  const { count, error: countError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("Error counting proposals:", countError);
    return;
  }
  console.log(`Total proposals: ${count}`);

  // 2. Check for duplicates based on legacy_proposal_no (assuming this is the unique identifier from Excel/Old system)
  console.log("Checking for duplicates by legacy_proposal_no...");
  
  // Since we can't do complex GROUP BY queries easily via JS client without RPC, 
  // we will fetch IDs and legacy_proposal_nos and analyze in memory (might be heavy if 5000+ rows but manageable for Node)
  
  const { data: allProposals, error: fetchError } = await supabase
    .from('proposals')
    .select('id, legacy_proposal_no, created_at, proposal_no');
    
  if (fetchError) {
    console.error("Error fetching proposals:", fetchError);
    return;
  }

  if (!allProposals) return;

  const legacyMap = new Map<string, any[]>();
  let nullLegacyCount = 0;

  allProposals.forEach(p => {
    if (!p.legacy_proposal_no) {
      nullLegacyCount++;
      return;
    }
    
    if (!legacyMap.has(p.legacy_proposal_no)) {
      legacyMap.set(p.legacy_proposal_no, []);
    }
    legacyMap.get(p.legacy_proposal_no)?.push(p);
  });

  console.log(`Proposals with null legacy_proposal_no: ${nullLegacyCount}`);
  
  let duplicateGroups = 0;
  let totalDuplicateRecords = 0;

  console.log("\nSample Duplicates:");
  let printed = 0;
  
  for (const [legacyNo, items] of legacyMap.entries()) {
    if (items.length > 1) {
      duplicateGroups++;
      totalDuplicateRecords += items.length;
      
      if (printed < 5) {
        console.log(`Legacy No: ${legacyNo} -> Count: ${items.length}`);
        items.forEach(i => console.log(`  - ID: ${i.id}, Created: ${i.created_at}, No: ${i.proposal_no}`));
        printed++;
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`Unique Legacy IDs found: ${legacyMap.size}`);
  console.log(`Groups with duplicates: ${duplicateGroups}`);
  console.log(`Total records involved in duplicates: ${totalDuplicateRecords}`);
  
  // Calculate potential "real" count
  // Real count ~= (Unique Legacy IDs) + (Null Legacy IDs assumed unique or needing check)
  // Or more accurately: Total - (Total Duplicates - Duplicate Groups) 
  // e.g. if we have 3 records for ID "A", we have 2 extra.
  
  const extraRecords = totalDuplicateRecords - duplicateGroups;
  console.log(`Estimated excess records (duplicates): ${extraRecords}`);
  console.log(`Expected total if duplicates removed: ${count! - extraRecords}`);

}

main();

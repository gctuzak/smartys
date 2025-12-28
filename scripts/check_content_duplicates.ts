
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking duplicates by content (company_id + total_amount + date)...");

  // Fetch all proposals
  let allProposals: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('proposals')
      .select('id, company_id, total_amount, proposal_date, created_at, legacy_proposal_no')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching page:", error);
      break;
    }

    if (data && data.length > 0) {
      allProposals = allProposals.concat(data);
      if (data.length < pageSize) hasMore = false;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Total proposals loaded: ${allProposals.length}`);

  // Group by "Content Key"
  const map = new Map<string, any[]>();
  
  allProposals.forEach(p => {
    // Key: company_id|total_amount|date(YYYY-MM-DD)
    const dateStr = p.proposal_date ? new Date(p.proposal_date).toISOString().split('T')[0] : 'no-date';
    const amount = p.total_amount || 0;
    const company = p.company_id || 'no-company';
    
    const key = `${company}|${amount}|${dateStr}`;
    
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(p);
  });

  let duplicateGroups = 0;
  let duplicateRecords = 0;

  for (const [key, items] of map.entries()) {
    if (items.length > 1) {
      duplicateGroups++;
      duplicateRecords += items.length;
      // console.log(`Duplicate Group (${key}): ${items.length} items`);
      // items.forEach(i => console.log(`  - ID: ${i.id}, Legacy: ${i.legacy_proposal_no}`));
    }
  }

  console.log(`Found ${duplicateGroups} groups with content duplicates.`);
  console.log(`Total records involved: ${duplicateRecords}`);
  console.log(`Excess records (candidates for deletion): ${duplicateRecords - duplicateGroups}`);
}

main();

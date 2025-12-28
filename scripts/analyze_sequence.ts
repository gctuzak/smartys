
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Analyzing proposal_no sequence...");

  // Fetch all proposal_no and legacy_proposal_no
  let allProposals: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('proposals')
      .select('proposal_no, legacy_proposal_no, created_at')
      .order('proposal_no', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching:", error);
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

  if (allProposals.length === 0) {
    console.log("No proposals found.");
    return;
  }

  // Extract numbers
  const proposalNos = allProposals.map(p => p.proposal_no).filter(n => n !== null).sort((a, b) => a - b);
  
  const minNo = proposalNos[0];
  const maxNo = proposalNos[proposalNos.length - 1];
  const totalCount = proposalNos.length;
  const range = maxNo - minNo + 1;
  const gaps = range - totalCount;

  console.log(`\n--- Statistics ---`);
  console.log(`Total Count: ${totalCount}`);
  console.log(`Min proposal_no: ${minNo}`);
  console.log(`Max proposal_no: ${maxNo}`);
  console.log(`Range size: ${range}`);
  console.log(`Missing numbers (Gaps): ${gaps}`);

  // Legacy vs New comparison (Sample)
  console.log(`\n--- Sample Comparison (First 5) ---`);
  allProposals.slice(0, 5).forEach(p => {
    console.log(`Proposal No: ${p.proposal_no} | Legacy No: ${p.legacy_proposal_no} | Created: ${p.created_at}`);
  });

  console.log(`\n--- Sample Comparison (Last 5) ---`);
  allProposals.slice(-5).forEach(p => {
    console.log(`Proposal No: ${p.proposal_no} | Legacy No: ${p.legacy_proposal_no} | Created: ${p.created_at}`);
  });

  // Check if legacy_proposal_no is generally consistent
  const legacyIsNumeric = allProposals.every(p => !p.legacy_proposal_no || !isNaN(Number(p.legacy_proposal_no)));
  if (legacyIsNumeric) {
      const legacyNos = allProposals.map(p => Number(p.legacy_proposal_no)).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (legacyNos.length > 0) {
          console.log(`\n--- Legacy Numbers ---`);
          console.log(`Min Legacy: ${legacyNos[0]}`);
          console.log(`Max Legacy: ${legacyNos[legacyNos.length - 1]}`);
      }
  }

}

main();

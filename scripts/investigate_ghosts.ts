
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Investigating 'ghost' or empty records...");

  // 1. Check for proposal_no < 2750
  const { count: lowCount, error: lowError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .lt('proposal_no', 2750);

  console.log(`Proposals with proposal_no < 2750: ${lowCount}`);

  // 2. Check for null proposal_no
  const { count: nullCount, error: nullError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .is('proposal_no', null);

  console.log(`Proposals with NULL proposal_no: ${nullCount}`);

  // 3. Check for "empty" records (missing critical info)
  const { data: emptyCandidates, error: emptyError } = await supabase
    .from('proposals')
    .select('id, proposal_no, company_id, total_amount, status, created_at')
    .is('company_id', null)
    .is('total_amount', null);
    
  if (emptyCandidates && emptyCandidates.length > 0) {
      console.log(`Found ${emptyCandidates.length} potentially empty records (No Company AND No Amount):`);
      emptyCandidates.forEach(p => console.log(` - ID: ${p.id}, No: ${p.proposal_no}, Status: ${p.status}`));
  } else {
      console.log("No 'empty' records found (records with null company AND null amount).");
  }

  // 4. Check sequence current value (if possible via SQL, but client can't directly. We infer from max)
  const { data: maxData } = await supabase
    .from('proposals')
    .select('proposal_no')
    .order('proposal_no', { ascending: false })
    .limit(1);
    
  const maxNo = maxData?.[0]?.proposal_no;
  console.log(`Current Maximum proposal_no: ${maxNo}`);

}

main();

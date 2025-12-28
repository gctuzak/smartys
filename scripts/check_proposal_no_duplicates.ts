
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking duplicates by proposal_no...");

  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, proposal_no');

  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  const map = new Map<number, any[]>();
  proposals.forEach(p => {
    if (!map.has(p.proposal_no)) map.set(p.proposal_no, []);
    map.get(p.proposal_no)?.push(p);
  });

  let duplicates = 0;
  for (const [no, items] of map.entries()) {
    if (items.length > 1) {
      duplicates++;
      console.log(`Duplicate proposal_no: ${no} (Count: ${items.length})`);
    }
  }

  console.log(`Total duplicate proposal_no groups: ${duplicates}`);
}

main();


import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystem() {
  console.log("--- SYSTEM STATUS CHECK ---");

  // 1. Check Connection & Tables
  const tables = ['users', 'companies', 'persons', 'proposals', 'orders', 'activities'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error checking ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} records`);
    }
  }

  // 2. Check Users Detail
  console.log("\n--- USERS DETAIL ---");
  const { data: users, error: userError } = await supabase.from('users').select('id, email, first_name, last_name, role');
  if (userError) {
    console.error("Error fetching users:", userError);
  } else {
    console.table(users);
  }

  // 3. Check Proposals Representative IDs
  console.log("\n--- PROPOSAL OWNERSHIP SAMPLE ---");
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, proposal_no, companies(representative_id)')
    .limit(5);
  
  if (proposals) {
     proposals.forEach(p => {
        // @ts-ignore
        const repId = p.companies?.representative_id;
        console.log(`Proposal ${p.proposal_no}: Company Owner ID = ${repId}`);
     });
  }

  // 4. Check for Orphaned Companies
  console.log("\n--- ORPHANED COMPANIES CHECK ---");
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, representative_id');
  
  if (companies) {
      const userIds = new Set(users?.map(u => u.id) || []);
      const orphans = companies.filter(c => c.representative_id && !userIds.has(c.representative_id));
      
      console.log(`Total Companies: ${companies.length}`);
      console.log(`Orphaned Companies: ${orphans.length}`);
      
      if (orphans.length > 0) {
          console.log("First 5 Orphans:", orphans.slice(0, 5));
          const orphanRepIds = new Set(orphans.map(c => c.representative_id));
          console.log("Orphan Representative IDs:", Array.from(orphanRepIds));
      }
  }

  console.log("\n--- DONE ---");
}

checkSystem();

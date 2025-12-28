
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCodes() {
  console.log("Starting code fix...");

  // --- PERSONS ---
  console.log("\n--- Fixing Persons ---");
  
  // 1. Get all persons
  const { data: persons, error: pError } = await supabase
    .from("persons")
    .select("id, code")
    .order("created_at", { ascending: true }); // Oldest first to keep stability

  if (pError) {
    console.error("Error fetching persons:", pError);
    return;
  }

  // 2. Find max K number
  let maxK = 0;
  const validKCodes = new Set<string>();

  persons.forEach(p => {
    if (p.code && p.code.startsWith('K')) {
      const numStr = p.code.replace(/[^0-9]/g, '');
      const num = parseInt(numStr);
      if (!isNaN(num)) {
        if (num > maxK) maxK = num;
        validKCodes.add(p.code);
      }
    }
  });

  console.log(`Current max K number: ${maxK}`);

  // 3. Update invalid codes
  for (const p of persons) {
    const isInvalid = !p.code || !p.code.startsWith('K') || p.code.startsWith('P-');
    
    if (isInvalid) {
      maxK++;
      const newCode = `K${maxK}`;
      console.log(`Updating Person ${p.id}: ${p.code} -> ${newCode}`);
      
      const { error: updateError } = await supabase
        .from("persons")
        .update({ code: newCode })
        .eq("id", p.id);
        
      if (updateError) {
        console.error(`Failed to update person ${p.id}:`, updateError);
      }
    }
  }

  // --- COMPANIES ---
  console.log("\n--- Fixing Companies ---");

  // 1. Get all companies
  const { data: companies, error: cError } = await supabase
    .from("companies")
    .select("id, code")
    .order("created_at", { ascending: true });

  if (cError) {
    console.error("Error fetching companies:", cError);
    return;
  }

  // 2. Find max O number
  let maxO = 0;
  companies.forEach(c => {
    if (c.code && c.code.startsWith('O')) {
      const numStr = c.code.replace(/[^0-9]/g, '');
      const num = parseInt(numStr);
      if (!isNaN(num) && num > maxO) {
        maxO = num;
      }
    }
  });

  console.log(`Current max O number: ${maxO}`);

  // 3. Update invalid codes
  for (const c of companies) {
    const isInvalid = !c.code || !c.code.startsWith('O');
    
    if (isInvalid) {
      maxO++;
      const newCode = `O${maxO}`;
      console.log(`Updating Company ${c.id}: ${c.code} -> ${newCode}`);
      
      const { error: updateError } = await supabase
        .from("companies")
        .update({ code: newCode })
        .eq("id", c.id);
        
      if (updateError) {
        console.error(`Failed to update company ${c.id}:`, updateError);
      }
    }
  }

  console.log("\nDone!");
}

fixCodes();

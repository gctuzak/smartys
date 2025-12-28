
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

async function inspectBadCompanies() {
  console.log("Searching for suspicious companies...");

  // 1. Check for name 'Bay' or 'Bayan'
  const { data: nameBay, error: err1 } = await supabase
    .from('companies')
    .select('id, code, name, type')
    .or('name.eq.Bay,name.eq.Bayan,name.eq.bay,name.eq.bayan');

  if (err1) console.error("Error checking names:", err1);
  else console.log(`Companies named 'Bay'/'Bayan': ${nameBay?.length}`);
  if (nameBay?.length) console.log(nameBay.slice(0, 5));

  // 2. Check for long codes (potential UUIDs leaking into code)
  // Since we can't easily check length in filter, we fetch codes that don't start with 'O' and 'K' (though companies should be 'O')
  // Or just fetch all and check in JS for length > 20
  
  const { data: allCompanies, error: err2 } = await supabase
    .from('companies')
    .select('id, code, name')
    .not('code', 'ilike', 'O-%') // Not starting with O-
    .not('code', 'ilike', 'o-%');

  if (err2) console.error("Error checking codes:", err2);
  else {
    const suspiciousCodes = allCompanies?.filter(c => c.code && c.code.length > 20);
    console.log(`Companies with suspicious long codes: ${suspiciousCodes?.length}`);
    if (suspiciousCodes?.length) console.log(suspiciousCodes.slice(0, 5));
  }
}

inspectBadCompanies();

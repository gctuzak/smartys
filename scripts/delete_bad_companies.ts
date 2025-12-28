
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

async function deleteBadCompanies() {
  console.log("Deleting bad companies...");

  // Delete where name is 'Bay' or 'Bayan'
  const { data, error } = await supabase
    .from('companies')
    .delete()
    .or('name.eq.Bay,name.eq.Bayan')
    .select();

  if (error) {
    console.error("Error deleting:", error);
  } else {
    console.log(`Deleted ${data?.length} bad records.`);
    data?.forEach(d => console.log(`  Deleted: ${d.name} (${d.code})`));
  }
}

deleteBadCompanies();

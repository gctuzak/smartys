
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

async function checkCodes() {
  const { data, error } = await supabase
    .from('companies')
    .select('code, name')
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Sample Company Codes:");
  data?.forEach(c => {
    console.log(`${c.code} - ${c.name}`);
  });
}

checkCodes();


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

function normalizeName(first: any, last: any): string {
  const full = `${first || ''} ${last || ''}`;
  return full
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

async function inspect() {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .or('code.eq.P1058,code.eq.K307');

  if (error) {
    console.error(error);
    return;
  }

  console.log("Found records:", data?.length);
  data?.forEach(p => {
    console.log(`Code: ${p.code}`);
    console.log(`Name: ${p.first_name} ${p.last_name}`);
    console.log(`Normalized: ${normalizeName(p.first_name, p.last_name)}`);
    console.log('---');
  });
}

inspect();

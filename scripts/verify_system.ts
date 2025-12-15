
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySystem() {
  console.log('--- Verifying System ---');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  try {
    // 1. Check Persons Count
    const { count, error: countError } = await supabase
      .from('persons')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting persons:', countError);
    } else {
      console.log(`Total Persons: ${count}`);
    }

    // 2. Check Highest IDs (Code)
    const { data: maxCodePersons, error: maxCodeError } = await supabase
      .from('persons')
      .select('code, first_name, last_name')
      .order('code', { ascending: false })
      .limit(5);

    if (maxCodeError) {
      console.error('Error fetching max code persons:', maxCodeError);
    } else {
      console.log('\nTop 5 Persons by Code (Desc):');
      maxCodePersons.forEach(p => console.log(`- ${p.code}: ${p.first_name} ${p.last_name}`));
    }

    // 3. Check Most Recently Created
    const { data: recentPersons, error: recentError } = await supabase
      .from('persons')
      .select('code, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Error fetching recent persons:', recentError);
    } else {
      console.log('\nTop 5 Persons by Created At (Desc):');
      recentPersons.forEach(p => console.log(`- ${p.code}: ${p.first_name} ${p.last_name} (${p.created_at})`));
    }
    
     // 4. Check First Name Sort (Default in UI)
    const { data: namePersons, error: nameError } = await supabase
      .from('persons')
      .select('code, first_name, last_name')
      .order('first_name', { ascending: true })
      .limit(5);

    if (nameError) {
      console.error('Error fetching name persons:', nameError);
    } else {
      console.log('\nTop 5 Persons by First Name (Asc - UI Default):');
      namePersons.forEach(p => console.log(`- ${p.code}: ${p.first_name} ${p.last_name}`));
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifySystem();

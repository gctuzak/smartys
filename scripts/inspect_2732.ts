
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect2732() {
  // Get proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('proposal_no', 2732)
    .single();

  if (error) {
    console.error('Error fetching proposal 2732:', error);
    return;
  }
  console.log('Proposal 2732:', proposal);

  // Search for "Gülsen Kalan" in companies and persons
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%Gülsen Kalan%');
    
  console.log('Companies matching "Gülsen Kalan":', companies);

  const { data: persons } = await supabase
    .from('persons')
    .select('id, first_name, last_name')
    .or('first_name.ilike.%Gülsen%,last_name.ilike.%Kalan%');

  console.log('Persons matching "Gülsen Kalan":', persons);
}

inspect2732();

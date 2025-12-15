
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect2733() {
  // Get proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, company:companies(*), person:persons(*)')
    .eq('proposal_no', 2733)
    .single();

  if (error) {
    console.error('Error fetching proposal 2733:', error);
  } else {
    console.log('Proposal 2733:', JSON.stringify(proposal, null, 2));
  }

  // Search for Person "Yücel Dilek"
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .or('first_name.ilike.%Yücel%,last_name.ilike.%Dilek%');
    
  console.log('Persons matching "Yücel Dilek":', persons);
  
  // Search for Company "ETS TUR"
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', '%ETS%');

  console.log('Companies matching "ETS":', companies);
}

inspect2733();

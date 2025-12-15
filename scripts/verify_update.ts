
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const { data, error } = await supabase
    .from('proposals')
    .select('proposal_no, total_amount, grand_total, currency, vat_amount, vat_rate')
    .eq('proposal_no', 2733)
    .single();

  if (error) {
    console.error('Error fetching proposal 2733:', error);
  } else {
    console.log('Proposal 2733:', data);
  }

  // Check another one, e.g. 2667
  const { data: data2 } = await supabase
    .from('proposals')
    .select('proposal_no, total_amount, grand_total, currency')
    .eq('proposal_no', 2667)
    .single();
    
  console.log('Proposal 2667:', data2);
}

verify();

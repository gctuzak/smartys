import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRole() {
  console.log('Searching for user: Funda Varlı Tuzak...');

  // Search by first name and last name combo or similar
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .ilike('first_name', '%Funda%')
    .ilike('last_name', '%Tuzak%');

  if (error) {
    console.error('Error searching user:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.error('User not found!');
    return;
  }

  console.log('Found users:', users);

  const targetUser = users[0]; // Assuming first match is correct, or check specific one
  console.log(`Updating role for ${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}) to 'finance'...`);

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'finance' })
    .eq('id', targetUser.id);

  if (updateError) {
    console.error('Error updating role:', updateError);
  } else {
    console.log('Successfully updated role to finance.');
  }
}

updateRole();

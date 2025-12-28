import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// MUST use Service Role Key to access auth.users
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
    console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Cannot access auth users.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserIdMismatch() {
  console.log("--- Checking User ID Mismatch (Auth vs Public) ---");

  // 1. Get Auth Users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching auth users:", authError);
    return;
  }

  console.log(`Found ${authUsers.length} Auth Users.`);

  // 2. Get Public Users
  const { data: publicUsers, error: publicError } = await supabase
    .from("users")
    .select("*");

  if (publicError) {
    console.error("Error fetching public users:", publicError);
    return;
  }

  console.log(`Found ${publicUsers?.length} Public Users.`);

  // 3. Compare
  console.log("\nComparison (by Email):");
  
  const mismatchMap: Record<string, { authId: string, publicId: string, email: string }> = {};

  authUsers.forEach(authUser => {
    const email = authUser.email;
    const publicUser = publicUsers?.find(p => p.email?.toLowerCase() === email?.toLowerCase());

    if (publicUser) {
      if (authUser.id !== publicUser.id) {
        console.log(`[MISMATCH] ${email}`);
        console.log(`  Auth ID:   ${authUser.id}`);
        console.log(`  Public ID: ${publicUser.id}`);
        mismatchMap[publicUser.id] = {
            authId: authUser.id,
            publicId: publicUser.id,
            email: email!
        };
      } else {
        console.log(`[MATCH]    ${email}`);
      }
    } else {
      console.log(`[MISSING]  ${email} (Exists in Auth, missing in Public DB)`);
    }
  });
  
  // Also check public users that don't have auth
  publicUsers?.forEach(p => {
      const authUser = authUsers.find(a => a.email?.toLowerCase() === p.email?.toLowerCase());
      if (!authUser) {
          console.log(`[ORPHAN]   ${p.email} (Exists in Public DB, missing in Auth)`);
      }
  });

  return mismatchMap;
}

checkUserIdMismatch();

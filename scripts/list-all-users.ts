
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log("Fetching users...");
  const { data: users, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role");

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  console.log(`Found ${users.length} users:`);
  users.forEach((u) => {
    console.log(`- ${u.first_name} ${u.last_name} (${u.email}) [${u.role}]`);
  });
}

listUsers();

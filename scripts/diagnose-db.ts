
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", supabaseUrl ? "Set" : "Missing");
console.log("Anon Key:", supabaseKey ? "Set" : "Missing");
console.log("Service Role Key:", serviceRoleKey ? "Set" : "Missing");

async function check() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    return;
  }

  const anonClient = createClient(supabaseUrl, supabaseKey);
  
  console.log("--- Checking Anon Client ---");
  const { count: countAnon, error: errAnon } = await anonClient
    .from("proposals")
    .select("*", { count: "exact", head: true });
    
  console.log("Anon Proposals Count:", countAnon, "Error:", errAnon?.message);

  const { count: countStatuses, error: errStatuses } = await anonClient
    .from("proposal_statuses")
    .select("*", { count: "exact", head: true });
  console.log("Anon Statuses Count:", countStatuses, "Error:", errStatuses?.message);

  if (serviceRoleKey) {
    console.log("--- Checking Service Role Client ---");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { count: countAdmin, error: errAdmin } = await adminClient
        .from("proposals")
        .select("*", { count: "exact", head: true });
    console.log("Admin Proposals Count:", countAdmin, "Error:", errAdmin?.message);
  }
}

check();

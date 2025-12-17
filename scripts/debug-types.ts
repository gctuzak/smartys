
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key as service role is missing in file

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("--- Activity Types ---");
  const { data: types } = await supabase.from("activity_types").select("*");
  console.log(types);

  console.log("\n--- Recent Activities (Raw) ---");
  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, subject")
    .order("created_at", { ascending: false })
    .limit(5);
  console.log(activities);
}

main();

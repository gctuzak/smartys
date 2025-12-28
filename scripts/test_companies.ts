
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key Present:", !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompaniesQuery() {
  console.log("Testing companies query...");

  try {
    // 1. Basit sorgu
    console.log("1. Simple query (id, name)...");
    const { data: simpleData, error: simpleError } = await supabase
      .from("companies")
      .select("id, name")
      .limit(1);

    if (simpleError) {
      console.error("Simple query failed:", simpleError);
    } else {
      console.log("Simple query success:", simpleData);
    }

    // 2. İlişkili sorgu (getCompaniesAction'daki gibi)
    console.log("\n2. Relation query (with representative:users)...");
    const { data: relationData, error: relationError } = await supabase
      .from("companies")
      .select("*, representative:users(first_name, last_name)")
      .limit(1);

    if (relationError) {
      console.error("Relation query failed:", relationError);
    } else {
      console.log("Relation query success:", relationData);
    }

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

testCompaniesQuery();

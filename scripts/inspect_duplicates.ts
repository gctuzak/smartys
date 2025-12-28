
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDuplicates() {
  console.log("Searching for ACIBADEM PROJE YÖNETİMİ...");
  
  // 1. Şirketi bul
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", "%ACIBADEM PROJE YÖNETİMİ%")
    .limit(5);

  if (companyError) {
    console.error("Error finding company:", companyError);
    return;
  }

  if (!companies || companies.length === 0) {
    console.log("Company not found.");
    return;
  }

  console.log("Found companies:", companies);
  
  const companyId = companies[0].id; // İlk bulunanı al
  
  // 2. Kişileri getir
  const { data: persons, error: personsError } = await supabase
    .from("persons")
    .select("*")
    .eq("company_id", companyId);

  if (personsError) {
    console.error("Error finding persons:", personsError);
    return;
  }

  console.log(`Found ${persons?.length} persons for company ${companies[0].name}.`);
  
  // 3. Tekrarları analiz et (İsim + Soyisim bazında)
  const counts: Record<string, number> = {};
  const duplicates: Record<string, any[]> = {};

  persons?.forEach(p => {
    const key = `${p.first_name?.trim()} ${p.last_name?.trim()}`;
    counts[key] = (counts[key] || 0) + 1;
    
    if (!duplicates[key]) duplicates[key] = [];
    duplicates[key].push({ id: p.id, email: p.email1, created_at: p.created_at });
  });

  console.log("\nDuplicate Analysis:");
  Object.entries(counts).forEach(([name, count]) => {
    if (count > 1) {
      console.log(`${name}: ${count} times`);
      console.log(JSON.stringify(duplicates[name], null, 2));
    }
  });
}

inspectDuplicates();

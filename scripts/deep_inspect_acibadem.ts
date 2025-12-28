
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepInspect() {
  console.log("Deep inspection for ACIBADEM PROJE YÖNETİMİ...");
  
  // 1. Şirketleri bul
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .ilike("name", "%ACIBADEM PROJE YÖNETİMİ%");

  if (companyError) {
    console.error("Error finding companies:", companyError);
    return;
  }

  console.log(`Found ${companies?.length} companies:`);
  companies?.forEach(c => console.log(` - ${c.name} (${c.id}) Created: ${c.created_at}`));

  if (!companies || companies.length === 0) return;

  const companyIds = companies.map(c => c.id);

  // 2. Bu şirketlere bağlı kişileri getir
  const { data: persons, error: personsError } = await supabase
    .from("persons")
    .select("id, company_id, first_name, last_name, email1, created_at")
    .in("company_id", companyIds);

  if (personsError) {
    console.error("Error finding persons:", personsError);
    return;
  }

  console.log(`\nTotal persons found across these companies: ${persons?.length}`);

  // 3. Detaylı Listeleme
  console.log("\nPerson List:");
  persons?.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || "")).forEach(p => {
    console.log(` - ${p.first_name} ${p.last_name} (${p.email1 || "no-email"}) [${p.id}]`);
  });

  // 4. Mükerrerlik Analizi (Normalize edilmiş isim)
  const duplicates: Record<string, any[]> = {};
  
  persons?.forEach(p => {
    // Türkçe karakterleri ve boşlukları normalize et
    const normalized = `${p.first_name || ""} ${p.last_name || ""}`
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/\s+/g, " ")
      .trim();
      
    if (!duplicates[normalized]) duplicates[normalized] = [];
    duplicates[normalized].push(p);
  });

  console.log("\nPotential Duplicates (Normalized):");
  Object.entries(duplicates).forEach(([key, group]) => {
    if (group.length > 1) {
      console.log(`"${key}": ${group.length} records`);
    }
  });
}

deepInspect();

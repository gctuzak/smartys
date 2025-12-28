
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "") // Sadece harf ve rakam kalsın
    .trim();
}

async function aggressiveClean() {
  console.log("Starting aggressive cleanup for ACIBADEM PROJE YÖNETİMİ...");
  
  // 1. Şirketleri bul
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", "%ACIBADEM PROJE YÖNETİMİ%");

  if (companyError || !companies || companies.length === 0) {
    console.error("Company not found or error:", companyError);
    return;
  }

  const companyIds = companies.map(c => c.id);
  console.log(`Target Companies: ${companies.map(c => c.name).join(", ")}`);

  // 2. Kişileri getir
  const { data: persons, error: personsError } = await supabase
    .from("persons")
    .select("id, company_id, first_name, last_name, email1, created_at")
    .in("company_id", companyIds);

  if (personsError) {
    console.error("Error fetching persons:", personsError);
    return;
  }

  console.log(`Total persons: ${persons?.length}`);

  // 3. Normalize edilmiş isme göre grupla
  const groups: Record<string, any[]> = {};
  
  persons?.forEach(p => {
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`;
    const key = normalizeName(fullName);
    
    if (!key) return; // İsimsiz kayıtlar
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  let totalDeleted = 0;
  let totalRelinked = 0;

  // 4. Temizle
  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      // Sıralama: Email olan > En eski
      group.sort((a, b) => {
        const aHasEmail = !!a.email1;
        const bHasEmail = !!b.email1;
        
        if (aHasEmail && !bHasEmail) return -1;
        if (!aHasEmail && bHasEmail) return 1;
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const keeper = group[0];
      const duplicates = group.slice(1);
      const duplicateIds = duplicates.map(d => d.id);

      console.log(`\nCleaning ${key} (${group.length} records)`);
      console.log(`  Keep: ${keeper.first_name} ${keeper.last_name} (${keeper.id})`);
      console.log(`  Delete: ${duplicateIds.length} records`);

      // İlişkileri güncelle (Relink)
      const tables = [
        { name: "proposals", col: "person_id" },
        { name: "orders", col: "person_id" },
        { name: "activities", col: "contact_id" },
        { name: "documents", col: "person_id" }
      ];

      for (const t of tables) {
        // activities tablosunda contact_id var mı kontrol etmiştik, şemada var.
        const { count, error } = await supabase
          .from(t.name)
          .update({ [t.col]: keeper.id })
          .in(t.col, duplicateIds)
          .select("id", { count: "exact" });
        
        if (error) {
           // Tablo veya kolon yoksa hata verebilir, yoksayalım (örneğin activities contact_id)
           // console.log(`    Error relinking ${t.name}: ${error.message}`);
        } else if (count) {
          console.log(`    Relinked ${count} ${t.name}`);
          totalRelinked += count || 0;
        }
      }

      // Sil
      // Batch delete
      const batchSize = 100;
      for (let i = 0; i < duplicateIds.length; i += batchSize) {
          const batch = duplicateIds.slice(i, i + batchSize);
          const { error: delError } = await supabase
            .from("persons")
            .delete()
            .in("id", batch);
            
          if (delError) {
              console.error(`    Error deleting batch: ${delError.message}`);
          } else {
              totalDeleted += batch.length;
          }
      }
    }
  }

  console.log("\n--------------------------------");
  console.log(`Aggressive Cleanup Complete.`);
  console.log(`Deleted Persons: ${totalDeleted}`);
  console.log(`Relinked Relations: ${totalRelinked}`);
}

aggressiveClean();

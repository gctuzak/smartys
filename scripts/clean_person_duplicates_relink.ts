
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicatesWithRelinking() {
  console.log("Starting cleanup process with relinking...");

  // 1. Tüm kişileri getir
  const { data: persons, error } = await supabase
    .from("persons")
    .select("id, company_id, first_name, last_name, email1, created_at");

  if (error) {
    console.error("Error fetching persons:", error);
    return;
  }

  if (!persons || persons.length === 0) {
    console.log("No persons found.");
    return;
  }

  console.log(`Total persons found: ${persons.length}`);

  // 2. Gruplama
  const groups: Record<string, any[]> = {};
  
  persons.forEach(p => {
    // Benzersiz anahtar: CompanyID + Ad + Soyad
    const key = `${p.company_id}|${p.first_name?.trim()}|${p.last_name?.trim()}`;
    
    // Boş isimleri filtrele
    if (!p.first_name?.trim() && !p.last_name?.trim()) {
       return; 
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });

  let deletedCount = 0;
  let relinkedCount = 0;

  // 3. Tekrarları işle
  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      // Sıralama: Email olanlar ve en eski olanlar önce
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

      console.log(`Processing duplicates for: ${keeper.first_name} ${keeper.last_name}`);
      console.log(`  Keeper ID: ${keeper.id}`);
      console.log(`  Duplicate IDs (${duplicateIds.length}): ${duplicateIds.join(", ")}`);

      // A. İlişkili kayıtları güncelle (Relink)
      
      // Proposals
      const { error: propError, count: propCount } = await supabase
        .from("proposals")
        .update({ person_id: keeper.id })
        .in("person_id", duplicateIds)
        .select("id", { count: "exact" });
        
      if (propError) console.error("Error relinking proposals:", propError);
      else if (propCount) {
        console.log(`  Relinked ${propCount} proposals.`);
        relinkedCount += propCount;
      }

      // Orders
      const { error: orderError, count: orderCount } = await supabase
        .from("orders")
        .update({ person_id: keeper.id })
        .in("person_id", duplicateIds)
        .select("id", { count: "exact" });

      if (orderError) console.error("Error relinking orders:", orderError);
      else if (orderCount) {
        console.log(`  Relinked ${orderCount} orders.`);
        relinkedCount += orderCount;
      }

      // Activities (assigned_to değil, contact_id olabilir ama şemada contact_id var mı?)
      // Şemaya göre: contactId: uuid("contact_id").references(() => persons.id)
      const { error: actError, count: actCount } = await supabase
        .from("activities")
        .update({ contact_id: keeper.id })
        .in("contact_id", duplicateIds)
        .select("id", { count: "exact" });

      if (actError) console.error("Error relinking activities:", actError);
      else if (actCount) {
        console.log(`  Relinked ${actCount} activities.`);
        relinkedCount += actCount;
      }
      
      // Documents
      const { error: docError, count: docCount } = await supabase
        .from("documents")
        .update({ person_id: keeper.id })
        .in("person_id", duplicateIds)
        .select("id", { count: "exact" });

      if (docError) console.error("Error relinking documents:", docError);
      else if (docCount) {
        console.log(`  Relinked ${docCount} documents.`);
        relinkedCount += docCount;
      }

      // B. Mükerrerleri sil
      const { error: delError } = await supabase
        .from("persons")
        .delete()
        .in("id", duplicateIds);

      if (delError) {
        console.error("Error deleting duplicates:", delError);
      } else {
        console.log(`  Deleted ${duplicateIds.length} duplicate persons.`);
        deletedCount += duplicateIds.length;
      }
    }
  }
  
  // Boş kayıtları temizle (bunların ilişkili kaydı olması beklenmez ama yine de dikkatli olalım)
  // Boş kayıtların ID'lerini bul
  const invalidPersons = persons.filter(p => 
    !p.first_name?.trim() || 
    p.first_name.trim().toLowerCase() === "boş" ||
    (p.first_name.trim() === "" && p.last_name.trim() === "")
  );
  
  const invalidIds = invalidPersons.map(p => p.id);
  
  if (invalidIds.length > 0) {
      console.log(`\nFound ${invalidIds.length} invalid/empty person records.`);
      
      // Önce ilişkili kayıt var mı diye kontrol etmeye gerek yok, varsa hata verir, o zaman bakarız.
      // Ama temiz bir script için deneyelim silmeyi.
      const { error: delInvalidError } = await supabase
        .from("persons")
        .delete()
        .in("id", invalidIds);
        
      if (delInvalidError) {
          console.error("Error deleting invalid persons (some might have relations):", delInvalidError);
      } else {
          console.log(`Deleted ${invalidIds.length} invalid person records.`);
          deletedCount += invalidIds.length;
      }
  }

  console.log(`\nCleanup complete.`);
  console.log(`Total Relinked Relations: ${relinkedCount}`);
  console.log(`Total Deleted Persons: ${deletedCount}`);
}

cleanDuplicatesWithRelinking();

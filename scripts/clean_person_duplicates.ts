
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicates() {
  console.log("Starting cleanup process...");

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

  // 2. Gruplama ve analiz
  const groups: Record<string, any[]> = {};
  
  persons.forEach(p => {
    // Benzersiz anahtar: CompanyID + Ad + Soyad
    const key = `${p.company_id}|${p.first_name?.trim()}|${p.last_name?.trim()}`;
    
    // Boş isimleri filtrele (opsiyonel, ama raporda çok fazla boş vardı)
    if (!p.first_name?.trim() && !p.last_name?.trim()) {
       // Boş isimleri ayrı bir key ile toplayabiliriz veya direkt sileceğiz
       return; 
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });

  let deletedCount = 0;
  const idsToDelete: string[] = [];

  // 3. Tekrarları belirle
  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      // Sıralama stratejisi:
      // 1. E-postası dolu olanlar öncelikli
      // 2. En eski tarihli olanlar öncelikli (ilk oluşturulan)
      group.sort((a, b) => {
        const aHasEmail = !!a.email1;
        const bHasEmail = !!b.email1;
        
        if (aHasEmail && !bHasEmail) return -1; // a önce gelir (tutulur)
        if (!aHasEmail && bHasEmail) return 1;  // b önce gelir
        
        // İkisinde de email var veya yoksa tarihe bak
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // İlk eleman (index 0) tutulacak, diğerleri silinecek
      const toKeep = group[0];
      const toDelete = group.slice(1);

      console.log(`Keeping: ${toKeep.first_name} ${toKeep.last_name} (${toKeep.id}) - Email: ${toKeep.email1}`);
      
      toDelete.forEach(d => {
        idsToDelete.push(d.id);
        console.log(`  -> Marking for delete: ${d.id} (Created: ${d.created_at})`);
      });
    }
  }

  // "Boş" isimli veya tamamen boş olan kayıtları da bulup ekleyelim
  // Raporda "Boş " şeklinde geçen kayıtlar vardı.
  const invalidPersons = persons.filter(p => 
    !p.first_name?.trim() || 
    p.first_name.trim().toLowerCase() === "boş" ||
    (p.first_name.trim() === "" && p.last_name.trim() === "")
  );

  invalidPersons.forEach(p => {
    if (!idsToDelete.includes(p.id)) {
        idsToDelete.push(p.id);
        console.log(`Marking invalid person for delete: ${p.id} (Name: '${p.first_name} ${p.last_name}')`);
    }
  });

  console.log(`\nTotal records to delete: ${idsToDelete.length}`);

  if (idsToDelete.length > 0) {
    // Batch silme işlemi (Supabase bazen çoklu ID'de sınır koyabilir, 100'erli paketler halinde silelim)
    const batchSize = 100;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from("persons")
        .delete()
        .in("id", batch);
      
      if (deleteError) {
        console.error("Error deleting batch:", deleteError);
      } else {
        console.log(`Deleted batch ${i / batchSize + 1} (${batch.length} records)`);
        deletedCount += batch.length;
      }
    }
  }

  console.log(`Cleanup complete. Deleted ${deletedCount} duplicate/invalid records.`);
}

cleanDuplicates();

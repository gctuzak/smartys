import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.trim().toLocaleLowerCase("tr-TR");
}

async function cleanAllDuplicates() {
  console.log("Starting GLOBAL duplicate cleanup process...");

  // 1. Fetch all persons with pagination
  console.log("Fetching all persons...");
  let allPersons: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: persons, error } = await supabase
      .from("persons")
      .select("id, company_id, first_name, last_name, email1, created_at")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching persons:", error);
      return;
    }

    if (persons && persons.length > 0) {
      allPersons = allPersons.concat(persons);
      console.log(`Fetched ${persons.length} records (Total: ${allPersons.length})`);
      if (persons.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  if (allPersons.length === 0) {
    console.log("No persons found.");
    return;
  }

  console.log(`Total persons found: ${allPersons.length}`);

  // 2. Grouping
  const groups: Record<string, any[]> = {};
  
  allPersons.forEach(p => {
    const normFirst = normalize(p.first_name);
    const normLast = normalize(p.last_name);
    
    // Filter out completely empty names
    if (!normFirst && !normLast) {
       return; 
    }

    // Unique Key: CompanyID + Normalized FirstName + Normalized LastName
    // Handle null company_id as "null" string
    const companyKey = p.company_id ? p.company_id : "null";
    const key = `${companyKey}|${normFirst}|${normLast}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });

  let totalDeleted = 0;
  let totalRelinked = 0;
  let processedGroups = 0;
  const duplicateGroups = Object.entries(groups).filter(([_, group]) => group.length > 1);

  console.log(`Found ${duplicateGroups.length} groups with duplicates.`);

  // 3. Process Duplicates
  for (const [key, group] of duplicateGroups) {
    processedGroups++;
    
    // Sort: Prefer those with email, then oldest created_at
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

    // console.log(`[${processedGroups}/${duplicateGroups.length}] Fixing: ${keeper.first_name} ${keeper.last_name} (Company: ${keeper.company_id}) - Deleting ${duplicateIds.length} copies`);

    // A. Relink Relations
    
    // Proposals
    const { error: propError, count: propCount } = await supabase
      .from("proposals")
      .update({ person_id: keeper.id })
      .in("person_id", duplicateIds)
      .select("id", { count: "exact" });
      
    if (propError) console.error("Error relinking proposals:", propError);
    if (propCount) totalRelinked += propCount;

    // Orders
    const { error: orderError, count: orderCount } = await supabase
      .from("orders")
      .update({ person_id: keeper.id })
      .in("person_id", duplicateIds)
      .select("id", { count: "exact" });

    if (orderError) console.error("Error relinking orders:", orderError);
    if (orderCount) totalRelinked += orderCount;

    // Activities
    const { error: actError, count: actCount } = await supabase
      .from("activities")
      .update({ contact_id: keeper.id })
      .in("contact_id", duplicateIds)
      .select("id", { count: "exact" });

    if (actError) console.error("Error relinking activities:", actError);
    if (actCount) totalRelinked += actCount;
    
    // Documents
    const { error: docError, count: docCount } = await supabase
      .from("documents")
      .update({ person_id: keeper.id })
      .in("person_id", duplicateIds)
      .select("id", { count: "exact" });

    if (docError) console.error("Error relinking documents:", docError);
    if (docCount) totalRelinked += docCount;

    // B. Delete Duplicates
    const { error: delError } = await supabase
      .from("persons")
      .delete()
      .in("id", duplicateIds);

    if (delError) {
      console.error(`Error deleting duplicates for ${keeper.first_name}:`, delError);
    } else {
      totalDeleted += duplicateIds.length;
    }
  }

  console.log(`\nGlobal Cleanup Complete.`);
  console.log(`Processed Groups: ${processedGroups}`);
  console.log(`Total Relinked Relations: ${totalRelinked}`);
  console.log(`Total Deleted Persons: ${totalDeleted}`);
}

cleanAllDuplicates();

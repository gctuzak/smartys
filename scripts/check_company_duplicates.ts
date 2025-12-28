
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking Company Name duplicates...");

  let allCompanies: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, code')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) { break; }

    if (data && data.length > 0) {
      allCompanies = allCompanies.concat(data);
      if (data.length < pageSize) hasMore = false;
      page++;
    } else {
      hasMore = false;
    }
  }

  const map = new Map<string, any[]>();
  allCompanies.forEach(c => {
    const name = c.name ? c.name.trim().toLowerCase() : 'no-name';
    if (!map.has(name)) map.set(name, []);
    map.get(name)?.push(c);
  });

  let duplicates = 0;
  for (const [name, items] of map.entries()) {
    if (items.length > 1) {
      duplicates++;
      if (duplicates < 5) console.log(`Duplicate Company: "${name}" (${items.length}) - Codes: ${items.map(i => i.code).join(', ')}`);
    }
  }

  console.log(`Total Company Name duplicate groups: ${duplicates}`);
}

main();

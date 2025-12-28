import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseKey) {
    console.error("Error: Supabase Key not found. Please check .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupTable(tableName: string) {
  console.log(`Backing up ${tableName}...`);
  
  let allRows: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      return null;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      page++;
      // If we got fewer rows than requested, we are done
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allRows.length} rows from ${tableName}`);
  return allRows;
}

async function runBackup() {
  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-json-${timestamp}.json`);
  
  // List of tables to backup
  // You can fetch this dynamically or hardcode important ones
  const tables = [
    'users',
    'companies',
    'persons',
    'proposals',
    'proposal_items',
    'orders',
    'activities',
    'products',
    'faturalar',
    'fatura_kalemleri',
    'stok_hareketleri',
    'cari_hareketler',
    'documents'
  ];

  const backupData: Record<string, any[]> = {};

  for (const table of tables) {
    const rows = await backupTable(table);
    if (rows) {
      backupData[table] = rows;
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`Backup completed successfully: ${backupFile}`);
  
  // Verify size
  const stats = fs.statSync(backupFile);
  const sizeInMB = stats.size / (1024 * 1024);
  console.log(`Backup size: ${sizeInMB.toFixed(2)} MB`);
}

runBackup().catch(console.error);

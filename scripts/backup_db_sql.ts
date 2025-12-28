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

// Helper to escape SQL strings
function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  
  if (typeof val === 'object') {
    // JSON object/array
    val = JSON.stringify(val);
  }
  
  // Escape single quotes by doubling them
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function backupTableToSql(tableName: string, fileStream: fs.WriteStream) {
  console.log(`Backing up ${tableName}...`);
  
  fileStream.write(`\n-- Data for table: ${tableName} --\n`);
  
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  let totalRows = 0;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      fileStream.write(`-- Error fetching data for ${tableName}: ${error.message}\n`);
      return;
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const values = Object.values(row).map(v => escapeSql(v)).join(', ');
        const insertStmt = `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
        fileStream.write(insertStmt);
      });
      
      totalRows += data.length;
      page++;
      // If we got fewer rows than requested, we are done
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  console.log(`Wrote ${totalRows} rows for ${tableName}`);
}

async function runSqlBackup() {
  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  const fileStream = fs.createWriteStream(backupFile, { flags: 'w' });
  
  console.log(`Starting SQL backup to ${backupFile}...`);
  
  fileStream.write(`-- Database Backup (Data Only) --\n`);
  fileStream.write(`-- Timestamp: ${new Date().toISOString()} --\n\n`);
  
  // List of tables to backup in dependency order (parents first)
  const tables = [
    'users',
    'companies',
    'persons',
    'products',
    'proposals',
    'proposal_items',
    'orders',
    'activities',
    'faturalar',
    'fatura_kalemleri',
    'stok_hareketleri',
    'cari_hareketler',
    'documents'
  ];

  for (const table of tables) {
    await backupTableToSql(table, fileStream);
  }

  fileStream.end();
  
  // Wait for stream to finish
  await new Promise<void>((resolve) => {
    fileStream.on('finish', () => {
      resolve();
    });
  });

  console.log(`Backup completed successfully: ${backupFile}`);
  
  // Verify size
  const stats = fs.statSync(backupFile);
  const sizeInMB = stats.size / (1024 * 1024);
  console.log(`Backup size: ${sizeInMB.toFixed(2)} MB`);
}

runSqlBackup().catch(console.error);

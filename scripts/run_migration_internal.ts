
import { db } from '../db/index'; 
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Running migration 022 via imported db...');
  try {
    const migrationPath = path.join(process.cwd(), 'db', 'migrations', '022_delete_cari_hareket.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute raw SQL
    await db.execute(sql.raw(migrationSql));
    
    console.log('Migration 022 completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();

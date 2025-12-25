
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Running migration 022...');
  
  // Prefer DIRECT_URL for migrations if available
  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
      console.error("No DATABASE_URL or DIRECT_URL found");
      // Debug: print all env keys
      console.log("Env keys:", Object.keys(process.env));
      process.exit(1);
  } else {
      console.log("Connection string found (length: " + connectionString.length + ")");
      // Print hostname part to verify
      try {
        const u = new URL(connectionString);
        console.log("Hostname:", u.hostname);
        console.log("Port:", u.port);
        console.log("User:", u.username);
        // Do not print password
      } catch (e) {
        console.error("Invalid URL format");
      }
  }
  
  if (process.env.DIRECT_URL) {
      console.log("Using DIRECT_URL for migration...");
  } else {
      console.log("Using DATABASE_URL for migration...");
  }

  // Use the connection string as is, relying on dns.setDefaultResultOrder('ipv4first')
  // to handle IPv4 preference for the pooler URL.
  // We do NOT manually resolve IP to avoid breaking SNI.
  // We do NOT switch ports; we use whatever is provided (likely 6543 for pooler).
  
  console.log("Connecting to:", connectionString.replace(/:[^:/@]+@/, ':****@'));

  const client = postgres(connectionString, { 
    ssl: { rejectUnauthorized: false }, 
    max: 1, 
    prepare: false 
  });
  const db = drizzle(client);

  try {
    const migrationPath = path.join(process.cwd(), 'db', 'migrations', '022_delete_cari_hareket.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    await db.execute(sql.raw(migrationSql));
    
    console.log('Migration 022 completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
      await client.end();
  }
  process.exit(0);
}

main();

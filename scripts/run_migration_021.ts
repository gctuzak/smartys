
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
  console.log('Running migration 021...');
  
  // Prefer DIRECT_URL for migrations if available
  let connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
      console.error("No DATABASE_URL or DIRECT_URL found");
      process.exit(1);
  }
  
  if (process.env.DIRECT_URL) {
      console.log("Using DIRECT_URL for migration...");
  } else {
      console.log("Using DATABASE_URL for migration...");
  }

  // Resolve hostname to IPv4 to avoid EHOSTUNREACH on IPv6
  let resolvedUrl = connectionString;
  try {
      const url = new URL(connectionString);
      const hostname = url.hostname;
      console.log(`Resolving IPv4 for ${hostname}...`);
      const ipAddresses = await dns.promises.resolve4(hostname);
      if (ipAddresses && ipAddresses.length > 0) {
          console.log(`Resolved to ${ipAddresses[0]}`);
          url.hostname = ipAddresses[0];
          // Try port 5432 (Session Pooler) instead of 6543 (Transaction Pooler)
          if (url.port === '6543') {
              console.log("Switching to port 5432 (Session Pooler)...");
              url.port = '5432';
              url.searchParams.delete('pgbouncer');
              url.searchParams.delete('connection_limit');
          }
          resolvedUrl = url.toString();
      } else {
          console.warn("Could not resolve IPv4, using original hostname.");
      }
  } catch (e) {
      console.error("Failed to resolve URL hostname.", e);
  }

  const client = postgres(resolvedUrl!, { ssl: 'require', max: 1, prepare: false });
  const db = drizzle(client);

  try {
    const migrationPath = path.join(process.cwd(), 'db', 'migrations', '021_add_exchange_rates.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by statement if needed, or execute raw. 
    // Drizzle execute raw usually handles multiple statements if supported by driver, but postgres.js might prefer simple query.
    // However, CREATE OR REPLACE FUNCTION contains semicolons.
    // Let's try executing as one block.
    await db.execute(sql.raw(migrationSql));
    
    console.log('Migration 021 completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
      await client.end();
  }
  process.exit(0);
}

main();

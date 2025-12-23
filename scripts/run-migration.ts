import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const url = process.env.DATABASE_URL;
  console.log('Database URL loaded:', url ? 'Yes' : 'No');
  if (url) {
    console.log('URL starts with:', url.substring(0, 15) + '...');
  } else {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
  }

  console.log('Running migration...');
  try {
    await db.execute(sql`
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "kelvin" integer;
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "watt" numeric(10, 2);
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "lumen" integer;
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "width" numeric(10, 2);
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "length" numeric(10, 2);
      ALTER TABLE "proposal_items" ADD COLUMN IF NOT EXISTS "piece_count" integer;
    `);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

main();

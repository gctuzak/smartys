import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running migration 018...');
  try {
    await db.execute(sql`ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "revision" integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "root_proposal_id" uuid REFERENCES "proposals"("id");`);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

main();

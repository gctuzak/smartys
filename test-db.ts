import { db } from './db';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log('Connection success:', result);
  } catch (e) {
    console.error('Connection failed:', e);
  }
  process.exit(0);
}

test();

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function createFunctions() {
  console.log('Creating RPC functions...');

  try {
    // 1. get_total_orders_stats
    await sql`
      CREATE OR REPLACE FUNCTION get_total_orders_stats()
      RETURNS TABLE (count bigint, total_amount numeric) AS $$
      BEGIN
        RETURN QUERY
        SELECT count(*), COALESCE(sum(amount), 0)
        FROM orders;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('Created get_total_orders_stats');

    // 2. get_my_orders_stats
    await sql`
      CREATE OR REPLACE FUNCTION get_my_orders_stats(user_id uuid)
      RETURNS TABLE (count bigint, total_amount numeric) AS $$
      BEGIN
        RETURN QUERY
        SELECT count(o.id), COALESCE(sum(o.amount), 0)
        FROM orders o
        JOIN companies c ON o.company_id = c.id
        WHERE c.representative_id = user_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('Created get_my_orders_stats');

    console.log('Done!');
  } catch (error) {
    console.error('Error creating functions:', error);
  } finally {
    await sql.end();
  }
}

createFunctions();

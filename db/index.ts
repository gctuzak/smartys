import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix for Supabase IPv6 connection issues
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env' });
}

const connectionString = process.env.DATABASE_URL;

const isLocal =
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

const client = postgres(
  connectionString || 'postgres://postgres:postgres@localhost:5432/postgres',
  isLocal ? {} : { ssl: 'require', prepare: false }
);
export const db = drizzle(client, { schema });

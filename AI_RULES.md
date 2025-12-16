# Project Rules for Trae AI

## Database Connection & Supabase
- **IPv6/Connection Issues:** The project experiences IPv6 connection issues (EHOSTUNREACH/ENODATA) when connecting to Supabase via direct Postgres connection strings (Drizzle ORM) in some environments.
- **Solution:** For data fetching and mutations within Next.js Server Actions or API routes, **ALWAYS use the Supabase Data API client** (`@supabase/supabase-js`) instead of Drizzle ORM's direct database connection.
- **Import Pattern:** Use `import { supabase } from "@/lib/supabase";`
- **Drizzle Usage:** Drizzle ORM (`@/db/schema`) should still be used for defining the database schema and types (`$inferSelect`, `$inferInsert`), but avoid executing queries with it if connection stability is a concern.


import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("DATABASE_URL is not defined in .env.local");
    process.exit(1);
}

const client = postgres(connectionString, {
    ssl: 'require',
    prepare: false // Supabase transaction pooler fix often needs this or just simpler connection
});

async function main() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'backups', timestamp);
        
        await fs.mkdir(backupDir, { recursive: true });
        console.log(`Created backup directory: ${backupDir}`);

        // Get all public tables
        const tablesQuery = await client`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `;
        
        const tables = tablesQuery.map((t: any) => t.table_name);
        console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

        for (const table of tables) {
            console.log(`Backing up ${table}...`);
            try {
                // Use safe interpolation for table name
                const data = await client`SELECT * FROM ${client(table)}`;
                await fs.writeFile(
                    path.join(backupDir, `${table}.json`), 
                    JSON.stringify(data, null, 2)
                );
                console.log(`  Saved ${data.length} rows from ${table}`);
            } catch (err) {
                console.error(`  Failed to backup ${table}:`, err);
            }
        }
        
        console.log(`\nBackup completed successfully in: ${backupDir}`);
    } catch (error) {
        console.error("Backup failed:", error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config({ path: '.env' });

async function resolveHost(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, { family: 4 }, (err, address) => {
            if (err) reject(err);
            else resolve(address);
        });
    });
}

async function main() {
    let connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL not found in .env");
        process.exit(1);
    }

    try {
        const url = new URL(connectionString);
        const ip = await resolveHost(url.hostname);
        console.log(`Resolved ${url.hostname} to ${ip}`);
        url.hostname = ip;
        connectionString = url.toString();
    } catch (e) {
        console.warn("Could not resolve hostname to IPv4, using original URL:", e);
    }

    const sql = postgres(connectionString);

    try {
        const sqlPath = path.join(process.cwd(), 'reset_db.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing reset_db.sql...");

        // Split by statement if needed, or execute as one block if supported
        await sql.unsafe(sqlContent);

        console.log("Database reset successfully.");
    } catch (error) {
        console.error("Error resetting database:", error);
    } finally {
        await sql.end();
    }
}

main();

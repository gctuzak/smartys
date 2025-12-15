import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import * as ExcelJS from 'exceljs';
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
        // Try to resolve to IPv4 if possible (helper for some environments)
        try {
            const ip = await resolveHost(url.hostname);
            url.hostname = ip;
            connectionString = url.toString();
        } catch (e) {
            // Ignore resolution errors and use original host
        }
    } catch (e) {
        // Ignore URL parsing errors
    }

    const sql = postgres(connectionString);

    try {
        const filePath = path.join(process.cwd(), 'excel_data', 'kapsamlliliste.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error(`Excel file not found at ${filePath}`);
            process.exit(1);
        }

        console.log("Reading Excel file...");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
            console.error("No worksheet found");
            process.exit(1);
        }

        // Header row is 1. "Müşteri Temsilcisi" is the column name.
        const headerRow = worksheet.getRow(1);
        let repColIndex = -1;
        
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value === "Müşteri Temsilcisi") {
                repColIndex = colNumber;
            }
        });

        if (repColIndex === -1) {
            console.error("'Müşteri Temsilcisi' column not found in Excel");
            process.exit(1);
        }

        const reps = new Set<string>();
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            const cellValue = row.getCell(repColIndex).value;
            if (cellValue) {
                const repName = String(cellValue).trim();
                if (repName) {
                    reps.add(repName);
                }
            }
        });

        console.log(`Found ${reps.size} unique representatives.`);

        for (const repName of reps) {
            // Split name into First and Last
            const parts = repName.split(' ');
            let firstName = parts[0];
            let lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Temsilci'; // Default last name if missing

            // Generate a dummy unique email
            // Normalize: lowercase, replace spaces, remove special chars
            const normalize = (s: string) => s.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '');
            
            const email = `${normalize(firstName)}.${normalize(lastName)}@smartys.com`;

            console.log(`Processing: ${repName} -> ${email}`);

            // Check if exists
            const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
            
            if (existing.length === 0) {
                await sql`
                    INSERT INTO users (first_name, last_name, email, role)
                    VALUES (${firstName}, ${lastName}, ${email}, 'representative')
                `;
                console.log(`Created user: ${repName}`);
            } else {
                console.log(`User already exists: ${repName}`);
            }
        }

        console.log("Import completed successfully.");

    } catch (error) {
        console.error("Error importing representatives:", error);
    } finally {
        await sql.end();
    }
}

main();

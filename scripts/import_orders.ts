import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import dns from 'dns';

dotenv.config({ path: '.env' });

// Helper to resolve host (IPv4 fix)
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
        try {
            const ip = await resolveHost(url.hostname);
            console.log(`Resolved ${url.hostname} to ${ip}`);
            url.hostname = ip;
            connectionString = url.toString();
        } catch (e) {
            console.error("Resolution error:", e);
        }
    } catch (e) {
        // Ignore URL parsing errors
    }

    const sql = postgres(connectionString);

    try {
        const filePath = path.join(process.cwd(), 'excel_data', 'siparis.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error(`Excel file not found at ${filePath}`);
            process.exit(1);
        }

        console.log("Reading Excel file...");
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} rows.`);

        for (const row of data as any[]) {
            const orderNo = row['Sipariş Adı/No'] ? String(row['Sipariş Adı/No']).trim() : null;
            if (!orderNo) continue;

            const repName = row['Teklif Sorumlusu'] ? String(row['Teklif Sorumlusu']).trim() : null;
            const companyName = row['Müşteri Adı'] ? String(row['Müşteri Adı']).trim() : null;
            const personName = row['İlgili'] ? String(row['İlgili']).trim() : null;
            const proposalRef = row['Ad/Teklif Ref No'] ? String(row['Ad/Teklif Ref No']).trim() : null;
            const proposalIdRef = row[' Teklifi'] ? String(row[' Teklifi']).trim() : null;
            const amount = row['Tutar_1'] ? parseFloat(row['Tutar_1']) : null;
            const currency = row['Pr Br_1'] ? String(row['Pr Br_1']).trim() : null;
            const notes = row['Notlar'] ? String(row['Notlar']).trim() : null;
            const projectName = row['Proje Adı'] ? String(row['Proje Adı']).trim() : null;
            const excelDate = row['Son Düzenleme Tarihi'];
            
            let orderDate = new Date();
            if (typeof excelDate === 'number') {
                // Excel date to JS date
                orderDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            }

            // 1. Find/Create Representative
            let repId = null;
            if (repName) {
                // Try to find by name
                const parts = repName.split(' ');
                let firstName = parts[0];
                let lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Temsilci';
                
                // Generate email
                const normalize = (s: string) => s.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/[^a-z0-9]/g, '');
                const email = `${normalize(firstName)}.${normalize(lastName)}@smartys.com`;

                const users = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
                if (users.length > 0) {
                    repId = users[0].id;
                } else {
                    const newUser = await sql`
                        INSERT INTO users (first_name, last_name, email, role)
                        VALUES (${firstName}, ${lastName}, ${email}, 'representative')
                        RETURNING id
                    `;
                    repId = newUser[0].id;
                }
            }

            // 2. Find Company
            let companyId = null;
            if (companyName) {
                const companies = await sql`SELECT id FROM companies WHERE name ILIKE ${companyName} LIMIT 1`;
                if (companies.length > 0) {
                    companyId = companies[0].id;
                } else {
                    const newCompany = await sql`
                        INSERT INTO companies (name) VALUES (${companyName}) RETURNING id
                    `;
                    companyId = newCompany[0].id;
                }
            }

            // 3. Find Person
            let personId = null;
            if (personName && companyId) {
                // Try to find person in that company
                const persons = await sql`
                    SELECT id FROM persons 
                    WHERE company_id = ${companyId} 
                    AND (first_name || ' ' || last_name) ILIKE ${personName}
                    LIMIT 1
                `;
                if (persons.length > 0) {
                    personId = persons[0].id;
                } else {
                    // Create person
                    const parts = personName.split(' ');
                    const firstName = parts[0];
                    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
                    
                    const newPerson = await sql`
                        INSERT INTO persons (company_id, first_name, last_name)
                        VALUES (${companyId}, ${firstName}, ${lastName})
                        RETURNING id
                    `;
                    personId = newPerson[0].id;
                }
            }

            // 4. Find Proposal
            let proposalId = null;
            if (proposalRef || proposalIdRef) {
                const ref = proposalRef || proposalIdRef;
                // Try matching legacy_proposal_no OR proposal_no
                const proposals = await sql`
                    SELECT id FROM proposals 
                    WHERE legacy_proposal_no = ${ref} 
                    OR CAST(proposal_no AS TEXT) = ${ref}
                    LIMIT 1
                `;
                if (proposals.length > 0) {
                    proposalId = proposals[0].id;
                }
            }

            // 5. Insert/Update Order
            await sql`
                INSERT INTO orders (
                    order_no, 
                    proposal_id, 
                    company_id, 
                    person_id, 
                    representative_id, 
                    amount, 
                    currency, 
                    notes, 
                    project_name, 
                    order_date,
                    status
                ) VALUES (
                    ${orderNo}, 
                    ${proposalId}, 
                    ${companyId}, 
                    ${personId}, 
                    ${repId}, 
                    ${amount}, 
                    ${currency}, 
                    ${notes}, 
                    ${projectName}, 
                    ${orderDate},
                    'completed'
                )
                ON CONFLICT (order_no) DO UPDATE SET
                    proposal_id = EXCLUDED.proposal_id,
                    company_id = EXCLUDED.company_id,
                    person_id = EXCLUDED.person_id,
                    representative_id = EXCLUDED.representative_id,
                    amount = EXCLUDED.amount,
                    currency = EXCLUDED.currency,
                    notes = EXCLUDED.notes,
                    project_name = EXCLUDED.project_name,
                    order_date = EXCLUDED.order_date
            `;
            
            process.stdout.write('.');
        }

        console.log("\nImport completed.");

    } catch (error) {
        console.error("Error importing orders:", error);
    } finally {
        await sql.end();
    }
}

main();

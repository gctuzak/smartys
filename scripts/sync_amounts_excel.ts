
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = path.resolve(process.cwd(), 'excel_data/teklif3.xlsx');

async function main() {
    console.log("Starting amount sync from teklif3.xlsx...");

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    // const workbook = XLSX.readFile(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`Loaded ${data.length} rows.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of data) {
        const proposalNo = row['Ad/Teklif Ref No'];
        if (!proposalNo) continue;

        // Determine amounts
        let grandTotal = 0;
        let totalAmount = 0;
        let vatAmount = 0;
        const vatRate = 20;

        const g1 = parseFloat(String(row['Tutardis']).replace(/,/g, '.') || '0'); // KDV Dahil
        const e1 = parseFloat(String(row['Toplam']).replace(/,/g, '.') || '0');
        const c1 = parseFloat(String(row['Alt Toplam']).replace(/,/g, '.') || '0');

        if (g1 > 0) {
            grandTotal = g1;
            totalAmount = g1 / 1.20;
            vatAmount = g1 - totalAmount;
        } else if (e1 > 0) {
            grandTotal = e1; // Assuming 'Toplam' is Grand Total here? Or Subtotal?
            // Usually 'Toplam' in these sheets might be Subtotal or Grand Total.
            // Based on previous logic: "G1 (Tutardis) -> Genel Toplam".
            // If G1 empty, check E1.
            // Let's assume E1 is also Grand Total if G1 is missing, or adjust logic.
            // Actually, let's stick to the logic:
            // "G1 dolu ise Genel Toplam. Boş ise E1. Boş ise C1."
            grandTotal = e1;
            totalAmount = e1 / 1.20;
            vatAmount = e1 - totalAmount;
        } else if (c1 > 0) {
            totalAmount = c1;
            vatAmount = c1 * 0.20;
            grandTotal = totalAmount + vatAmount;
        }

        if (grandTotal === 0 && totalAmount === 0) {
            skippedCount++;
            continue;
        }

        // Currency
        let currency = row['Pr Br_2'] || row['Pr Br'] || 'TRY';
        if (currency === 'TL') currency = 'TRY';
        if (currency === '€') currency = 'EUR';
        if (currency === '$') currency = 'USD';

        // Update DB
        const { error } = await supabase
            .from('proposals')
            .update({
                total_amount: totalAmount,
                vat_amount: vatAmount,
                grand_total: grandTotal,
                currency: currency,
                vat_rate: vatRate
            })
            .eq('legacy_proposal_no', String(proposalNo));

        if (error) {
            console.error(`Error updating ${proposalNo}:`, error.message);
            errorCount++;
        } else {
            updatedCount++;
        }
        
        if (updatedCount % 100 === 0) process.stdout.write('.');
    }

    console.log(`\nSync complete.`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

main();

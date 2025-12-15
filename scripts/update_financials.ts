
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFinancials() {
  console.log('Starting financial data update...');

  const filePath = path.join(process.cwd(), 'excel_data', 'teklif3.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Use raw: false to get formatted strings? No, raw: true is better for numbers.
  const data = XLSX.utils.sheet_to_json<any>(sheet);

  console.log(`Found ${data.length} rows in Excel file.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process in chunks to avoid overwhelming the database?
  // Or just sequential for safety. sequential is safer for now.

  for (const row of data) {
    const proposalNoRaw = row['Ad/Teklif Ref No'];
    if (!proposalNoRaw) {
      // console.log('Skipping row without proposal number');
      skippedCount++;
      continue;
    }

    const proposalNo = parseInt(String(proposalNoRaw).replace(/\D/g, '')); // Remove non-digits just in case
    
    if (isNaN(proposalNo)) {
      console.warn(`Invalid proposal number: ${proposalNoRaw}`);
      skippedCount++;
      continue;
    }

    // Determine values
    let totalAmount: number | null = null;
    let grandTotal: number | null = null;
    let currency: string | null = null;
    let vatAmount: number | null = null;
    let vatRate: number | null = null;

    const tutardis = parseFloat(row['Tutardis']);
    const altToplam = parseFloat(row['Alt Toplam']);
    const toplam = parseFloat(row['Toplam']);
    
    // Currencies
    const currencyAlt = row['Pr Br'] ? String(row['Pr Br']).trim() : null;
    const currencyTutardis = row['Pr Br_2'] ? String(row['Pr Br_2']).trim() : null;

    // Logic: Tutardis Priority
    if (!isNaN(tutardis) && tutardis > 0) {
       totalAmount = tutardis;
       grandTotal = tutardis; // Assuming inclusive or 0 VAT
       currency = currencyTutardis;
       vatAmount = 0;
       vatRate = 0;
    } else if (!isNaN(altToplam)) {
       totalAmount = altToplam;
       currency = currencyAlt;
       
       if (!isNaN(toplam)) {
         grandTotal = toplam;
         vatAmount = parseFloat((toplam - altToplam).toFixed(2));
         if (altToplam > 0) {
             vatRate = Math.round((vatAmount / altToplam) * 100);
         } else {
             vatRate = 0;
         }
       } else {
         grandTotal = altToplam;
         vatAmount = 0;
         vatRate = 0;
       }
    } else {
       // console.log(`No financial data for proposal ${proposalNo}`);
       skippedCount++;
       continue;
    }

    // Default currency if missing
    if (!currency) currency = 'TL'; // Default assumption if not specified? Or leave null?
    // User didn't specify default. But 'Pr Br' is usually 'TL', 'USD', 'EUR'.

    try {
      const updateData: any = {
        total_amount: totalAmount,
        grand_total: grandTotal,
        currency: currency,
        vat_amount: vatAmount,
        vat_rate: vatRate
      };

      const { error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('proposal_no', proposalNo);

      if (error) {
        console.error(`Error updating proposal ${proposalNo}:`, error);
        errorCount++;
      } else {
        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} proposals...`);
        }
      }

    } catch (err) {
      console.error(`Exception updating proposal ${proposalNo}:`, err);
      errorCount++;
    }
  }

  console.log('Update complete.');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

updateFinancials().catch(console.error);

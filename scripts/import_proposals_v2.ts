
import { createClient } from "@supabase/supabase-js";
import * as XLSX from 'xlsx';
import fs from 'fs';
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Missing Supabase credentials. Please ensure .env exists in the project root.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/teklifaktar.xlsx';

// Excel Date to JS Date conversion
function excelDateToJSDate(serial: any) {
   if (!serial) return null;
   if (typeof serial === 'string') return new Date(serial);
   if (typeof serial === 'number') {
       var utc_days  = Math.floor(serial - 25569);
       var utc_value = utc_days * 86400;                                        
       var date_info = new Date(utc_value * 1000);
       return date_info;
   }
   return null;
}

// Map status
function mapStatus(status: any): string {
  if (!status) return "pending";
  const s = String(status).toLowerCase();
  if (s.includes("onay") || s.includes("kazan")) return "approved";
  if (s.includes("red") || s.includes("iptal") || s.includes("kayıp")) return "rejected";
  if (s.includes("bekle")) return "pending";
  if (s.includes("taslak")) return "draft";
  if (s.includes("gönder") || s.includes("verildi")) return "sent";
  return "pending";
}

// Parse amount
function parseAmount(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).replace(/[^0-9.,-]/g, '').trim();
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    }
    return parseFloat(s) || 0;
}

async function importProposals() {
  console.log("Starting proposal import...");

  if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
  }

  // 1. Read Excel
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} rows in Excel.`);

  let successCount = 0;
  let errorCount = 0;
  
  // 2. Fetch companies and persons
  console.log("Fetching existing companies and persons...");
  
  const { data: allCompanies, error: compError } = await supabase
    .from("companies")
    .select("id, name, tax_no"); 
    
  if (compError) { console.error("Error fetching companies:", compError); return; }
  
  const { data: allPersons, error: persError } = await supabase
    .from("persons")
    .select("id, first_name, last_name, tckn");
    
  if (persError) { console.error("Error fetching persons:", persError); return; }

  // Helpers for lookup
  const findCompany = (taxNo: string | null, name: string | null) => {
      if (taxNo) {
          // Check exact match on tax_no
          const c = allCompanies?.find(c => c.tax_no === taxNo);
          if (c) return c.id;
      }
      if (name) {
          const n = name.toLowerCase().trim();
          const c = allCompanies?.find(c => c.name?.toLowerCase().trim() === n);
          if (c) return c.id;
      }
      return null;
  };

  const findPerson = (tckn: string | null, name: string | null) => {
      if (tckn) {
          const p = allPersons?.find(p => p.tckn === tckn);
          if (p) return p.id;
      }
      // Name matching for persons is trickier (first+last), skip for now unless needed
      return null;
  };

  for (const row of data as any[]) {
    try {
      // --- A. RESOLVE CUSTOMER ---
      let companyId = null;
      let personId = null;
      
      const taxNo = row['Vergi No:'] ? String(row['Vergi No:']).trim() : null;
      const tckn = row['TC Kimlik No'] ? String(row['TC Kimlik No']).trim() : null;
      const customerName = row['Müşteri Adı'] ? String(row['Müşteri Adı']).trim() : null;

      if (taxNo) {
          companyId = findCompany(taxNo, null);
      }
      
      if (!companyId && tckn) {
          personId = findPerson(tckn, null);
          if (!personId) {
             // Maybe it's a sole proprietorship in companies table under tax_no?
             companyId = findCompany(tckn, null);
          }
      }
      
      if (!companyId && !personId && customerName) {
          companyId = findCompany(null, customerName);
      }
      
      // --- B. PREPARE DATA ---
      // New columns mapping
      const legacyId = row['Teklif ID'] ? String(row['Teklif ID']) : null;
      const legacyProposalNo = row['Ad/Teklif Ref No'] ? String(row['Ad/Teklif Ref No']) : null;
      const status = mapStatus(row['Teklif Son Durumu']);
      const totalAmount = parseAmount(row['Toplam'] || row['Alt Toplam'] || row['Tutar']);
      const proposalDate = excelDateToJSDate(row['Gönderim Tarihi']) || excelDateToJSDate(row['Sistem Kayıt Tarihi']) || new Date();
      const createdAt = excelDateToJSDate(row['Sistem Kayıt Tarihi']) || new Date();
      const notes = row['Teklif Notları'] ? String(row['Teklif Notları']) : null;
      const paymentTerms = row['Ödeme'] ? String(row['Ödeme']) : null;
      const currency = row['Pr Br'] || 'EUR'; // Default to TRY if missing, or maybe EUR based on schema default? Schema default is EUR. Let's trust input.

      // Duplicate Check
      // If we have legacyId, check if it exists in 'legacy_proposal_no' OR 'notes' (if schema update failed)
      // Since we don't know if schema is updated, we will rely on DB query error to fallback.
      
      // Try insert with ALL fields
      const payload: any = {
        company_id: companyId,
        person_id: personId,
        status: status,
        total_amount: totalAmount,
        grand_total: totalAmount, // Assuming total is grand total
        currency: currency,
        created_at: createdAt,
        // New fields
        legacy_proposal_no: legacyProposalNo,
        notes: notes,
        payment_terms: paymentTerms,
        proposal_date: proposalDate
      };

      // Filter undefined
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      try {
        const { error } = await supabase.from("proposals").insert(payload);
        if (error) throw error;
        successCount++;
        if (successCount % 50 === 0) console.log(`Processed ${successCount} records...`);
      } catch (insertError: any) {
        // Check if error is due to missing columns (Postgres code 42703)
        if (insertError.code === '42703') {
           // Fallback: Remove new columns and put them in notes (if notes column exists? No, notes is also new!)
           // If notes is new, we can't put them in notes.
           // We might have to drop all new columns.
           
           console.warn(`Schema mismatch (missing columns). Falling back to basic import for row ${legacyId || 'unknown'}`);
           
           const basicPayload = {
             company_id: companyId,
             person_id: personId,
             status: status,
             total_amount: totalAmount,
             grand_total: totalAmount,
             currency: currency,
             created_at: createdAt
           };
           
           // We can't save notes, payment terms, legacy no easily without the schema update.
           // Maybe append to a temporary description if we had one? We don't.
           // We just save what we can.
           
           const { error: retryError } = await supabase.from("proposals").insert(basicPayload);
           if (retryError) {
             console.error(`Failed to insert row (fallback) ${legacyId}:`, retryError.message);
             errorCount++;
           } else {
             successCount++;
           }
        } else {
           console.error(`Failed to insert row ${legacyId}:`, insertError.message);
           errorCount++;
        }
      }

    } catch (err) {
      console.error("Row processing error:", err);
      errorCount++;
    }
  }

  console.log(`\nImport completed!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

importProposals();

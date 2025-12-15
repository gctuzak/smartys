
import { createClient } from "@supabase/supabase-js";
import * as XLSX from 'xlsx';
import fs from 'fs';
import dotenv from "dotenv";
import path from "path";

// Try to load .env.local from project root
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    // Fallback to .env
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Manually set if still missing (For development environment safety)
if (!process.env.SUPABASE_URL) {
    console.warn("⚠️  SUPABASE_URL not found in env, checking next.config.ts or hardcoded values if safe (Not recommended for prod)");
    // You might want to ask user for keys if missing, but for now we error out or try standard locations
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Missing Supabase credentials. Please ensure .env.local exists in the project root.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/teklifaktar.xlsx';

// Excel Date to JS Date conversion
function excelDateToJSDate(serial: number) {
   if (!serial) return new Date();
   var utc_days  = Math.floor(serial - 25569);
   var utc_value = utc_days * 86400;                                        
   var date_info = new Date(utc_value * 1000);
   return date_info;
}

// Map status from Turkish to English/System codes
function mapStatus(status: string): string {
  if (!status) return "draft";
  const s = status.toLowerCase();
  if (s.includes("onay") || s.includes("kazan")) return "approved";
  if (s.includes("red") || s.includes("iptal") || s.includes("kayıp")) return "rejected";
  if (s.includes("bekle")) return "pending";
  if (s.includes("taslak")) return "draft";
  if (s.includes("gönder") || s.includes("verildi")) return "sent";
  return "pending"; // Default
}

async function importProposals() {
  console.log("Starting proposal import...");

  // 1. Read Excel
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} rows in Excel.`);

  // 2. Cache Representatives (Users) to minimize DB calls
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, first_name, last_name");
  
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  // Helper to find rep ID
  const findRepId = (repName: string) => {
    if (!repName) return null;
    const rep = users?.find(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(repName.toLowerCase()) ||
      repName.toLowerCase().includes(u.first_name.toLowerCase())
    );
    return rep ? rep.id : null;
  };

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const row of data as any[]) {
    try {
      // --- A. FIND CUSTOMER (COMPANY OR PERSON) ---
      let companyId = null;
      let personId = null;
      let customerFound = false;

      const taxNo = row['Vergi No:'] ? String(row['Vergi No:']).trim() : null;
      const tckn = row['TC Kimlik No'] ? String(row['TC Kimlik No']).trim() : null;
      const customerName = row['Müşteri Adı'] ? String(row['Müşteri Adı']).trim() : null;
      const contactPersonName = row['Teklif İlgili'] ? String(row['Teklif İlgili']).trim() : null;

      // 1. Try by Tax No (Highest Priority for Companies)
      if (taxNo) {
        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("tax_no", taxNo)
          .single();
        
        if (company) {
          companyId = company.id;
          customerFound = true;
        }
      }

      // 2. Try by TCKN (Highest Priority for Persons/Individual Companies)
      if (!customerFound && tckn) {
         // Check persons first
         const { data: person } = await supabase
          .from("persons")
          .select("id")
          .eq("tckn", tckn)
          .single();
         
         if (person) {
           personId = person.id;
           customerFound = true;
         } else {
           // Check companies (sometimes individuals are saved as companies)
           const { data: company } = await supabase
            .from("companies")
            .select("id")
            .eq("tax_no", tckn) // TCKN might be in tax_no field for companies
            .single();
            if (company) {
              companyId = company.id;
              customerFound = true;
            }
         }
      }

      // 3. Try by Name (Fuzzy Match)
      if (!customerFound && customerName) {
        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", customerName)
          .single(); // strict single match preferred to avoid wrong association
        
        if (company) {
          companyId = company.id;
          customerFound = true;
        } else {
             // Try "contains" if exact match fails
             const { data: companies } = await supabase
              .from("companies")
              .select("id")
              .ilike("name", `%${customerName}%`)
              .limit(1);
             
             if (companies && companies.length > 0) {
               companyId = companies[0].id;
               customerFound = true;
             }
        }
      }
      
      // 4. Try Person Name if still not found
      if (!customerFound && contactPersonName) {
         // Split name to first/last for better search? For now simple ilike
         // This is risky, so we proceed with caution or skip
         // We skip person-only search for now to avoid false positives unless user explicitly requested
      }

      if (!customerFound) {
        console.log(`❌ Customer not found for: ${customerName} (Tax: ${taxNo}). Skipping proposal.`);
        skippedCount++;
        continue;
      }

      // --- B. PREPARE PROPOSAL DATA ---
      const proposalNoStr = row['Ad/Teklif Ref No'] ? String(row['Ad/Teklif Ref No']) : null;
      // Try to parse proposal number if it's numeric, otherwise let DB auto-increment or handle it
      // Our schema has proposalNo as serial (integer). If the excel has non-numeric ref nos, we might need to store them in 'notes' or a new field.
      // Assuming 'Ad/Teklif Ref No' is numeric based on sample "2733"
      let proposalNo = parseInt(proposalNoStr || "0");
      if (isNaN(proposalNo)) proposalNo = 0; // If 0, we might want to let DB assign? But we can't force insert into serial easily without conflict.
      // Actually, if we want to KEEP the old ID, we should probably add a 'legacy_id' column or just put it in notes.
      // But the user wants to "keep proposal info".
      
      const status = mapStatus(row['Teklif Son Durumu']);
      const repId = findRepId(row['Teklif Sorumlusu']);
      const createdAt = typeof row['Sistem Kayıt Tarihi'] === 'number' 
        ? excelDateToJSDate(row['Sistem Kayıt Tarihi']) 
        : new Date();
      
      const totalAmount = parseFloat(row['Toplam'] || row['Alt Toplam'] || row['Tutar'] || "0");
      const currency = "TRY"; // Defaulting to TRY as no currency column in checked items, or check 'Pr Br'?
      // Sample data shows 'Pr Br' is null. Assuming TRY.
      
      const notes = [
        row['Teklif Notları'],
        `Legacy Ref: ${proposalNoStr}`,
        `Legacy ID: ${row['Teklif ID']}`,
        `Ödeme: ${row['Ödeme']}`
      ].filter(Boolean).join('\n');

      // --- C. INSERT/UPDATE PROPOSAL ---
      // We check if this legacy ID already exists to prevent dupes if script runs twice
      // We'll search by legacy ID inside notes since we don't have a dedicated legacy_id column
      
      const { data: existingProps } = await supabase
        .from("proposals")
        .select("id")
        .ilike("notes", `%Legacy ID: ${row['Teklif ID']}%`)
        .single();

      let currentProposalId = existingProps?.id;

      if (currentProposalId) {
        console.log(`🔄 Updating existing proposal ${row['Teklif ID']}`);
        const { error: updateError } = await supabase
            .from("proposals")
            .update({
                status,
                total_amount: totalAmount,
                grand_total: totalAmount, // Assuming total is grand total
                created_at: createdAt.toISOString(),
                company_id: companyId,
                person_id: personId,
                notes: notes,
                // representative_id: repId // Schema doesn't have representative_id on proposals table directly?
                // Checking schema... proposals -> companyId, personId. 
                // Representatives are on Company/Person level in schema. 
                // BUT wait, a proposal might have a specific sales rep? 
                // Schema check: proposals table DOES NOT have representative_id. 
                // It relies on the company/person's rep OR we need to add it if we want per-proposal rep.
                // For now, we ignore rep on proposal, or maybe we should update the company's rep if it's missing?
            })
            .eq("id", currentProposalId);
            
         if (updateError) throw updateError;
         
      } else {
        console.log(`➕ Creating new proposal ${row['Teklif ID']}`);
        const { data: newProp, error: insertError } = await supabase
            .from("proposals")
            .insert({
                status,
                total_amount: totalAmount,
                grand_total: totalAmount,
                created_at: createdAt.toISOString(),
                company_id: companyId,
                person_id: personId,
                notes: notes,
                currency: 'TRY' 
            })
            .select("id")
            .single();
            
         if (insertError) throw insertError;
         currentProposalId = newProp.id;
      }

      // --- D. INSERT PROPOSAL ITEM (SUMMARY) ---
      // First delete existing items for this proposal to avoid duplication on re-run
      await supabase.from("proposal_items").delete().eq("proposal_id", currentProposalId);

      if (totalAmount > 0) {
          const { error: itemError } = await supabase
            .from("proposal_items")
            .insert({
                proposal_id: currentProposalId,
                description: "Genel Toplam (Aktarım)",
                quantity: 1,
                unit_price: totalAmount,
                total_price: totalAmount,
                unit: "Adet"
            });
            
          if (itemError) throw itemError;
      }

      successCount++;

    } catch (err) {
      console.error(`Error processing row ${row['Teklif ID'] || '?'}:`, err);
      errorCount++;
    }
  }

  console.log(`\nImport Completed!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️ Skipped (No Customer): ${skippedCount}`);
  console.log(`❌ Error: ${errorCount}`);
}

importProposals();

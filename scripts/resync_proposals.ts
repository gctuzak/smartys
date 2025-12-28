
import { createClient } from "@supabase/supabase-js";
import * as XLSX from 'xlsx';
import fs from 'fs';
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid'; // Need uuid package

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
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

async function main() {
  console.log("Starting proposal re-sync...");

  if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
  }

  // 1. Read Excel
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];
  console.log(`Loaded ${data.length} rows from Excel.`);

  // 2. Load Companies and Persons for linking
  console.log("Loading companies and persons...");
  
  // Helper to fetch all rows
  const fetchAll = async (table: string, select: string) => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
          const { data, error } = await supabase
              .from(table)
              .select(select)
              .range(page * pageSize, (page + 1) * pageSize - 1);
              
          if (error) throw error;
          if (!data || data.length === 0) break;
          
          allData = allData.concat(data);
          if (data.length < pageSize) break;
          page++;
      }
      return allData;
  };

  const allCompanies = await fetchAll('companies', 'id, name, tax_no, code');
  const allPersons = await fetchAll('persons', 'id, tckn, code, first_name, last_name, company_id');
  
  console.log(`Loaded ${allCompanies.length} companies and ${allPersons.length} persons.`);

  // Calculate Max Codes
  let maxCompanyCode = 0;
  let maxPersonCode = 0;

  allCompanies.forEach((c: any) => {
      if (c.code && c.code.startsWith('O')) {
          const num = parseInt(c.code.substring(1));
          if (!isNaN(num) && num > maxCompanyCode) maxCompanyCode = num;
      }
  });

  allPersons.forEach((p: any) => {
      if (p.code && p.code.startsWith('K')) {
          const num = parseInt(p.code.substring(1));
          if (!isNaN(num) && num > maxPersonCode) maxPersonCode = num;
      }
  });
  
  console.log(`Max Codes - Company: O${maxCompanyCode}, Person: K${maxPersonCode}`);

  // Helper for Tax ID normalization (remove spaces, dots)
  const normalizeTaxNo = (taxNo: string | null) => {
      if (!taxNo) return null;
      // Convert to string first just in case
      return String(taxNo).replace(/[\s\.]/g, '');
  };

  // Helper for Name normalization
  const normalizeName = (name: string | null) => {
      if (!name) return null;
      return String(name).trim().toLocaleLowerCase('tr-TR');
  };

  const companyMap = new Map(); // TaxNo -> ID
  const companyNameMap = new Map(); // Name -> ID
  
  allCompanies?.forEach(c => {
      const cleanTax = normalizeTaxNo(c.tax_no);
      if (cleanTax) companyMap.set(cleanTax, c.id);
      
      const cleanName = normalizeName(c.name);
      if (cleanName) companyNameMap.set(cleanName, c.id);
  });

  const personMap = new Map(); // TCKN -> ID
  allPersons?.forEach(p => {
      // TCKN usually doesn't have spaces but let's be safe
      const cleanTckn = normalizeTaxNo(p.tckn); 
      if (cleanTckn) personMap.set(cleanTckn, p.id);
  });

  const findCompany = (taxNo: string | null, name: string | null) => {
      const cleanTax = normalizeTaxNo(taxNo);
      if (cleanTax && companyMap.has(cleanTax)) return companyMap.get(cleanTax);
      
      const cleanName = normalizeName(name);
      if (cleanName && companyNameMap.has(cleanName)) return companyNameMap.get(cleanName);
      
      return null;
  };

  const findPerson = (tckn: string | null) => {
      const cleanTckn = normalizeTaxNo(tckn);
      if (cleanTckn && personMap.has(cleanTckn)) return personMap.get(cleanTckn);
      return null;
  };

  // 3. Process each row
  console.log("Processing rows...");
  let updatedCount = 0;
  let insertedCount = 0;
  let errorCount = 0;

  for (const row of data) {
      try {
          const legacyId = row['Teklif ID'] ? String(row['Teklif ID']) : null;
          const legacyProposalNo = row['Ad/Teklif Ref No'] ? String(row['Ad/Teklif Ref No']) : null;
          
          if (!legacyProposalNo) continue;

          // Find Customer
          let companyId = null;
          let personId = null;
          
          const taxNo = row['Vergi No:'] ? String(row['Vergi No:']).trim() : null;
          const tckn = row['TC Kimlik No'] ? String(row['TC Kimlik No']).trim() : null;
          const customerName = row['Müşteri Adı'] ? String(row['Müşteri Adı']).trim() : null;
          const interestedPerson = row['Teklif İlgili'] ? String(row['Teklif İlgili']).trim() : null;

          if (taxNo) companyId = findCompany(taxNo, null);
          if (!companyId && tckn) personId = findPerson(tckn);
          if (!companyId && !personId && customerName) companyId = findCompany(null, customerName);

          // Create if missing
          if (!companyId && !personId) {
              if (taxNo) {
                  // Create Company (Tax ID present)
                  maxCompanyCode++;
                  const newCode = `O${maxCompanyCode}`;
                  const newId = uuidv4();
                  const newCompany = {
                      id: newId,
                      name: customerName || 'Bilinmeyen Firma',
                      tax_no: taxNo,
                      code: newCode,
                      type: 'Müşteri',
                      created_at: new Date().toISOString()
                  };
                  await supabase.from('companies').insert(newCompany);
                  
                  companyId = newId;
                  const cleanTax = normalizeTaxNo(taxNo);
                  if (cleanTax) companyMap.set(cleanTax, newId);
                  const cleanName = normalizeName(customerName);
                  if (cleanName) companyNameMap.set(cleanName, newId);
                  
                  console.log(`Created Company: ${newCompany.name} (${newCode})`);
              } else if (tckn) {
                  // Create Person (TCKN present)
                  maxPersonCode++;
                  const newCode = `K${maxPersonCode}`;
                  const newId = uuidv4();
                  
                  const parts = customerName ? customerName.split(' ') : ['Bilinmeyen', 'Kişi'];
                  const lastName = parts.length > 1 ? parts.pop() : 'Kişi';
                  const firstName = parts.join(' ') || 'Bilinmeyen';
                  
                  const newPerson = {
                      id: newId,
                      first_name: firstName,
                      last_name: lastName || 'Kişi',
                      tckn: tckn,
                      code: newCode,
                      created_at: new Date().toISOString()
                  };
                  await supabase.from('persons').insert(newPerson);
                  
                  personId = newId;
                  const cleanTckn = normalizeTaxNo(tckn);
                  if (cleanTckn) personMap.set(cleanTckn, newId);
                  
                  console.log(`Created Person: ${firstName} ${lastName} (${newCode})`);
              } else if (customerName) {
                   // Create Company by default (Only Name)
                  maxCompanyCode++;
                  const newCode = `O${maxCompanyCode}`;
                  const newId = uuidv4();
                  const newCompany = {
                      id: newId,
                      name: customerName,
                      code: newCode,
                      type: 'Müşteri',
                      created_at: new Date().toISOString()
                  };
                  await supabase.from('companies').insert(newCompany);
                  
                  companyId = newId;
                  const cleanName = normalizeName(customerName);
                  if (cleanName) companyNameMap.set(cleanName, newId);
                  
                  console.log(`Created Company (Name only): ${newCompany.name} (${newCode})`);
              }
          }

          // If we have a company but no person, and we have an interested person name, create the person
          if (companyId && !personId && interestedPerson) {
              maxPersonCode++;
              const newCode = `K${maxPersonCode}`;
              const newId = uuidv4();
              
              const parts = interestedPerson.split(' ');
              const lastName = parts.length > 1 ? parts.pop() : 'Kişi';
              const firstName = parts.join(' ') || 'Bilinmeyen';

              const newPerson = {
                  id: newId,
                  first_name: firstName,
                  last_name: lastName || 'Kişi',
                  company_id: companyId,
                  code: newCode,
                  created_at: new Date().toISOString()
              };
              
              await supabase.from('persons').insert(newPerson);
              personId = newId;
              
              // Add to local cache
              allPersons.push(newPerson);
              
              console.log(`Created Person from Interested: ${firstName} ${lastName} (${newCode}) for Company ${companyId}`);
          }

          // Prepare PayloadIf we have a company but no person, and we have an interested person name, create the person
          if (companyId && !personId && interestedPerson) {
              maxPersonCode++;
              const newCode = `K${maxPersonCode}`;
              const newId = uuidv4();
              
              const parts = interestedPerson.split(' ');
              const lastName = parts.length > 1 ? parts.pop() : 'Kişi';
              const firstName = parts.join(' ') || 'Bilinmeyen';

              const newPerson = {
                  id: newId,
                  first_name: firstName,
                  last_name: lastName || 'Kişi',
                  company_id: companyId,
                  code: newCode,
                  created_at: new Date().toISOString()
              };
              
              await supabase.from('persons').insert(newPerson);
              personId = newId;
              
              // Add to local cache
              allPersons.push(newPerson);
              
              console.log(`Created Person from Interested: ${firstName} ${lastName} (${newCode}) for Company ${companyId}`);
          }

          // Prepare Payload
          const status = mapStatus(row['Teklif Son Durumu']);
          const totalAmount = parseAmount(row['Toplam'] || row['Alt Toplam'] || row['Tutar']);
          const createdAt = excelDateToJSDate(row['Sistem Kayıt Tarihi']) || new Date();
          const proposalDate = excelDateToJSDate(row['Gönderim Tarihi']) || createdAt;
          const notes = row['Teklif Notları'] ? String(row['Teklif Notları']) : null;
          const paymentTerms = row['Ödeme'] ? String(row['Ödeme']) : null;
          const currency = row['Pr Br'] || 'EUR';

          // Ensure proposal_no matches legacyProposalNo (if it's numeric)
          let proposalNo = null;
          if (legacyProposalNo && !isNaN(Number(legacyProposalNo))) {
              proposalNo = Number(legacyProposalNo);
          }

          // Check if exists
          const { data: existing } = await supabase
              .from('proposals')
              .select('id')
              .eq('legacy_proposal_no', legacyProposalNo)
              .maybeSingle();

          if (existing) {
              // Update
              const { error: updateError } = await supabase
                  .from('proposals')
                  .update({
                      company_id: companyId,
                      person_id: personId,
                      status: status,
                      total_amount: totalAmount,
                      grand_total: totalAmount,
                      currency: currency,
                      created_at: createdAt,
                      proposal_date: proposalDate,
                      notes: notes,
                      payment_terms: paymentTerms,
                      proposal_no: proposalNo // Force sync proposal_no
                  })
                  .eq('id', existing.id);

              if (updateError) {
                  console.error(`Error updating ${legacyProposalNo}:`, updateError.message);
                  errorCount++;
              } else {
                  updatedCount++;
              }
          } else {
              // Insert
              const { error: insertError } = await supabase
                  .from('proposals')
                  .insert({
                      legacy_proposal_no: legacyProposalNo,
                      proposal_no: proposalNo, // Force sync proposal_no
                      company_id: companyId,
                      person_id: personId,
                      status: status,
                      total_amount: totalAmount,
                      grand_total: totalAmount,
                      currency: currency,
                      created_at: createdAt,
                      proposal_date: proposalDate,
                      notes: notes,
                      payment_terms: paymentTerms
                  });

              if (insertError) {
                  console.error(`Error inserting ${legacyProposalNo}:`, insertError.message);
                  errorCount++;
              } else {
                  insertedCount++;
              }
          }

          if ((updatedCount + insertedCount) % 100 === 0) {
              process.stdout.write('.');
          }

      } catch (err) {
          console.error("Row error:", err);
          errorCount++;
      }
  }

  console.log(`\nSync complete.`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Errors: ${errorCount}`);
  
  // Reset sequence if needed (optional, but good practice if we inserted high numbers)
  // We can't easily reset sequence via JS client without RPC. 
  // But since we manually set IDs, the sequence might be out of sync for NEW records.
  // User should be aware that next auto-ID will be MAX(id) + 1.
}

main();

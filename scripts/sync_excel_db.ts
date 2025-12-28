
import ExcelJS from 'exceljs';
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use Service Role Key for admin rights (bypass RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not found. Using ANON key, writes may fail if RLS is enabled.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to clean cell values
function clean(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// Helper to map phone type
function mapPhoneType(val: any): string | null {
  const s = clean(val);
  if (!s) return null;
  if (s.toLowerCase().includes('cep')) return 'cep';
  if (s.toLowerCase().includes('iş') || s.toLowerCase().includes('is')) return 'is';
  return 'diger';
}

function getCodeInt(code: string | null): number | null {
  if (!code) return null;
  const numStr = code.replace(/[^0-9]/g, '');
  const num = parseInt(numStr);
  return isNaN(num) ? null : num;
}

async function syncExcelToDB() {
  console.log("Starting sync...");
  
  // 1. Load Excel
  const workbook = new ExcelJS.Workbook();
  const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/kapsamlliliste.xlsx';
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    console.error("Sheet not found");
    return;
  }

  // 2. Map Headers
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value);
  });
  
  const col = (name: string) => headers.indexOf(name);
  
  console.log("Header Indices:");
  ['Kayıt ID', 'İlişki Türü', 'Kişi/Kurum Türü', 'Müşteri Adı'].forEach(h => {
      console.log(`${h}: ${col(h)}`);
  });

  // 3. Fetch existing Companies for linking
  const { data: existingCompanies } = await supabase
    .from('companies')
    .select('id, name, code');
    
  const companyMap = new Map<string, string>(); // Name -> ID
  const companyCodeMap = new Map<string, string>(); // Code -> ID
  
  if (existingCompanies) {
    existingCompanies.forEach(c => {
      if (c.name) companyMap.set(c.name.trim().toLowerCase(), c.id);
      if (c.code) companyCodeMap.set(c.code, c.id);
    });
  }

  // 4. Process Companies (O-prefix)
  console.log("Processing Companies...");
  const companiesToUpsert: any[] = [];
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    const idVal = clean(row.getCell(col('Kayıt ID')).value);
    const typeVal = clean(row.getCell(col('İlişki Türü')).value);
    const categoryVal = clean(row.getCell(col('Kişi/Kurum Türü')).value);
    
    if (rowNumber < 5) {
        console.log(`Row ${rowNumber}: ID='${idVal}', Type='${typeVal}', Cat='${categoryVal}'`);
    }

    // Identify Company
    let name = clean(row.getCell(col('Müşteri Adı')).value);
    
    // Safety checks
    const isBadName = !name || name === 'Bay' || name === 'Bayan' || name.length < 2;

    // Identify Company: ID starts with 'O' OR Type implies Company
    const isCompany = !isBadName && ((idVal && idVal.startsWith('O')) || (typeVal !== 'Kişi'));
    
    if (isCompany) {
      if (!name) return; // Skip if no name

      const code = idVal || `O-${Date.now()}-${rowNumber}`; // Fallback if missing
      
      if (code.length > 30 && !code.startsWith('O-')) {
         console.warn(`Skipping suspicious code: ${code} for ${name}`);
         return;
      }
      
      const companyData = {
        code: code,
        name: name,
        type: categoryVal,
        email1: clean(row.getCell(col('Eposta 1')).value),
        email2: clean(row.getCell(col('Eposta 2')).value),
        phone1: clean(row.getCell(col('Telefon 1')).value),
        phone1_type: mapPhoneType(row.getCell(col('Telefon Türü 1')).value),
        phone2: clean(row.getCell(col('Telefon 2')).value),
        phone2_type: mapPhoneType(row.getCell(col('Telefon Türü 2')).value),
        address: clean(row.getCell(col('Adres')).value),
        city: clean(row.getCell(col('İl')).value),
        district: clean(row.getCell(col('İlçe/Bölge')).value),
        country: clean(row.getCell(col('Ülke')).value) || 'Türkiye',
        post_code: clean(row.getCell(col('Posta Kodu')).value),
        notes: clean(row.getCell(col('Notlar')).value),
        tax_office: clean(row.getCell(col('Vergi Dairesi')).value),
        tax_no: clean(row.getCell(col('Vergi No:')).value),
        website: clean(row.getCell(col('Web Sayfası')).value),
        authorized_person: clean(row.getCell(col('Yetkili')).value),
        // representative_id: ... skip for now
      };

      companiesToUpsert.push(companyData);
    }
  });

  console.log(`Total companies found: ${companiesToUpsert.length}`);

  // Deduplicate companies by code
  const uniqueCompaniesMap = new Map();
  companiesToUpsert.forEach(c => {
    if (c.code) {
        if (uniqueCompaniesMap.has(c.code)) {
            // console.log(`Duplicate company code: ${c.code}`);
        }
        uniqueCompaniesMap.set(c.code, c);
    }
  });
  const uniqueCompanies = Array.from(uniqueCompaniesMap.values());
  console.log(`Unique companies to upsert: ${uniqueCompanies.length}`);

  if (uniqueCompanies.length > 0) {
    console.log(`Upserting ${uniqueCompanies.length} companies...`);
    
    // Upsert in chunks to be safe
    const chunkSize = 500;
    for (let i = 0; i < uniqueCompanies.length; i += chunkSize) {
      const chunk = uniqueCompanies.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('companies')
        .upsert(chunk, { onConflict: 'code' })
        .select();

      if (error) {
        console.error("Error upserting companies chunk:", error);
      } else if (data) {
        data.forEach(c => {
          if (c.name) companyMap.set(c.name.trim().toLowerCase(), c.id);
          if (c.code) companyCodeMap.set(c.code, c.id);
        });
      }
    }
    console.log("Companies upserted (chunks completed).");
  }

  // 5. Process Persons (K-prefix)
  console.log("Processing Persons...");
  const personsToUpsert: any[] = [];
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    const idVal = clean(row.getCell(col('Kayıt ID')).value);
    const typeVal = clean(row.getCell(col('İlişki Türü')).value);
    
    // Identify Person
    const isPerson = (idVal && idVal.startsWith('K')) || (typeVal === 'Kişi');
    
    if (isPerson) {
      const fullName = clean(row.getCell(col('Müşteri Adı')).value); // In sample data, Name is here
      if (!fullName) return;
      
      // Split Name
      const parts = fullName.split(' ');
      let firstName = fullName;
      let lastName = '';
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      }

      const code = idVal || `K-${Date.now()}-${rowNumber}`;
      const companyName = clean(row.getCell(col('Kişinin İşyeri')).value);
      let companyId = null;
      
      if (companyName) {
        companyId = companyMap.get(companyName.trim().toLowerCase()) || null;
      }

      const personData = {
        code: code,
        code_int: getCodeInt(code),
        first_name: firstName,
        last_name: lastName,
        company_id: companyId,
        salutation: clean(row.getCell(col('Hitap')).value),
        title: clean(row.getCell(col('İş Ünvanı/Sınıfı')).value),
        email1: clean(row.getCell(col('Eposta 1')).value),
        email2: clean(row.getCell(col('Eposta 2')).value),
        phone1: clean(row.getCell(col('Telefon 1')).value),
        phone1_type: mapPhoneType(row.getCell(col('Telefon Türü 1')).value),
        phone2: clean(row.getCell(col('Telefon 2')).value),
        phone2_type: mapPhoneType(row.getCell(col('Telefon Türü 2')).value),
        address: clean(row.getCell(col('Adres')).value),
        city: clean(row.getCell(col('İl')).value),
        district: clean(row.getCell(col('İlçe/Bölge')).value),
        country: clean(row.getCell(col('Ülke')).value) || 'Türkiye',
        post_code: clean(row.getCell(col('Posta Kodu')).value),
        notes: clean(row.getCell(col('Notlar')).value),
        tckn: clean(row.getCell(col('TC Kimlik No')).value),
        // representative_id: ... skip
      };

      personsToUpsert.push(personData);
    }
  });

  console.log(`Total persons found: ${personsToUpsert.length}`);

  // Deduplicate persons by code
  const uniquePersonsMap = new Map();
  personsToUpsert.forEach(p => {
    if (p.code) uniquePersonsMap.set(p.code, p);
  });
  const uniquePersons = Array.from(uniquePersonsMap.values());
  console.log(`Unique persons to upsert: ${uniquePersons.length}`);

  if (uniquePersons.length > 0) {
    console.log(`Upserting ${uniquePersons.length} persons...`);
    const chunkSize = 500;
    for (let i = 0; i < uniquePersons.length; i += chunkSize) {
      const chunk = uniquePersons.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('persons')
        .upsert(chunk, { onConflict: 'code' })
        .select();
        
      if (error) {
        console.error("Error upserting persons chunk:", error);
      }
    }
    console.log("Persons upserted (chunks completed).");
  }
  
  console.log("Sync complete.");
}

syncExcelToDB();

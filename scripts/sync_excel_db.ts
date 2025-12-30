import ExcelJS from 'exceljs';
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not found. Using ANON key, writes may fail if RLS is enabled.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function clean(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function mapPhoneType(val: any): string | null {
  const s = clean(val);
  if (!s) return null;
  if (s.toLowerCase().includes('cep')) return 'cep';
  if (s.toLowerCase().includes('iş') || s.toLowerCase().includes('is')) return 'is';
  return 'diger';
}

async function upsertBatch(table: string, items: any[], conflictTarget: string, updateMapCallback?: (item: any) => void) {
    if (items.length === 0) return;
    
    console.log(`Upserting ${items.length} items to ${table} (Conflict Target: ${conflictTarget})...`);
    const chunkSize = 100;
    
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from(table)
            .upsert(chunk, { onConflict: conflictTarget, ignoreDuplicates: false })
            .select();
            
        if (error) {
            console.error(`Error upserting ${table} chunk ${i}-${i+chunkSize}:`, error.message);
            // Retry one by one
            console.log("Retrying one by one...");
            for (const item of chunk) {
                const { data: sData, error: sError } = await supabase
                    .from(table)
                    .upsert(item, { onConflict: conflictTarget })
                    .select();
                if (sError) {
                    console.error(`Failed to upsert item (Code: ${item.code}):`, sError.message);
                } else if (sData && updateMapCallback) {
                    sData.forEach(updateMapCallback);
                }
            }
        } else if (data && updateMapCallback) {
            data.forEach(updateMapCallback);
        }
    }
    console.log(`${table} batch completed.`);
}

async function syncExcelToDB() {
  console.log("Starting sync...");
  
  const workbook = new ExcelJS.Workbook();
  const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/kapsamlliliste.xlsx';
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    console.error("Sheet not found");
    return;
  }

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value);
  });
  
  const col = (name: string) => headers.indexOf(name);
  
  // 3. Fetch existing Companies
  const { data: existingCompanies } = await supabase.from('companies').select('id, name, code');
  const companyMap = new Map<string, string>(); 
  const companyCodeMap = new Map<string, string>();
  
  if (existingCompanies) {
    existingCompanies.forEach(c => {
      if (c.name) companyMap.set(c.name.trim().toLowerCase(), c.id);
      if (c.code) companyCodeMap.set(c.code, c.id);
    });
  }

  // 4. Process Companies
  console.log("Processing Companies...");
  const companiesMap = new Map<string, any>();
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    const idVal = clean(row.getCell(col('Kayıt ID')).value);
    const typeVal = clean(row.getCell(col('İlişki Türü')).value);
    const categoryVal = clean(row.getCell(col('Kişi/Kurum Türü')).value);
    let name = clean(row.getCell(col('Müşteri Adı')).value);
    const isBadName = !name || name === 'Bay' || name === 'Bayan' || name.length < 2;
    const isCompany = !isBadName && ((idVal && idVal.startsWith('O')) || (typeVal !== 'Kişi'));
    
    if (isCompany && name) {
      const code = (idVal || `O-${Date.now()}-${rowNumber}`).trim();
      if (code.length > 30 && !code.startsWith('O-')) return;
      
      const companyData: any = {
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
      };
      
      const existingId = companyCodeMap.get(code);
      if (existingId) companyData.id = existingId;
      
      companiesMap.set(code, companyData);
    }
  });

  const allCompanies = Array.from(companiesMap.values());
  const companiesWithId = allCompanies.filter(c => c.id);
  const companiesWithoutId = allCompanies.filter(c => !c.id);

  const updateCompanyMap = (c: any) => {
      if (c.name) companyMap.set(c.name.trim().toLowerCase(), c.id);
      if (c.code) companyCodeMap.set(c.code, c.id);
  };

  await upsertBatch('companies', companiesWithId, 'id', updateCompanyMap);
  await upsertBatch('companies', companiesWithoutId, 'code', updateCompanyMap);

  // 5. Process Persons
  console.log("Processing Persons...");
  
  // Fetch existing Persons
  const { data: existingPersons } = await supabase.from('persons').select('id, code');
  const personCodeMap = new Map<string, string>();
  if (existingPersons) {
      existingPersons.forEach(p => {
          if (p.code) personCodeMap.set(p.code, p.id);
      });
  }

  const personsMap = new Map<string, any>();
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    const idVal = clean(row.getCell(col('Kayıt ID')).value);
    const typeVal = clean(row.getCell(col('İlişki Türü')).value);
    const isPerson = (idVal && idVal.startsWith('K')) || (typeVal === 'Kişi');
    
    if (isPerson) {
      const fullName = clean(row.getCell(col('Müşteri Adı')).value);
      if (!fullName) return;
      
      const parts = fullName.split(' ');
      let firstName = fullName;
      let lastName = '';
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      }

      const code = (idVal || `K-${Date.now()}-${rowNumber}`).trim();
      const companyName = clean(row.getCell(col('Kişinin İşyeri')).value);
      let companyId = null;
      if (companyName) {
        companyId = companyMap.get(companyName.trim().toLowerCase()) || null;
      }

      const personData: any = {
        code: code,
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
      };
      
      const existingId = personCodeMap.get(code);
      if (existingId) personData.id = existingId;

      personsMap.set(code, personData);
    }
  });

  const allPersons = Array.from(personsMap.values());
  const personsWithId = allPersons.filter(p => p.id);
  const personsWithoutId = allPersons.filter(p => !p.id);

  await upsertBatch('persons', personsWithId, 'id');
  await upsertBatch('persons', personsWithoutId, 'code');
  
  console.log("Sync complete.");
}

syncExcelToDB();

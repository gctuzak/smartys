
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '.env' });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function splitName(fullName: string): { firstName: string, lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '-' }; // Last name is required
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

async function main() {
  const filePath = path.join(process.cwd(), 'excel_data', 'kapsamlliliste.xlsx');
  console.log(`Reading file: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Headers logic
  const headers: string[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = { c: C, r: range.s.r };
    const cellRef = XLSX.utils.encode_cell(cellAddress);
    const cell = worksheet[cellRef];
    headers.push(cell ? cell.v : `UNKNOWN_${C}`);
  }

  const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: headers, range: 1, defval: null });
  console.log(`Total rows: ${data.length}`);

  const companiesData = data.filter((row: any) => row['Kayıt ID'] && row['Kayıt ID'].startsWith('O'));
  const personsData = data.filter((row: any) => row['Kayıt ID'] && row['Kayıt ID'].startsWith('K'));

  console.log(`Found ${companiesData.length} companies and ${personsData.length} persons.`);

  // 1. Insert Companies
  console.log('Inserting companies...');
  const companiesToInsert = companiesData.map((row: any) => ({
    code: row['Kayıt ID'],
    name: row['Müşteri Adı'],
    type: row['Kişi/Kurum Türü'],
    tax_no: row['Vergi No:'],
    tax_office: row['Vergi Dairesi'],
    address: row['Adres'],
    city: row['İl'],
    district: row['İlçe/Bölge'],
    country: row['Ülke'] || 'Türkiye',
    post_code: row['Posta Kodu'],
    phone1: row['Telefon 1'],
    phone1_type: row['Telefon Türü 1'] || 'cep',
    phone2: row['Telefon 2'],
    phone2_type: row['Telefon Türü 2'],
    email1: row['Eposta 1'],
    email2: row['Eposta 2'],
    website: row['Web Sayfası'],
    notes: row['Notlar'],
    authorized_person: row['Yetkili'],
    representative_id: row['Müşteri Temsilcisi'], // Assuming this ID exists in users table
  }));

  // Batch insert companies
  const BATCH_SIZE = 100;
  for (let i = 0; i < companiesToInsert.length; i += BATCH_SIZE) {
    const batch = companiesToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('companies').upsert(batch, { onConflict: 'code' });
    if (error) {
      console.error(`Error inserting companies batch ${i}:`, error);
    } else {
      console.log(`Inserted companies batch ${i} - ${i + batch.length}`);
    }
  }

  // 2. Fetch all companies to build map
  console.log('Fetching companies for mapping...');
  const allCompanies: any[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  
  while (true) {
    const { data: companiesPage, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, code')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (fetchError) {
      console.error('Error fetching companies:', fetchError);
      return;
    }
    
    if (!companiesPage || companiesPage.length === 0) break;
    
    allCompanies.push(...companiesPage);
    if (companiesPage.length < PAGE_SIZE) break;
    page++;
  }

  const companyNameToId = new Map<string, string>();
  allCompanies.forEach((c: any) => {
    if (c.name) companyNameToId.set(c.name, c.id);
  });
  console.log(`Mapped ${companyNameToId.size} companies.`);

  // 3. Insert Persons
  console.log('Inserting persons...');
  const personsToInsert = personsData.map((row: any) => {
    const { firstName, lastName } = splitName(row['Müşteri Adı']);
    const companyName = row['Kişinin İşyeri'];
    const companyId = companyNameToId.get(companyName) || null;

    return {
      code: row['Kayıt ID'],
      first_name: firstName,
      last_name: lastName,
      salutation: row['Hitap'],
      title: row['İş Ünvanı/Sınıfı'],
      company_id: companyId,
      tckn: row['TC Kimlik No'],
      email1: row['Eposta 1'],
      email2: row['Eposta 2'],
      phone1: row['Telefon 1'],
      phone1_type: row['Telefon Türü 1'] || 'cep',
      phone2: row['Telefon 2'],
      phone2_type: row['Telefon Türü 2'],
      address: row['Adres'],
      city: row['İl'],
      district: row['İlçe/Bölge'],
      country: row['Ülke'] || 'Türkiye',
      post_code: row['Posta Kodu'],
      notes: row['Notlar'],
      representative_id: row['Müşteri Temsilcisi'],
    };
  });

  // Batch insert persons
  for (let i = 0; i < personsToInsert.length; i += BATCH_SIZE) {
    const batch = personsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('persons').upsert(batch, { onConflict: 'code' });
    if (error) {
      console.error(`Error inserting persons batch ${i}:`, error);
    } else {
      console.log(`Inserted persons batch ${i} - ${i + batch.length}`);
    }
  }

  console.log('Import completed.');
}

main();

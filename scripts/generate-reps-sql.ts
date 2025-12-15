import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Read Excel file
const filePath = path.join(process.cwd(), 'excel_data', 'kapsamlliliste.xlsx');
// Use the default export if available or the named methods directly
// Depending on how xlsx is imported in ESM, sometimes it needs default
const readFile = XLSX.readFile || (XLSX as any).default.readFile;
const utils = XLSX.utils || (XLSX as any).default.utils;

const workbook = readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = utils.sheet_to_json(sheet);

// Extract unique representatives
const reps = new Set<string>();
data.forEach((row: any) => {
  const rep = row['Müşteri Temsilcisi'];
  if (rep) reps.add(String(rep).trim());
});

// Generate SQL statements
let sql = `-- Import Representatives from Excel\n\n`;

Array.from(reps).forEach((repName) => {
    const parts = repName.split(' ');
    let firstName = parts[0].replace(/'/g, "''"); // Escape single quotes
    let lastName = parts.length > 1 ? parts.slice(1).join(' ').replace(/'/g, "''") : 'Temsilci';
    
    // Generate email
    const normalize = (s: string) => s.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
    
    const email = `${normalize(firstName)}.${normalize(lastName)}@smartys.com`;
    
    sql += `INSERT INTO users (first_name, last_name, email, role)
SELECT '${firstName}', '${lastName}', '${email}', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '${email}');\n`;
});

fs.writeFileSync('import_reps.sql', sql);
console.log('import_reps.sql created successfully.');

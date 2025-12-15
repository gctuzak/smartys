
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/teklif3.xlsx';

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Get headers
const range = XLSX.utils.decode_range(sheet['!ref']!);
const headers = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
  const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
  headers.push(cell ? cell.v : undefined);
}

console.log('Headers:', JSON.stringify(headers, null, 2));

// Peek at first few rows to see data samples for critical columns
const data = XLSX.utils.sheet_to_json(sheet, { header: headers }); // Use array of headers to handle duplicates if needed? 
// Actually XLSX.utils.sheet_to_json handles duplicate headers by appending _1, _2 usually.
// Let's see how it parses naturally first.

const json = XLSX.utils.sheet_to_json(sheet);
console.log('Sample Row 1:', JSON.stringify(json[0], null, 2));
console.log('Sample Row 2:', JSON.stringify(json[1], null, 2));

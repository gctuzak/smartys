
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/teklifaktar.xlsx';

function inspectExcel() {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  console.log(`Total rows in Excel: ${data.length}`);

  const legacyNos = data.map(r => r['Ad/Teklif Ref No']).filter(x => x);
  const uniqueLegacyNos = new Set(legacyNos);

  console.log(`Total 'Ad/Teklif Ref No' values: ${legacyNos.length}`);
  console.log(`Unique 'Ad/Teklif Ref No' values: ${uniqueLegacyNos.size}`);
  
  const counts: Record<string, number> = {};
  legacyNos.forEach(x => {
    counts[x] = (counts[x] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
  console.log(`Duplicate 'Ad/Teklif Ref No' in Excel: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
      console.log("Sample duplicates in Excel:");
      duplicates.slice(0, 5).forEach(([k, v]) => console.log(`${k}: ${v} times`));
  }
}

inspectExcel();

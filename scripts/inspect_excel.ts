
import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/teklifaktar.xlsx';

function inspectExcel() {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get headers (first row)
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (cell && cell.v) headers.push(cell.v);
    }

    // Get first few rows of data to check content
    const data = XLSX.utils.sheet_to_json(sheet, { header: headers, range: 1, defval: null });
    
    console.log("Headers:", headers);
    console.log("Total Rows:", data.length);
    console.log("First 3 Rows Sample:", JSON.stringify(data.slice(0, 3), null, 2));

  } catch (error) {
    console.error("Error reading Excel file:", error);
  }
}

inspectExcel();

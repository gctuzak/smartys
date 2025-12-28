
import ExcelJS from 'exceljs';
import path from 'path';

async function analyzeExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/kapsamlliliste.xlsx';
  
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(1);

  if (!sheet) {
    console.log("Sheet not found");
    return;
  }

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value);
  });

  console.log("Headers:", headers.filter(h => h));

  const distinctTypes = new Set();
  const sampleRows: any[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber]) {
        rowData[headers[colNumber]] = cell.value;
      }
    });

    // Check "Kişi/Kurum Türü" (if it exists) or "İlişki Türü"
    // Based on previous reads, "İlişki Türü" was mentioned.
    // Let's look for type-indicating columns.
    
    // Previous analysis mentioned:
    // "Kişi/Kurum Türü"
    
    if (rowData['Kişi/Kurum Türü']) {
        distinctTypes.add(rowData['Kişi/Kurum Türü']);
    }
    
    if (sampleRows.length < 3) {
        sampleRows.push(rowData);
    }
  });

  console.log("Distinct Types:", Array.from(distinctTypes));
  console.log("Sample Rows:", JSON.stringify(sampleRows, null, 2));
}

analyzeExcel();


import ExcelJS from 'exceljs';
import path from 'path';

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data/kapsamlliliste.xlsx';
  
  try {
    await workbook.xlsx.readFile(filePath);
    
    workbook.eachSheet((sheet, id) => {
      console.log(`Sheet ${id}: ${sheet.name}`);
      
      // Read header row
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value);
      });
      console.log('Headers:', headers.filter(h => h).join(', '));

      // Search for "O" prefix or non-Person types
      console.log('\n--- Searching for Organization/Company records ---');
      let foundOrg = false;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        
        const typeCell = row.getCell(headers.indexOf('İlişki Türü') + 1);
        const idCell = row.getCell(headers.indexOf('Kayıt ID') + 1);
        const type = String(typeCell.value || '');
        const id = String(idCell.value || '');

        if (type !== 'Kişi' || id.startsWith('O')) {
          console.log(`Row ${rowNumber}: Type=${type}, ID=${id}`);
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            if (headers[colNumber]) {
              rowData[headers[colNumber]] = cell.value;
            }
          });
          console.log(JSON.stringify(rowData, null, 2));
          foundOrg = true;
          // limit to first 3 examples
          // return false; // cannot break eachRow easily in some versions, but we can flag
        }
      });
      if (!foundOrg) console.log('No Organization/Company records found in the first sheet.');
    });
  } catch (error) {
    console.error('Error reading excel:', error);
  }
}

readExcel();

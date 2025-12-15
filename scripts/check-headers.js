const ExcelJS = require('exceljs');
const path = require('path');

async function readHeaders() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(process.cwd(), 'excel_data', 'kapsamlliliste.xlsx');
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  const row = worksheet.getRow(1);
  console.log(JSON.stringify(row.values));
}

readHeaders().catch(console.error);

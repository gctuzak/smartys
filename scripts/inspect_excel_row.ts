
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

async function inspectExcelRow() {
    const filePath = path.resolve(process.cwd(), 'excel_data/teklif3.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetProposalNo = 2733;
    console.log(`Searching for Proposal No: ${targetProposalNo}`);

    const row: any = data.find((r: any) => String(r['Teklif No']) === String(targetProposalNo));

    if (row) {
        console.log('Found Row:', JSON.stringify(row, null, 2));
    } else {
        console.log('Row not found');
    }
}

inspectExcelRow();

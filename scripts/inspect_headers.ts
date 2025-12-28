
import XLSX from 'xlsx';
import path from 'path';

async function inspectHeaders() {
    const files = ['teklif3.xlsx', 'teklifaktar.xlsx', 'kapsamlliliste.xlsx', 'siparis.xlsx'];
    
    for (const file of files) {
        console.log(`\n--- Inspecting ${file} ---`);
        const filePath = path.resolve(process.cwd(), 'excel_data', file);
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);
            
            if (data.length > 0) {
                console.log('Headers:', Object.keys(data[0] as object));
                
                // Search for 2733 in any value
                const found = data.find((row: any) => Object.values(row).some(val => String(val).includes('2733')));
                if (found) {
                    console.log('Found 2733 in row:', JSON.stringify(found, null, 2));
                } else {
                    console.log('2733 NOT found in any column.');
                }
            } else {
                console.log('Empty sheet');
            }
        } catch (e) {
            console.error(`Error reading ${file}:`, e);
        }
    }
}

inspectHeaders();

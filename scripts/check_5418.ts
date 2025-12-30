
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function checkAllExcels() {
    const dirPath = '/Users/gunaycagrituzak/Desktop/smartys/smartys/excel_data';
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    for (const file of files) {
        console.log(`\n----------------------------------------`);
        console.log(`Checking file: ${file}`);
        console.log(`----------------------------------------`);
        
        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.readFile(path.join(dirPath, file));
        } catch (error) {
            console.error(`Error reading ${file}:`, error);
            continue;
        }

        workbook.worksheets.forEach(sheet => {
            const headers: string[] = [];
            sheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = String(cell.value);
            });

            let foundInSheet = false;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;

                const rowValues = row.values;
                const rowString = JSON.stringify(rowValues);
                const rowLower = rowString.toLowerCase();

                if (rowString.includes("5418")) {
                    console.log(`\n[${file} - ${sheet.name}] Found 5418 in row ${rowNumber}:`);
                    row.eachCell((cell, colNum) => {
                        console.log(`Col ${colNum} (${headers[colNum] || 'Unknown'}): ${cell.value}`);
                    });
                    foundInSheet = true;
                }

                if ((rowLower.includes("ümit") && rowLower.includes("karadeniz")) || (rowLower.includes("umit") && rowLower.includes("karadeniz"))) {
                     console.log(`\n[${file} - ${sheet.name}] Found Ümit Karadeniz match in row ${rowNumber}:`);
                     row.eachCell((cell, colNum) => {
                        console.log(`Col ${colNum} (${headers[colNum] || 'Unknown'}): ${cell.value}`);
                    });
                    foundInSheet = true;
                }
                
                if (rowLower.includes("norde")) {
                     console.log(`\n[${file} - ${sheet.name}] Found Norde match in row ${rowNumber}:`);
                     row.eachCell((cell, colNum) => {
                        console.log(`Col ${colNum} (${headers[colNum] || 'Unknown'}): ${cell.value}`);
                    });
                    foundInSheet = true;
                }
            });
            
            if (!foundInSheet) {
                // console.log(`[${file} - ${sheet.name}] No matches found.`);
            }
        });
    }
}

checkAllExcels();

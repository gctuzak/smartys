"use server";

import ExcelJS from "exceljs";
import { parseProposalText } from "@/lib/ai-parser";

export async function parseExcelAction(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("No file uploaded");
  }

  const arrayBuffer = await file.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  let fullText = "";
  
  // Iterate over first 3 sheets to catch multi-sheet proposals
  const sheetsToParse = workbook.worksheets.slice(0, 3);
  
  for (const sheet of sheetsToParse) {
      fullText += `\n--- Sheet: ${sheet.name} ---\n`;
      
      // Limit rows per sheet to avoid context overflow
      const maxRows = Math.min(sheet.rowCount, 100);
      
      for (let i = 1; i <= maxRows; i++) {
        const row = sheet.getRow(i);
        
        // Use row.values to preserve column indices
        // row.values is 1-based array (index 0 is undefined usually)
        const values = row.values;
        if (!Array.isArray(values) || values.length === 0) continue;
        
        // Check for gray background color (header/separator row)
        // We removed the aggressive filtering logic here because it was causing data rows with background colors to be skipped.
        // We will pass all content to the AI and let it decide what is data and what is noise.
        
        // Convert to string array, preserving empty cells as empty strings
        const cells = values.map(val => {
            if (val === null || val === undefined) return "";
            if (typeof val === 'object') {
                // Handle rich text or other objects
                const cellVal = val as { text?: string; result?: string | number };
                if ('text' in cellVal && typeof cellVal.text === 'string') return cellVal.text;
                if ('result' in cellVal && cellVal.result !== undefined) return String(cellVal.result);
                return JSON.stringify(val);
            }
            return String(val);
        });

        // Slice starting from index 1 because exceljs row.values[0] is typically empty/undefined
        const cleanCells = cells.slice(1);
        
        // Only add non-empty rows (at least one cell has content)
        if (cleanCells.some(c => c.trim().length > 0)) {
            fullText += `Row ${i}: | ${cleanCells.join(" | ")} |\n`;
        }
      }
  }

  // Pass raw text to AI without "smart" hints that might be wrong
  const parsedData = await parseProposalText(fullText, { forceAI: true });

  return parsedData;
}

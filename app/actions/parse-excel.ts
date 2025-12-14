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
        let isHeaderRow = false;
        
        // Check the first few cells for background color
        // Usually headers have background color on most cells
        const filledCells = row.actualCellCount;
        let grayCellCount = 0;
        
        row.eachCell((cell) => {
            const fill = cell.style.fill;
            if (fill && fill.type === 'pattern' && fill.pattern === 'solid') {
                const fgColor = fill.fgColor;
                if (fgColor && 'argb' in fgColor) {
                   // Check for gray colors (usually starts with FF and R=G=B)
                   // Example: FFD9D9D9, FFBFBFBF, etc.
                   // Simple check: if it's not white (FFFFFFFF) and has color
                   const argb = fgColor.argb;
                   if (argb && argb.length === 8 && !argb.toLowerCase().endsWith('ffffff')) {
                       // Further check for gray-ish colors if needed, but for now any non-white bg is a candidate
                       grayCellCount++;
                   }
                }
            }
        });

        // If more than 30% of cells have background color, treat as header
        if (filledCells > 0 && (grayCellCount / filledCells) > 0.3) {
            isHeaderRow = true;
        }

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
        
        // Skip gray rows if they are not column headers
        if (isHeaderRow) {
            const rowText = cleanCells.join(" ").toLowerCase();
            const headerKeywords = ["açıklama", "description", "miktar", "quantity", "adet", "birim", "unit", "fiyat", "price", "tutar", "total"];
            
            // Count how many keywords are present
            let keywordCount = 0;
            for (const kw of headerKeywords) {
                if (rowText.includes(kw)) keywordCount++;
            }
            
            // If fewer than 2 keywords found, assume it's a separator/group row and SKIP it
            if (keywordCount < 2) {
                continue;
            }
            // If it IS a header row (has keywords), we keep it so AI can map columns, 
            // but we don't mark it specially.
        }
        
        // Only add non-empty rows (at least one cell has content)
        if (cleanCells.some(c => c.trim().length > 0)) {
            // Remove the [HEADER] prefix logic completely
            fullText += `Row ${i}: | ${cleanCells.join(" | ")} |\n`;
        }
      }
  }

  // Pass raw text to AI without "smart" hints that might be wrong
  const parsedData = await parseProposalText(fullText, { forceAI: true });

  return parsedData;
}

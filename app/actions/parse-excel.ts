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
  const sheetsToParse = workbook.worksheets.slice(0, 3);
  for (const sheet of sheetsToParse) {
      fullText += `\n--- Sheet: ${sheet.name} ---\n`;
      const maxRows = Math.min(sheet.rowCount, 100);
      for (let i = 1; i <= maxRows; i++) {
        const row = sheet.getRow(i);
        const values = row.values;
        if (!Array.isArray(values) || values.length === 0) continue;
        const cells = values.map(val => {
            if (val === null || val === undefined) return "";
            if (typeof val === 'object') {
                const cellVal = val as { text?: string; result?: string | number };
                if ('text' in cellVal && typeof cellVal.text === 'string') return cellVal.text;
                if ('result' in cellVal && cellVal.result !== undefined) return String(cellVal.result);
                return JSON.stringify(val);
            }
            return String(val);
        });
        const cleanCells = cells.slice(1);
        if (cleanCells.some(c => c.trim().length > 0)) {
            fullText += `Row ${i}: | ${cleanCells.join(" | ")} |\n`;
        }
      }
  }
  const parsedData = await parseProposalText(fullText, { forceAI: true });
  return parsedData;
}

"use server";

import { PDFParse } from "pdf-parse";
import { parseProposalText } from "@/lib/ai-parser";

// Workaround for PDF.js worker in serverless environment
const setWorker = async () => {
    // @ts-ignore
    if (!global.Promise.withResolvers) {
        // @ts-ignore
        global.Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
    }
};

export async function parsePdfAction(formData: FormData) {
  await setWorker();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("No file uploaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // pdf-parse library extracts text from PDF buffer
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  
  // Pass extracted text to AI parser
  const parsedData = await parseProposalText(data.text, { forceAI: true });

  return parsedData;
}

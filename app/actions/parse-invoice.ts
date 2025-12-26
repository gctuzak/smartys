"use server";

import { parseInvoiceText, parseInvoiceImage } from "@/lib/invoice-parser";
import { convertPdfToImage } from "@/lib/pdf-converter";

export async function parseInvoiceAction(formData: FormData) {
  console.log("parseInvoiceAction started");
  // await setWorker(); // Removed, handled in pdf-converter.ts
  const file = formData.get("file") as File;

  if (!file) {
    console.error("No file uploaded");
    throw new Error("Dosya yüklenmedi");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // PDF'ten metin çıkar
  try {
    console.log("Starting PDF parsing...");
    // Use require to avoid webpack/ESM interop issues with pdf-parse
    // pdf-parse v2 exports { PDFParse } class
    const { PDFParse } = require("pdf-parse");
    
    console.log("PDF Library loaded, PDFParse class:", typeof PDFParse);

    let textContent = "";
    
    // PDFParse constructor check
    if (typeof PDFParse === 'function') {
         const parser = new PDFParse({ data: buffer });
         const data = await parser.getText();
         textContent = data.text;
    } else {
        // Fallback or old version handling if needed, but current setup seems to use class
        console.warn("PDFParse is not a function/class, trying default export if available (not implemented)");
    }

    console.log("PDF parsed successfully, text length:", textContent?.length);
    
    // Eğer metin çok kısaysa veya boşsa, resim olarak işlemeyi dene
    if (!textContent || textContent.trim().length < 20) {
        console.warn("PDF text content is empty or too short. Switching to Image Analysis...");
        
        try {
            const imageBase64 = await convertPdfToImage(buffer);
            console.log("PDF converted to image, sending to AI...");
            const aiResult = await parseInvoiceImage(imageBase64);
            
            if (!aiResult.success || !aiResult.data) {
                return { success: false, error: aiResult.error || "AI faturayı analiz edemedi (Görsel Analiz)." };
            }
            return { success: true, data: aiResult.data };

        } catch (imgError: any) {
            console.error("Image fallback failed:", imgError);
            return { success: false, error: "PDF içeriği okunamadı. Dosya resim/tarama olabilir ve görsel işleme başarısız oldu: " + imgError.message };
        }
    }

    // Metin yeterliyse normal analiz yap
    console.log("Sending text to AI parser...");
    const aiResult = await parseInvoiceText(textContent);
    console.log("AI parsing completed:", aiResult.success ? "Success" : "Failed", aiResult.error);

    if (!aiResult.success || !aiResult.data) {
        return { success: false, error: aiResult.error || "AI faturayı analiz edemedi." };
    }

    return { success: true, data: aiResult.data };
  } catch (e: any) {
    console.error("PDF Read/Parse Error:", e);
    return { success: false, error: "PDF dosyası okunamadı: " + e.message };
  }
}

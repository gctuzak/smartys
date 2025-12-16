"use server";

import { openai } from "@/lib/openai";

export async function parseItemsTextAction(text: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
       // Fallback: Assume Name | Qty | Unit | Price
       const items = text.split('\n').filter(l => l.trim()).map(line => {
           const parts = line.split(/[\t,;]/);
           return {
               description: parts[0] || "",
               quantity: parseFloat(parts[1]) || 1,
               unit: parts[2] || "Adet",
               unitPrice: parseFloat(parts[3]) || 0,
               totalPrice: 0,
               vatRate: 20
           };
       });
       return { success: true, data: items };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a data parser. The user will paste a list of items from Excel.
          Extract the items into a JSON array.
          Each item should have:
          - description (Product name)
          - quantity (number, default 1)
          - unit (e.g. Adet, m2, kg)
          - unitPrice (number, default 0)
          - totalPrice (number, optional)
          
          Detect columns intelligently.
          Common patterns:
          - Name | Qty | Unit | Unit Price | Total Price
          - Name | Qty | Unit | Total Price (In this case, assume Unit Price = Total Price / Qty)
          
          If you see a column that looks like a total amount, map it to totalPrice.
          `
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || "{ \"items\": [] }");
    
    // Normalize
    const items = (result.items || []).map((i: any) => {
        const quantity = Number(i.quantity) || 1;
        let unitPrice = Number(i.unitPrice) || 0;
        let totalPrice = Number(i.totalPrice) || 0;

        // If totalPrice is provided but unitPrice is 0 or missing, calculate unitPrice
        if (totalPrice && !unitPrice) {
            unitPrice = totalPrice / quantity;
        }
        
        // If unitPrice is provided but totalPrice is 0 or missing, calculate totalPrice
        if (unitPrice && !totalPrice) {
            totalPrice = quantity * unitPrice;
        }

        // If both are provided, trust the user's totalPrice as requested
        // (User said: "Zaten sondaki değer toplamı ben veriyorum")

        return {
            description: i.description || "Ürün",
            quantity,
            unit: i.unit || "Adet",
            unitPrice,
            totalPrice,
            vatRate: 20
        };
    });

    return {
        success: true,
        data: items
    };

  } catch (error) {
    console.error("Parse Items Error:", error);
    return { success: false, error: "Kalemler ayrıştırılamadı." };
  }
}

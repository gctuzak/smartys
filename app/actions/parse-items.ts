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
          Extract the items into a JSON array with the key "items".
          
          The source format is FIXED:
          AÇIKLAMA | KELVİN | WATT | LÜMEN | EN (cm) | BOY (cm) | ADET | MİKTAR | BİRİM | FİYAT | TUTAR
          
          Each item object MUST have these fields (use exact keys):
          - description (string, Product name)
          - quantity (number, default 1) -> MİKTAR
          - unit (string, e.g. Adet, m2, kg) -> BİRİM
          - unitPrice (number, default 0) -> FİYAT
          - totalPrice (number, optional) -> TUTAR
          - kelvin (number, optional integer) -> KELVİN
          - watt (number, optional decimal) -> WATT
          - lumen (number, optional integer) -> LÜMEN
          - width (number, optional) -> EN (cm)
          - length (number, optional) -> BOY (cm)
          - pieceCount (number, optional) -> ADET (in specs)
          
          IMPORTANT:
          - Detect empty cells and treat them as null/0.
          - Convert Turkish number formats (1.250,50) to standard (1250.50).
          
          Example JSON Output:
          {
            "items": [
              {
                "description": "Product A",
                "quantity": 10,
                "unit": "Adet",
                "unitPrice": 100,
                "totalPrice": 1000,
                "kelvin": 3000,
                "watt": 10.5,
                "lumen": 800,
                "width": 100,
                "length": 200,
                "pieceCount": 1
              }
            ]
          }
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
            description: i.description || i.Description || "Ürün",
            quantity,
            unit: i.unit || "Adet",
            unitPrice,
            totalPrice,
            vatRate: 20,
            kelvin: i.kelvin ? Math.round(Number(i.kelvin)) : undefined,
            watt: Number(i.watt) || undefined,
            lumen: i.lumen ? Math.round(Number(i.lumen)) : undefined,
            width: Number(i.width) || undefined,
            length: Number(i.length) || undefined,
            pieceCount: Number(i.pieceCount) || undefined,
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

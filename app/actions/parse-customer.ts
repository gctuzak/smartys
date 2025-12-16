"use server";

import { openai } from "@/lib/openai";

export async function parseCustomerTextAction(text: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
       // Fallback for simple tab/comma separation if no API key
       // This is a basic fallback
       const parts = text.split(/[\t,;]/).map(s => s.trim()).filter(Boolean);
       // Assuming order: Name, Company, Project, City, Phone
       return {
         success: true,
         data: {
            person_name: parts[0] || "",
            company_name: parts[1] || "",
            project_name: parts[2] || "",
            city: parts[3] || "",
            phone: parts[4] || ""
         }
       };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a data parser. The user will paste a row from Excel containing customer information. 
          The expected columns are roughly: Name Surname | Company | Project | City | Phone
          
          Extract the following fields in JSON format:
          - person_name (Ad Soyad)
          - company_name (Şirket)
          - project_name (Proje)
          - city (Şehir)
          - phone (Telefon)
          
          If a field is missing, return null or empty string.
          Phone is mandatory, try to format it nicely.
          `
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
        success: true,
        data: {
            person_name: result.person_name,
            company_name: result.company_name,
            project_name: result.project_name,
            city: result.city,
            phone: result.phone
        }
    };

  } catch (error) {
    console.error("Parse Customer Error:", error);
    return { success: false, error: "Müşteri bilgisi ayrıştırılamadı." };
  }
}

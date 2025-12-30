import { openai } from "./openai";
import { z } from "zod";

const Num = z.preprocess((v) => {
  if (typeof v === "string") {
    const s = v.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? v : n;
  }
  return v;
}, z.number());

const Int = z.preprocess((v) => {
  if (typeof v === "string") {
    const s = v.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? v : Math.round(n);
  }
  if (typeof v === "number") return Math.round(v);
  return v;
}, z.number().int());

const ProposalSchema = z.object({
  company: z.object({
    name: z.string().nullable(),
    contactInfo: z.object({
      email: z.string().nullish(),
      phone: z.string().nullish(),
      address: z.string().nullish(),
      company: z.string().nullish(),
      project: z.string().nullish(),
      city: z.string().nullish(),
    }).catchall(z.unknown()),
  }),
  person: z.object({
    name: z.string().nullable(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    title: z.string().nullish(),
  }).optional(),
  proposal: z.object({
    currency: z.string(),
    totalAmount: Num,
    items: z.array(
      z.object({
        description: z.string(),
        quantity: Num,
        unit: z.string(),
        unitPrice: Num,
        totalPrice: Num,
        kelvin: Int.optional(),
        watt: Num.optional(),
        lumen: Int.optional(),
        width: Num.optional(),
        length: Num.optional(),
        pieceCount: Int.optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
      })
    ),
  }),
});

function fallbackParse(text: string) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const companyName = null;
  for (const l of lines) {
    if (l.startsWith("SheetName:")) {
      // Do nothing, sheet name is not customer name usually
    }
  }
  // Very basic fallback
  return {
    company: { name: companyName, contactInfo: {} },
    person: undefined,
    proposal: { currency: "EUR", totalAmount: 0, items: [] }
  };
}

export async function parseProposalText(text: string, opts?: { forceAI?: boolean }) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      if (opts?.forceAI) {
        throw new Error("OPENAI_API_KEY missing");
      }
      return fallbackParse(text);
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            [
              "Uzman bir veri analistisin. Sana belirli bir formatta Excel metni verilecek.",
              "FORMAT YAPISI:",
              "1. Üst Kısım (Müşteri Bilgileri) - İlk 7-8 satır:",
              "   - Adı Soyadı | [Değer]",
              "   - Kişi Telefonu | [Değer]",
              "   - email | [Değer]",
              "   - Görevi | [Değer]",
              "   - Şirket | [Değer]",
              "   - Proje | [Değer]",
              "   - Şirket Telefonu | [Değer]",
              "",
              "2. Alt Kısım (Teklif Tablosu):",
              "   - Başlık satırı: AÇIKLAMA | KELVİN | WATT | LÜMEN | EN (cm) | BOY (cm) | ADET | MİKTAR | BİRİM | FİYAT | TUTAR",
              "   - Bu sıraya göre sütunları eşleştir.",
              "",
              "GÖREVLERİN:",
              "1. Müşteri/Proje Bilgilerini Çıkar:",
              "   - 'Adı Soyadı' veya 'Adı Soyadı:' veya 'İlgili' veya 'Sayın' -> person.name",
              "   - 'Kişi Telefonu' veya 'Kişi Telefonu:' veya 'Gsm' veya 'Cep' -> person.phone",
              "   - 'email' veya 'email:' veya 'E-Posta' -> person.email",
              "   - 'Görevi' veya 'Görevi:' veya 'Unvanı' -> person.title",
              "   - 'Şirket' veya 'Şirket:' veya 'Firma Adı' veya 'Müşteri' -> company.name",
              "   - 'Proje' veya 'Proje:' -> company.contactInfo.project",
              "   - 'Şirket Telefonu' veya 'Şirket Telefonu:' veya 'Tel' -> company.contactInfo.phone",
              "   - ÖNEMLİ: Excel satırları '|' karakteri ile ayrılmış hücrelerden oluşur.",
              "   - Etiket bir hücrede (örn. 'Adı Soyadı:'), değer yanındaki hücrede (örn. 'Ahmet Yılmaz') olabilir.",
              "   - Veya etiket ve değer aynı hücrede (örn. 'Adı Soyadı: Ahmet Yılmaz') olabilir.",
              "   - Eğer '|' ile ayrılmışsa, etiketin yanındaki dolu hücreyi değer olarak al.",
              "",
              "2. Tablo Kalemlerini Çıkar:",
              "   - Her satırda soldan sağa şu sırayı bekle: Açıklama, Kelvin, Watt, Lümen, En, Boy, Parça Adedi (Adet), Miktar, Birim, Birim Fiyat, Tutar.",
              "   - 'ADET' sütunu teknik özellik olan parça sayısıdır (pieceCount).",
              "   - 'MİKTAR' sütunu ise toplam sipariş miktarıdır (quantity).",
              "   - Boş hücreleri 0 veya null kabul et.",
              "   - Kelvin, Watt, Lümen değerlerini ilgili alanlara sayı olarak ata.",
              "   - En ve Boy değerlerini width/length olarak ata.",
              "",
              "3. Sayısal Değerler:",
              "   - Türkçe sayı formatını (1.250,50) düzelt (1250.5).",
              "   - Para birimini satır içindeki sembollerden veya metinden algıla (varsayılan: EUR).",
              "",
              "ÇIKTI FORMATI (JSON):",
              "  {",
              '  "company": { "name": "...", "contactInfo": { ... } },',
              '  "person": { "name": "...", "email": "...", "phone": "...", "title": "..." },',
              '  "proposal": { "currency": "EUR", "totalAmount": 0, "items": [',
              '    { "description": "...", "quantity": 0, "unit": "...", "unitPrice": 0, "totalPrice": 0, "kelvin": 0, "watt": 0, "lumen": 0, "width": 0, "length": 0, "pieceCount": 0 }',
              "  ]}",
              "}"
            ].join("\n"),
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) return fallbackParse(text);

    const parsedRaw = JSON.parse(content);
    const validatedData = ProposalSchema.parse(parsedRaw);

    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const s = v.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const normItems = validatedData.proposal.items.map((i) => {
      const qty = toNum(i.quantity);
      const price = toNum(i.unitPrice);
      const total = i.totalPrice !== undefined ? toNum(i.totalPrice) : qty * price;
      
      const width = i.width !== undefined ? toNum(i.width) : undefined;
      const length = i.length !== undefined ? toNum(i.length) : undefined;
      const pieceCount = i.pieceCount !== undefined ? toNum(i.pieceCount) : undefined;

      return {
        ...i,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        width,
        length,
        pieceCount,
      };
    });

    const totalAmount = normItems.reduce((s, x) => s + x.totalPrice, 0);
    
    // Fallback logic if company name is still bad
    let finalName = validatedData.company.name;
    if (!finalName || finalName.toLowerCase().includes("sheet") || finalName.toLowerCase().includes("sayfa")) {
        const info = validatedData.company.contactInfo as Record<string, unknown>;
        finalName = (info.company as string) || null;
    }

    // Clean contact info (remove nulls)
    const rawContact = validatedData.company.contactInfo as Record<string, unknown>;
    const cleanContact: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawContact)) {
        if (v !== null) cleanContact[k] = v;
    }

    return {
      company: { 
        name: finalName,
        contactInfo: cleanContact 
      },
      person: validatedData.person ? {
        name: validatedData.person.name,
        email: validatedData.person.email || undefined,
        phone: validatedData.person.phone || undefined,
        title: validatedData.person.title || undefined
      } : undefined,
      proposal: {
        currency: validatedData.proposal.currency || "EUR",
        totalAmount,
        items: normItems,
      },
    };

  } catch (e) {
    console.error("AI Parse Error:", e);
    return fallbackParse(text);
  }
}

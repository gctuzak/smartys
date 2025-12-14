import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const Num = z.preprocess((v) => {
  if (typeof v === "string") {
    const s = v.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? v : n;
  }
  return v;
}, z.number());

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
    proposal: { currency: "TRY", totalAmount: 0, items: [] }
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
              "Uzman bir veri analistisin. Sana Excel'den çekilmiş ham metin verilecek. Bu metin '|' karakteri ile ayrılmış sütunlardan oluşur.",
            "",
            "GÖREVLERİN:",
            "1. Müşteri/Şirket ve İlgili Kişi Bilgilerini Bul:",
            "   - 'Sayın', 'Müşteri', 'Firma', 'Alıcı', 'Teklif Verilen' gibi anahtar kelimelere dikkat et.",
            "   - Şirket Adı (Tüzel Kişilik) ile Kişi Adını (İlgili Şahıs) birbirinden AYIR.",
            "   - Şirket adları genellikle 'A.Ş.', 'Ltd. Şti.', 'Yapı', 'Mimarlık', 'Mühendislik', 'Ticaret', 'Sanayi' gibi ekler içerir.",
            "   - Kişi adları genellikle 'Ad Soyad' formatındadır ve unvan içerebilir.",
            "   - Örnek: 'Sayın Ahmet Yılmaz - ABC Yapı A.Ş.' ise -> Person: Ahmet Yılmaz, Company: ABC Yapı A.Ş.",
            "   - Sadece kişi varsa Company null olabilir. Sadece şirket varsa Person null olabilir.",
            "   - İletişim bilgilerini (Tel, E-posta, Adres) ilgili alana koy.",
            "   - ÖZEL DURUM (Tablo Başlıkları): Metin içinde 'Adı', 'Şirket', 'Proje' gibi etiketlerin hemen yanında veya altındaki değerleri eşleştir:",
            "     * 'Adı' -> Person Name (örn: 'Adı Arif Üzgün')",
            "     * 'Şirket' -> Company Name (örn: 'Şirket Acıbadem Proje Yönetimi')",
            "     * 'Proje' -> Project Name (örn: 'Proje Acıbadem Maslak Hastanesi')",
            "     * Bu format genellikle satır başlarında 'Etiket Değer' veya 'Etiket | Değer' şeklinde görünür.",
            "",
            "2. Proje Bilgisini Bul:",
            "   - 'Proje:', 'Project:', 'Konu:', 'İşin Adı:', 'İş Tanımı:', 'Ref:' gibi ifadeleri ara.",
            "   - Bu bilgiyi company.contactInfo.project alanına yaz.",
            "",
            "3. Teklif Kalemlerini (Tabloyu) Bul:",
            "   - Tablo başlıkları DAİMA 'AÇIKLAMA', 'FİYAT' ve 'TUTAR' sütunlarını içerir.",
            "   - Bu başlıkların (header) ALTINDAKİ satırlar teklif kalemleridir.",
            "   - GEÇERLİ KALEM KURALI: Bir satırın kalem olması için 'Fiyat' (Unit Price) ve 'Tutar' (Total Price) alanlarının BOŞ OLMAMASI (0'dan büyük olması) gerekir.",
            "   - Eğer Fiyat veya Tutar boşsa, o satırı yoksay (ignore).",
            "   - Genellikle: Sol tarafta metin (Açıklama), sağ tarafta sayılar (Miktar, Fiyat, Tutar) bulunur.",
            "   - EN / BOY / ADET Ayrıştırma:",
            "     * Eğer ayrı sütunlarda (En, Boy, Adet) varsa bunları al.",
            "     * Eğer yoksa, Açıklama sütununda '100x200', '100*200', '100 x 200 cm' gibi ölçüler ara ve bunları En=100, Boy=200 olarak ayıkla.",
            "     * attributes: { enCm: number, boyCm: number, adet: number } formatında ekle.",
            "",
            "4. Sayısal Değerler:",
            "   - Para birimini (TRY, USD, EUR, GBP) sembollerden veya metinden tespit et.",
            "   - '$' görürsen 'USD', '€' görürsen 'EUR', '£' görürsen 'GBP', 'TL' veya '₺' görürsen 'TRY' olarak belirle.",
            "   - JSON çıktısında sayıları STRING değil, NUMBER (tırnaksız) olarak ver. (Örn: 1250.50).",
            "   - Türkçe format (1.250,50) veya İngilizce format (1,250.50) olabilir, sen bunu standart sayıya çevir.",
            "",
            "5. Başlık/Seperatör Satırları:",
            "   - Tablo başlıkları (Description, Qty, Price vb.) hariç, ara başlıkları veya ayırıcı satırları İÇERİ ALMA (ignore et).",
            "   - Sadece ürün/hizmet kalemlerini listele.",
            "",
            "ÇIKTI FORMATI (JSON):",
            "  {",
            '  "company": { "name": "...", "contactInfo": { ... } },',
            '  "person": { "name": "...", "email": "...", "phone": "...", "title": "..." },',
            '  "proposal": { "currency": "TRY", "totalAmount": 0, "items": [',
            '    { "description": "...", "quantity": 0, "unit": "...", "unitPrice": 0, "totalPrice": 0, "attributes": { "enCm": 0, "boyCm": 0, "adet": 0 } }',
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
      
      const attrs = i.attributes || {};
      const en = toNum((attrs as Record<string, unknown>).enCm);
      const boy = toNum((attrs as Record<string, unknown>).boyCm);
      const adet = toNum((attrs as Record<string, unknown>).adet);

      const nextAttrs: Record<string, unknown> = { ...attrs };
      if (en) nextAttrs.enCm = en;
      if (boy) nextAttrs.boyCm = boy;
      if (adet) nextAttrs.adet = adet;

      return {
        ...i,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        attributes: nextAttrs,
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
        currency: validatedData.proposal.currency || "TRY",
        totalAmount,
        items: normItems,
      },
    };

  } catch (e) {
    console.error("AI Parse Error:", e);
    return fallbackParse(text);
  }
}

import { openai } from "./openai";
import { InvoiceSchema, ParsedInvoice } from "./schemas/invoice";
import { zodResponseFormat } from "openai/helpers/zod";

function sanitizeInvoice(raw: any) {
    // 1. Çift İskonto Kontrolü (Double Discount Fix)
    // AI bazen hem satırlara indirim yazıyor hem de toplam indirime yazıyor.
    // Eğer satır indirimleri toplamı, genel indirime eşitse, genel indirimi sıfırla.
    const itemDiscountSum = raw.items ? raw.items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0) : 0;
    const globalDiscount = raw.totals.discountTotal || 0;
    
    if (itemDiscountSum > 0 && globalDiscount > 0) {
        // Toleranslı karşılaştırma (0.1 birim hata payı)
        if (Math.abs(itemDiscountSum - globalDiscount) < 0.5) {
            console.log(`Çift iskonto tespit edildi. Satır toplamı: ${itemDiscountSum}, Genel: ${globalDiscount}. Genel iskonto sıfırlanıyor.`);
            raw.totals.discountTotal = 0;
        }
    }

    // 2. KDV ve Gereksiz Kalem Kontrolü
    // Eğer AI "KDV" veya "Telsiz Ücreti" gibi kalemler eklediyse temizle
    if (raw.items) {
        raw.items = raw.items.filter((item: any) => {
            const desc = item.description.toLowerCase();
            // KDV, Vergi, Telsiz, ÖİV gibi kelimeleri içerenleri temizle (Ana hizmet kalsın)
            const isTax = desc.match(/^(toplam )?kdv( tutarı)?$/) || desc.match(/^vergi(ler)?$/) || desc.match(/^toplam vergi$/);
            const isFee = desc.includes("telsiz") || desc.includes("öiv") || desc.includes("özel iletişim");
            return !isTax && !isFee;
        });
    }

    // 3. Tek Kalem Modu (Opsiyonel ama önerilen)
    // Eğer geriye sadece 1 ana kalem kaldıysa, fiyatını genel toplama eşitle (Kullanıcı detay istemiyor)
    if (raw.items && raw.items.length === 1 && raw.totals.grandTotal > 0) {
        const mainItem = raw.items[0];
        // Eğer birim fiyat ile genel toplam arasında fark varsa, genel toplamı esas al
        if (Math.abs(mainItem.totalPrice - raw.totals.grandTotal) > 1) {
            console.log(`Tek kalem modu: Fiyat güncelleniyor. Eski: ${mainItem.totalPrice} -> Yeni: ${raw.totals.grandTotal}`);
            mainItem.totalPrice = raw.totals.grandTotal;
            if (mainItem.quantity > 0) {
                mainItem.unitPrice = Number((raw.totals.grandTotal / mainItem.quantity).toFixed(4));
            }
            mainItem.discount = 0; // İskonto sıfırla
        }
    }

    // 4. KDV Oranı Kontrolü (Fallback)
    if (raw.items) {
        raw.items.forEach((item: any) => {
            if (!item.vatRate || item.vatRate === 0) {
                // AI'ın bulması daha güvenli.
            }
        });
    }

    // 5. İskonto Temizliği ve Birim Fiyat Düzeltmesi (Net Fiyat Politikası)
    if (raw.items) {
        raw.items = raw.items.map((item: any) => {
            if (item.totalPrice && item.quantity > 0) {
                const calculatedPrice = item.totalPrice / item.quantity;
                if (Math.abs(item.unitPrice - calculatedPrice) > 0.05 || (item.discount && item.discount > 0)) {
                    console.log(`Fiyat düzeltmesi: ${item.description} - Eski Birim: ${item.unitPrice}, İskonto: ${item.discount} -> Yeni Birim: ${calculatedPrice}, İskonto: 0`);
                    item.unitPrice = Number(calculatedPrice.toFixed(4));
                    item.discount = 0;
                }
            }
            return item;
        });
    }
}

export async function parseInvoiceText(text: string): Promise<{ success: boolean; data?: ParsedInvoice; error?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY eksik" };
  }

  try {
    console.log("Starting OpenAI analysis with text length:", text.length);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sen uzman bir muhasebe asistanısın. Sana verilen fatura metnini analiz edip JSON formatına çevireceksin.
          
          TEMEL KURALLAR:
          1. Sayısal değerleri düzelt (TR formatı: 1.000,50 -> 1000.5).
          2. Tarihleri YYYY-MM-DD formatına çevir.
          3. Tablo kalemlerini eksiksiz çıkar.
          4. Vergi numarasını (VKN) veya TC Kimlik numarasını bul.
          5. Para birimini (TL, TRY, USD, EUR) tespit et.

          KRİTİK - DÖVİZLİ FATURALAR (EUR, USD vb.):
          - Kanun gereği dövizli faturalarda "TL Karşılığı" veya "Ödenecek Tutar (TL)" gösterilir.
          - SAKIN TL TUTARLARINI FATURA TUTARI OLARAK ALMA!
          - Faturanın ASIL PARA BİRİMİ neyse (Birim Fiyat sütununda ne yazıyorsa) tüm tutarları O PARA BİRİMİ cinsinden al.
          - Eğer Birim Fiyat "680 EUR" ise, grandTotal de EUR olmalı (Örn: 816 EUR). 
          - Faturanın altındaki "39.000 TL" gibi çevrim tablolarını, "Vergisiz Yansıtma" gibi satırları TAMAMEN GÖRMEZDEN GEL.
          - "currency" alanına "EUR" veya "USD" yaz. "TRY" yazma (eğer asıl para birimi döviz ise).
          
          KRİTİK - KALEMLER (ITEMS) VE KDV:
          - SADELEŞTİRME: Kullanıcı "Telsiz Kullanım Ücreti", "Özel İletişim Vergisi", "Damga Vergisi" gibi detay yasal kalemleri GÖRMEK İSTEMİYOR.
          - YAPILMASI GEREKEN: Bu tip yan kalemleri LİSTEYE EKLEME.
          - EĞER MÜMKÜNSE: Faturadaki asıl hizmeti (Örn: "Redli 40GB Tarifesi") tek kalem olarak al ve Faturanın GENEL TOPLAMINI bu kalemin fiyatı olarak yaz.
          - ÖZETLE: Tek bir kalem olsun, açıklaması ana hizmet olsun, fiyatı ise faturanın ÖDENECEK SON TUTARI olsun. Detaylarla uğraşma.
          
          - KDV ORANI (%): Satırların KDV oranını (Örn: %10, %20) mutlaka bul ve 'vatRate' alanına yaz. 
          - DİKKAT: Telekom faturalarında KDV genellikle %20'dir ancak Telsiz ücretlerinde KDV %0 olabilir. Sen ana hizmetin KDV oranını baz al.
          - Eğer KDV tutarı faturada ayrı bir sütunda yazıyorsa, oradan oranı hesapla (KDV Tutarı / Matrah).

          KRİTİK - İSKONTO (DISCOUNT) MANTIĞI:
          - HAYALİ İNDİRİM YASAK: Fatura üzerinde açıkça "İskonto", "İndirim", "Kampanya İndirimi" yazmıyorsa ASLA "discount" veya "discountTotal" alanını doldurma!
          - MATEMATİK UYDURMA: Eğer Birim Fiyat * Miktar = Toplam Tutar etmiyorsa, aradaki farkı "İskonto" olarak yazma!
          - ÇÖZÜM: Eğer Birim Fiyat ile Tutar uyuşmuyorsa, TUTAR'ı (%100) doğru kabul et ve Birim Fiyatı buna göre güncelle (Birim Fiyat = Tutar / Miktar).
          - ÖRNEK: Faturada Birim Fiyat 519 TL, Tutar 18 TL görünüyorsa; Birim Fiyatı 18 TL olarak kaydet, İskontoyu 0 yap. 501 TL İskonto UYDURMA.
          - Sadece faturada GÖRDÜĞÜN rakamları yaz. Hesap tutsun diye sayı uydurmak KESİNLİKLE YASAKTIR.
          
          KRİTİK - TOPLAM TUTAR (GRAND TOTAL) TESPİTİ:
          - Faturanın en altındaki "Ödenecek Tutar", "Fatura Tutarı", "Genel Toplam" değerini bul ve "grandTotal" alanına yaz.
          - ASLA kalemlerin toplamından yola çıkarak "grandTotal" uydurma. Faturada yazan net son rakamı al.
          - TELEKOM FATURALARI (Vodafone, Turkcell, Türk Telekom vb.) DİKKAT:
            * Bu faturalarda "Ara Toplam", "Vergiler Hariç Toplam" ve "Devlete İletilecek Vergiler" ayrı ayrı yazar.
            * "Ödenecek Tutar" veya "Fatura Tutarı" genellikle en altta ve EN BÜYÜK rakamdır.
            * Örneğin: Ara Toplam 50 TL + Vergiler 10 TL = Fatura Tutarı 60 TL ise, grandTotal 60 olmalıdır.
            * Yanlışlıkla "Telsiz Kullanım Ücreti" gibi küçük vergi kalemlerini (örn. 21.50 TL) TOPLAM sanma!
          
          EN ÖNEMLİ KONTROL - "YALNIZ" YAZISI İLE SAĞLAMA:
          - Her faturada genellikle "Yalnız ... TL" veya "Yalnız ... Türk Lirası" şeklinde fatura tutarını yazı ile yazan bir kısım bulunur.
          - Faturadaki bu yazıyı bul ve rakama çevir. (Örn: "Yalnız İki Yüz Elli TL" -> 250).
          - Bulduğun bu rakamı, yukarıda tespit ettiğin "Ödenecek Tutar" (grandTotal) ile karşılaştır.
          - Eğer "Ödenecek Tutar" ile "Yalnız" yazısı arasında fark varsa, %100 "YALNIZ" yazısındaki tutarı DOĞRU kabul et ve grandTotal olarak onu kullan.
          - Bu sağlama işlemi, OCR hatalarını ve yanlış rakam okumalarını önlemek için EN GÜVENİLİR yöntemdir.
          
          KRİTİK - KALEMLER VE VERGİLER:
          - Telekom faturalarında ana kalem fiyatı (örn. Tarife Ücreti) bazen vergiler dahil bazen hariç yazabilir.
          - Eğer kalem fiyatı ve toplam tutar uyuşmuyorsa, "Özel İletişim Vergisi" (ÖİV) gibi ek vergiler vardır.
          - "İskonto" (Discount) alanını sadece faturada açıkça "İskonto", "İndirim" yazıyorsa doldur. Matematik tutsun diye hayali iskonto yaratma!
          - Eğer satır toplamı ile genel toplam arasında fark varsa, bu farkı "ÖİV" veya "Diğer Vergiler" olarak yeni bir kalem şeklinde ekleyebilirsin.
          
          ÖNEMLİ - TEDARİKÇİ TESPİTİ:
          - Faturayı düzenleyen (Satıcı/Tedarikçi) ile faturayı alan (Alıcı/Müşteri) tarafı KARIŞTIRMA.
          - "Sayın", "Müşteri", "Alıcı" gibi ifadelerden sonra gelen veya "Fatura Adresi" başlığı altındaki bilgiler ALICIYA aittir. Bunları supplier olarak yazma.
          - Supplier (Tedarikçi), genellikle faturanın en üstünde logosu/ismi olan, "Satıcı", "Düzenleyen" veya iletişim bilgileri (Mersis, Ticaret Sicil vb.) detaylı yazan taraftır.
          - Eğer iki şirket ismi varsa, parayı alacak olan taraf Supplier'dır.
          `
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: zodResponseFormat(InvoiceSchema, "invoice"),
    });

    console.log("OpenAI response received");
    const content = completion.choices[0].message.content;
    
    if (completion.choices[0].finish_reason === "length") {
        return { success: false, error: "AI yanıtı yarım kaldı (token limiti)." };
    }

    if (completion.choices[0].message.refusal) {
        return { success: false, error: "AI yanıt vermeyi reddetti: " + completion.choices[0].message.refusal };
    }

    if (!content) {
        console.error("OpenAI returned empty content");
        return { success: false, error: "AI boş yanıt döndürdü." };
    }

    const raw = JSON.parse(content);

    // --- SANITIZATION ---
    sanitizeInvoice(raw);
    
    return { success: true, data: raw };

  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return { success: false, error: "AI hatası: " + error.message };
  }
}

export async function parseInvoiceImage(imageBase64: string): Promise<{ success: boolean; data?: ParsedInvoice; error?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY eksik" };
  }

  try {
    console.log("Starting OpenAI Image analysis...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sen uzman bir muhasebe asistanısın. Sana verilen fatura görselini analiz edip JSON formatına çevireceksin.
          
          TEMEL KURALLAR:
          1. Sayısal değerleri düzelt (TR formatı: 1.000,50 -> 1000.5).
          2. Tarihleri YYYY-MM-DD formatına çevir.
          3. Tablo kalemlerini eksiksiz çıkar.
          4. Vergi numarasını (VKN) veya TC Kimlik numarasını bul.
          5. Para birimini (TL, TRY, USD, EUR) tespit et.

          KRİTİK - DÖVİZLİ FATURALAR (EUR, USD vb.):
          - Kanun gereği dövizli faturalarda "TL Karşılığı" veya "Ödenecek Tutar (TL)" gösterilir.
          - SAKIN TL TUTARLARINI FATURA TUTARI OLARAK ALMA!
          - Faturanın ASIL PARA BİRİMİ neyse (Birim Fiyat sütununda ne yazıyorsa) tüm tutarları O PARA BİRİMİ cinsinden al.
          - Eğer Birim Fiyat "680 EUR" ise, grandTotal de EUR olmalı (Örn: 816 EUR). 
          - Faturanın altındaki "39.000 TL" gibi çevrim tablolarını, "Vergisiz Yansıtma" gibi satırları TAMAMEN GÖRMEZDEN GEL.
          - "currency" alanına "EUR" veya "USD" yaz. "TRY" yazma (eğer asıl para birimi döviz ise).
          
          KRİTİK - KALEMLER (ITEMS) VE KDV:
          - SADELEŞTİRME: Kullanıcı "Telsiz Kullanım Ücreti", "Özel İletişim Vergisi", "Damga Vergisi" gibi detay yasal kalemleri GÖRMEK İSTEMİYOR.
          - YAPILMASI GEREKEN: Bu tip yan kalemleri LİSTEYE EKLEME.
          - EĞER MÜMKÜNSE: Faturadaki asıl hizmeti (Örn: "Redli 40GB Tarifesi") tek kalem olarak al ve Faturanın GENEL TOPLAMINI bu kalemin fiyatı olarak yaz.
          - ÖZETLE: Tek bir kalem olsun, açıklaması ana hizmet olsun, fiyatı ise faturanın ÖDENECEK SON TUTARI olsun. Detaylarla uğraşma.
          
          - KDV ORANI (%): Satırların KDV oranını (Örn: %10, %20) mutlaka bul ve 'vatRate' alanına yaz. 
          - DİKKAT: Telekom faturalarında KDV genellikle %20'dir ancak Telsiz ücretlerinde KDV %0 olabilir. Sen ana hizmetin KDV oranını baz al.
          - Eğer KDV tutarı faturada ayrı bir sütunda yazıyorsa, oradan oranı hesapla (KDV Tutarı / Matrah).

          KRİTİK - İSKONTO (DISCOUNT) MANTIĞI:
          - HAYALİ İNDİRİM YASAK: Fatura üzerinde açıkça "İskonto", "İndirim", "Kampanya İndirimi" yazmıyorsa ASLA "discount" veya "discountTotal" alanını doldurma!
          - MATEMATİK UYDURMA: Eğer Birim Fiyat * Miktar = Toplam Tutar etmiyorsa, aradaki farkı "İskonto" olarak yazma!
          - ÇÖZÜM: Eğer Birim Fiyat ile Tutar uyuşmuyorsa, TUTAR'ı (%100) doğru kabul et ve Birim Fiyatı buna göre güncelle (Birim Fiyat = Tutar / Miktar).
          - ÖRNEK: Faturada Birim Fiyat 519 TL, Tutar 18 TL görünüyorsa; Birim Fiyatı 18 TL olarak kaydet, İskontoyu 0 yap. 501 TL İskonto UYDURMA.
          - Sadece faturada GÖRDÜĞÜN rakamları yaz. Hesap tutsun diye sayı uydurmak KESİNLİKLE YASAKTIR.
          
          KRİTİK - TOPLAM TUTAR (GRAND TOTAL) TESPİTİ:
          - Faturanın en altındaki "Ödenecek Tutar", "Fatura Tutarı", "Genel Toplam" değerini bul ve "grandTotal" alanına yaz.
          - ASLA kalemlerin toplamından yola çıkarak "grandTotal" uydurma. Faturada yazan net son rakamı al.
          - TELEKOM FATURALARI (Vodafone, Turkcell, Türk Telekom vb.) DİKKAT:
            * Bu faturalarda "Ara Toplam", "Vergiler Hariç Toplam" ve "Devlete İletilecek Vergiler" ayrı ayrı yazar.
            * "Ödenecek Tutar" veya "Fatura Tutarı" genellikle en altta ve EN BÜYÜK rakamdır.
            * Örneğin: Ara Toplam 50 TL + Vergiler 10 TL = Fatura Tutarı 60 TL ise, grandTotal 60 olmalıdır.
            * Yanlışlıkla "Telsiz Kullanım Ücreti" gibi küçük vergi kalemlerini (örn. 21.50 TL) TOPLAM sanma!
          
          EN ÖNEMLİ KONTROL - "YALNIZ" YAZISI İLE SAĞLAMA:
          - Her faturada genellikle "Yalnız ... TL" veya "Yalnız ... Türk Lirası" şeklinde fatura tutarını yazı ile yazan bir kısım bulunur.
          - Faturadaki bu yazıyı bul ve rakama çevir. (Örn: "Yalnız İki Yüz Elli TL" -> 250).
          - Bulduğun bu rakamı, yukarıda tespit ettiğin "Ödenecek Tutar" (grandTotal) ile karşılaştır.
          - Eğer "Ödenecek Tutar" ile "Yalnız" yazısı arasında fark varsa, %100 "YALNIZ" yazısındaki tutarı DOĞRU kabul et ve grandTotal olarak onu kullan.
          - Bu sağlama işlemi, OCR hatalarını ve yanlış rakam okumalarını önlemek için EN GÜVENİLİR yöntemdir.
          
          KRİTİK - KALEMLER VE VERGİLER:
          - Telekom faturalarında ana kalem fiyatı (örn. Tarife Ücreti) bazen vergiler dahil bazen hariç yazabilir.
          - Eğer kalem fiyatı ve toplam tutar uyuşmuyorsa, "Özel İletişim Vergisi" (ÖİV) gibi ek vergiler vardır.
          - "İskonto" (Discount) alanını sadece faturada açıkça "İskonto", "İndirim" yazıyorsa doldur. Matematik tutsun diye hayali iskonto yaratma!
          - Eğer satır toplamı ile genel toplam arasında fark varsa, bu farkı "ÖİV" veya "Diğer Vergiler" olarak yeni bir kalem şeklinde ekleyebilirsin.
          
          ÖNEMLİ - TEDARİKÇİ TESPİTİ:
          - Faturayı düzenleyen (Satıcı/Tedarikçi) ile faturayı alan (Alıcı/Müşteri) tarafı KARIŞTIRMA.
          - "Sayın", "Müşteri", "Alıcı" gibi ifadelerden sonra gelen veya "Fatura Adresi" başlığı altındaki bilgiler ALICIYA aittir. Bunları supplier olarak yazma.
          - Supplier (Tedarikçi), genellikle faturanın en üstünde logosu/ismi olan, "Satıcı", "Düzenleyen" veya iletişim bilgileri (Mersis, Ticaret Sicil vb.) detaylı yazan taraftır.
          - Eğer iki şirket ismi varsa, parayı alacak olan taraf Supplier'dır.
          `
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Bu faturayı analiz et." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
          ]
        }
      ],
      response_format: zodResponseFormat(InvoiceSchema, "invoice"),
    });

    console.log("OpenAI Image response received");
    const content = completion.choices[0].message.content;
    
    if (completion.choices[0].finish_reason === "length") {
        return { success: false, error: "AI yanıtı yarım kaldı (token limiti)." };
    }

    if (completion.choices[0].message.refusal) {
        return { success: false, error: "AI yanıt vermeyi reddetti: " + completion.choices[0].message.refusal };
    }

    if (!content) {
        console.error("OpenAI returned empty content");
        return { success: false, error: "AI boş yanıt döndürdü." };
    }

    const raw = JSON.parse(content);
    
    // --- SANITIZATION ---
    sanitizeInvoice(raw);

    return { success: true, data: raw };

  } catch (error: any) {
    console.error("OpenAI Image Error:", error);
    return { success: false, error: "AI görsel analiz hatası: " + error.message };
  }
}

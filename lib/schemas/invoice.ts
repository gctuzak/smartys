import { z } from "zod";

// OpenAI Structured Outputs doesn't support preprocess/transform.
// We must use simple types and handle transformation in the application logic.

export const InvoiceItemSchema = z.object({
  description: z.string().describe("Ürün veya hizmet açıklaması"),
  quantity: z.number().describe("Miktar"),
  unit: z.string().nullable().describe("Birim (Adet, Kg, Saat vb.)"),
  unitPrice: z.number().describe("Birim fiyat"),
  totalPrice: z.number().describe("Satır toplam tutarı"),
  vatRate: z.number().nullable().describe("KDV Oranı (%)"),
  discount: z.number().nullable().describe("Satır iskontosu (tutar olarak)"),
});

export const InvoiceSchema = z.object({
  metadata: z.object({
    invoiceNo: z.string().describe("Fatura numarası"),
    date: z.string().describe("Fatura tarihi (YYYY-MM-DD formatında)"),
    dueDate: z.string().nullable().describe("Son ödeme tarihi (varsa)"),
    type: z.enum(["ALIS", "SATIS", "IADE"]).describe("Fatura tipi"),
    amountInWords: z.string().nullable().describe("Faturanın altındaki 'Yalnız ... TL' şeklindeki yazıyla belirtilen tutar."),
  }),
  supplier: z.object({
    name: z.string().describe("Faturayı düzenleyen/kesen firma adı (Tedarikçi). Faturayı alan (müşteri) değil!"),
    taxNo: z.string().nullable().describe("Vergi numarası"),
    taxOffice: z.string().nullable().describe("Vergi dairesi"),
    address: z.string().nullable().describe("Adres"),
  }),
  items: z.array(InvoiceItemSchema),
  totals: z.object({
    subtotal: z.number().describe("Ara toplam (KDV hariç)"),
    discountTotal: z.number().nullable().describe("Toplam iskonto tutarı"),
    vatTotal: z.number().describe("Toplam KDV tutarı"),
    grandTotal: z.number().describe("Genel toplam (KDV dahil)"),
    currency: z.string().describe("Para birimi (TRY, USD, EUR)"),
  }),
});

export type ParsedInvoice = z.infer<typeof InvoiceSchema>;

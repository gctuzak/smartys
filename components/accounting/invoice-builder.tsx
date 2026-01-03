"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createInvoiceAction, updateInvoiceAction, getInvoiceDetailAction, getOrderForInvoiceAction } from "@/app/actions/accounting";
import { createCompanyAction } from "@/app/actions/create-entity";
import { getLatestRatesAction } from "@/app/actions/exchange-rates";
import { useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { ParsedInvoice } from "@/lib/schemas/invoice";

// Mock Supabase Client (Gerçek entegrasyonda yukarıdaki import açılmalı)
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

interface Product {
  id: string;
  name: string;
  code: string;
  default_price: number;
  vat_rate: number;
  stok_miktari: number;
}

interface Company {
  id: string;
  name: string;
  guncel_bakiye: number;
}

interface InvoiceItem {
  product_id: string;
  aciklama: string;
  miktar: number;
  birim: string;
  birim_fiyat: number;
  kdv_orani: number;
  iskonto: number;
}

interface InvoiceBuilderProps {
  initialInvoiceId?: string;
}

import { AverageRateCalculator } from "./average-rate-calculator";

export default function InvoiceBuilder({ initialInvoiceId }: InvoiceBuilderProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(initialInvoiceId || null);

  // Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState("SATIS");
  const [invoiceNo, setInvoiceNo] = useState(`F${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`);
  const [genelIskonto, setGenelIskonto] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  
  // Parsed Data State
  const [parsedSupplier, setParsedSupplier] = useState<{name: string, taxNo?: string, taxOffice?: string, address?: string} | null>(null);
  const [skipCompanyLink, setSkipCompanyLink] = useState(false);

  // Döviz State
  const [currency, setCurrency] = useState<"TRY" | "USD" | "EUR">("TRY");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loadingRate, setLoadingRate] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20, iskonto: 0 }
  ]);

  // Döviz kuru değişimi
  useEffect(() => {
    async function fetchRate() {
      if (currency === "TRY") {
        setExchangeRate(1);
        return;
      }

      setLoadingRate(true);
      try {
        const result = await getLatestRatesAction();
        if (result.success && result.data) {
          if (currency === "USD") {
            setExchangeRate(result.data.usdSelling || 0);
          } else if (currency === "EUR") {
            setExchangeRate(result.data.eurSelling || 0);
          }
        }
      } catch (error) {
        console.error("Kur alınamadı:", error);
      } finally {
        setLoadingRate(false);
      }
    }

    fetchRate();
  }, [currency]);

  // Verileri Yükle
  useEffect(() => {
    async function loadData() {
      const { data: companiesData } = await supabase.from("companies").select("id, name, guncel_bakiye");
      const { data: productsData } = await supabase.from("products").select("*");
      
      if (companiesData) setCompanies(companiesData);
      if (productsData) setProducts(productsData);

      // Check for edit mode
      const paramId = searchParams.get("id");
      const orderIdParam = searchParams.get("orderId");
      const targetId = invoiceId || paramId;

      if (targetId) {
        if (!invoiceId) setInvoiceId(targetId);
        
        // Use Server Action to get details (more reliable than client-side fetch due to RLS/Env)
        const result = await getInvoiceDetailAction(targetId);
        
        if (result.success && result.data) {
          const invoice = result.data;
          
          setSelectedCompanyId(invoice.company_id || "");
          setInvoiceNo(invoice.fatura_no);
          setInvoiceDate(new Date(invoice.tarih).toISOString().split("T")[0]);
          if (invoice.son_odeme_tarihi) setDueDate(new Date(invoice.son_odeme_tarihi).toISOString().split("T")[0]);
          setInvoiceType(invoice.tip);
          setCurrency(invoice.para_birimi as any);
          setExchangeRate(invoice.doviz_kuru);
          
          // Load invoice items
          if (invoice.items) {
            const newItems = invoice.items.map((item: any) => ({
              product_id: item.product_id || "",
              aciklama: item.aciklama,
              miktar: item.miktar,
              birim: item.birim || "Adet",
              birim_fiyat: item.birim_fiyat,
              kdv_orani: item.kdv_orani,
              iskonto: 0 // Backend henüz kalem bazlı iskontoyu ayrı tutmuyor, fiyata gömülü.
            }));
            setItems(newItems);
          }
        } else {
            console.error("Fatura detayları alınamadı:", result.error);
            toast.error("Fatura bilgileri yüklenemedi.");
        }
      } else if (orderIdParam) {
          // Load from Order
          const result = await getOrderForInvoiceAction(orderIdParam);
          if (result.success && result.data) {
              const { order, items } = result.data;
              if (order.company_id) setSelectedCompanyId(order.company_id);
              if (order.currency) setCurrency(order.currency as any);
              if (items && items.length > 0) setItems(items);
              if (order.project_name) setInvoiceNotes(`Proje: ${order.project_name}`);
          } else {
              toast.error(result.error || "Sipariş bilgileri yüklenemedi");
          }
      }

      // Check for uploaded invoice data
      const source = searchParams.get("source");
      const type = searchParams.get("type");

      if (type) {
        setInvoiceType(type);
      }

      if (source === "upload") {
        const storedData = localStorage.getItem("pendingInvoice");
        if (storedData) {
          try {
            const parsed: ParsedInvoice = JSON.parse(storedData);
            console.log("Loading parsed invoice:", parsed);

            // Populate form
            setInvoiceNo(parsed.metadata.invoiceNo || "");
            setInvoiceDate(parsed.metadata.date || new Date().toISOString().split("T")[0]);
            if (parsed.metadata.dueDate) setDueDate(parsed.metadata.dueDate);
            if (parsed.metadata.type) setInvoiceType(parsed.metadata.type);
            
            // Set currency
            if (parsed.totals.currency) {
                const cur = parsed.totals.currency.toUpperCase();
                if (cur === "USD" || cur === "EUR" || cur === "TRY") {
                    setCurrency(cur as any);
                }
            }

            // Set items
            if (parsed.items && parsed.items.length > 0) {
                let finalItems: any[] = [];
                let processed = false;

                // 1. Durum: Tek Kalem var ama KDV Tutarı ile Hesaplanan Tutmuyor (Telekom Faturası Senaryosu)
                // Örn: Toplam 540.50, KDV 79.85 (%20 varsayarsak matrah 399.25, toplam 479.10 eder. 61.40 TL fark var.)
                // Bu durumda kalemi ikiye böl: %20'lik kısım ve %0'lık kısım.
                const isSingleItem = parsed.items.length === 1;
                const grandTotal = parsed.totals.grandTotal || 0;
                const vatTotal = parsed.totals.vatTotal || 0;

                if (isSingleItem && grandTotal > 0 && vatTotal > 0) {
                    // Varsayılan KDV oranı %20 üzerinden kontrol et
                    const assumedRate = 20;
                    const calculatedBase = vatTotal / (assumedRate / 100); // 79.85 / 0.20 = 399.25
                    const calculatedTotalWithVat = calculatedBase + vatTotal; // 479.10
                    const difference = grandTotal - calculatedTotalWithVat; // 540.50 - 479.10 = 61.40

                    // Eğer fark pozitif ve anlamlıysa (> 1 TL), demek ki %0 KDV'li ek kalemler var (ÖİV, Telsiz vs.)
                    if (difference > 1) {
                         console.log("Karma KDV yapısı tespit edildi. Kalem bölünüyor...");
                         const originalItem = parsed.items[0];
                         
                         // 1. Kalem: KDV'ye tabi olan kısım
                         finalItems.push({
                            product_id: "",
                            aciklama: originalItem.description || "Hizmet Bedeli",
                            miktar: originalItem.quantity || 1,
                            birim: originalItem.unit || "Adet",
                            birim_fiyat: Number((calculatedBase / (originalItem.quantity || 1)).toFixed(4)),
                            kdv_orani: assumedRate,
                            iskonto: 0
                         });

                         // 2. Kalem: KDV'siz kısım (Vergiler, Yansımalar)
                         finalItems.push({
                            product_id: "",
                            aciklama: "Vergisiz Yansımalar (ÖİV, Telsiz Ücreti vb.)",
                            miktar: 1,
                            birim: "Adet",
                            birim_fiyat: Number(difference.toFixed(2)),
                            kdv_orani: 0,
                            iskonto: 0
                         });
                         
                         processed = true;
                    }
                }

                if (!processed) {
                    // Standart Akış
                    // KDV Oranı Tahmini (Global)
                    let estimatedVatRate = 0;
                    if (parsed.totals.vatTotal > 0 && parsed.totals.grandTotal > 0) {
                        const calculatedBase = parsed.totals.grandTotal - parsed.totals.vatTotal;
                        if (calculatedBase > 0) {
                            const rate = (parsed.totals.vatTotal / calculatedBase) * 100;
                            // Standart oranlara yuvarla (1, 10, 20)
                            if (Math.abs(rate - 20) < 2) estimatedVatRate = 20;
                            else if (Math.abs(rate - 10) < 1) estimatedVatRate = 10;
                            else if (Math.abs(rate - 1) < 0.5) estimatedVatRate = 1;
                        }
                    }

                    finalItems = parsed.items.map(item => {
                        let unitPrice = item.unitPrice;
                        let vatRate = item.vatRate || 0;

                        // Eğer KDV oranı gelmediyse, tahmini oranı kullan
                        if (vatRate === 0 && estimatedVatRate > 0) {
                            vatRate = estimatedVatRate;
                        }

                        // KDV Dahil/Hariç Kontrolü
                        // Eğer parser birim fiyatı KDV dahil (Genel Toplam) olarak verdiyse, bunu KDV hariç hale getir.
                        // Kontrol: Item Toplamı == Genel Toplam VE KDV Tutarı > 0
                        const itemTotal = unitPrice * item.quantity;
                        if (parsed.totals.grandTotal > 0 && Math.abs(itemTotal - parsed.totals.grandTotal) < 1 && parsed.totals.vatTotal > 0 && vatRate > 0) {
                            console.log("KDV Dahil fiyat tespit edildi, hariç fiyata çevriliyor...", unitPrice);
                            unitPrice = unitPrice / (1 + (vatRate / 100));
                        }

                        return {
                            product_id: "", 
                            aciklama: item.description,
                            miktar: item.quantity,
                            birim: item.unit || "Adet",
                            birim_fiyat: unitPrice,
                            kdv_orani: vatRate,
                            iskonto: item.discount || 0
                        };
                    });
                }

                setItems(finalItems);
            }

            // Set global discount
            if (parsed.totals.discountTotal) {
                setGenelIskonto(parsed.totals.discountTotal);
            }

            // Try to match company
            if (parsed.supplier?.name) {
                if (companiesData) {
                    // Simple case-insensitive contains match
                    const matchedCompany = companiesData.find(c => 
                        c.name.toLowerCase().includes(parsed.supplier.name.toLowerCase()) || 
                        parsed.supplier.name.toLowerCase().includes(c.name.toLowerCase())
                    );
                    if (matchedCompany) {
                        setSelectedCompanyId(matchedCompany.id);
                        toast.success(`Tedarikçi eşleştirildi: ${matchedCompany.name}`);
                        setParsedSupplier(null);
                    } else {
                        toast.info(`Tedarikçi bulunamadı: ${parsed.supplier.name}.`);
                        setParsedSupplier({
                            name: parsed.supplier.name,
                            taxNo: parsed.supplier.taxNo || undefined,
                            taxOffice: parsed.supplier.taxOffice || undefined,
                            address: parsed.supplier.address || undefined
                        });
                    }
                }
            }

            // Clear storage
            localStorage.removeItem("pendingInvoice");
            toast.success("Fatura bilgileri form'a aktarıldı.");

          } catch (e) {
            console.error("Error parsing stored invoice:", e);
            toast.error("Fatura bilgileri yüklenirken hata oluştu.");
          }
        }
      }
    }
    loadData();
  }, [searchParams]); // Re-run if searchParams changes, though typically runs once on mount

  // Hesaplamalar
  const calculateTotals = () => {
    let subtotal = 0;
    let vatTotal = 0;
    let lineDiscounts = 0;

    items.forEach(item => {
      const lineTotal = item.miktar * item.birim_fiyat;
      const lineDiscount = item.iskonto || 0;
      const lineNet = lineTotal - lineDiscount;
      const lineVat = lineNet * (item.kdv_orani / 100);
      
      subtotal += lineTotal;
      lineDiscounts += lineDiscount;
      vatTotal += lineVat;
    });

    // Apply global discount if any (proportionally reduces VAT base?)
    // Usually global discount is applied after line discounts.
    // If we have line discounts, subtotal is sum of (qty*price).
    // Total Discount = lineDiscounts + genelIskonto.
    // BUT VAT calculation depends on the base.
    // If genelIskonto is entered, does it affect VAT? Yes.
    // We assume genelIskonto reduces the VAT base proportionally or is a bottom-line discount.
    // For simplicity: Net Total = (Subtotal - LineDiscounts - GenelIskonto).
    // VAT = Net Total * (Average VAT Rate)? No, that's dangerous.
    // Better: We assume GenelIskonto is applied to the 'Total' and we need to reduce VAT.
    // BUT since items can have different VAT rates, a global discount is ambiguous.
    // WE WILL ASSUME: GenelIskonto is distributed to items for VAT calculation purposes if not 0.
    // However, for just displaying:
    
    // Let's refine the logic:
    // If GenelIskonto > 0, we treat it as a reduction on the Subtotal.
    // To be precise, we should reduce each line's amount by (GenelIskonto * (LineAmount / Subtotal)).
    
    let finalSubtotal = subtotal;
    let finalVat = vatTotal;
    
    if (genelIskonto > 0 && subtotal > 0) {
        // Recalculate VAT with distributed global discount
        finalVat = 0;
        items.forEach(item => {
            const lineTotal = item.miktar * item.birim_fiyat;
            const lineDiscount = item.iskonto || 0;
            const lineNetBeforeGlobal = lineTotal - lineDiscount;
            
            // Distribute global discount based on share of (Subtotal - LineDiscounts)
            // Effective Total Line Discount = LineDiscount + (GenelIskonto * (LineNetBeforeGlobal / (Subtotal - LineDiscounts)))
            
            const totalNetBeforeGlobal = subtotal - lineDiscounts;
            const share = totalNetBeforeGlobal > 0 ? (lineNetBeforeGlobal / totalNetBeforeGlobal) : 0;
            const distributedGlobal = genelIskonto * share;
            
            const finalLineNet = lineNetBeforeGlobal - distributedGlobal;
            finalVat += finalLineNet * (item.kdv_orani / 100);
        });
        finalSubtotal = subtotal - lineDiscounts - genelIskonto;
    } else {
        finalSubtotal = subtotal - lineDiscounts;
    }

    return {
      subtotal, // Gross Subtotal (Sum of Price * Qty)
      discountTotal: lineDiscounts + genelIskonto,
      vatTotal: finalVat,
      grandTotal: finalSubtotal + finalVat
    };
  };

  const totals = calculateTotals();

  // Satır İşlemleri
  const addItem = () => {
    setItems([...items, { product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20, iskonto: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Ürün seçildiyse otomatik doldur
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        item.aciklama = product.name;
        item.birim_fiyat = product.default_price || 0;
        item.kdv_orani = product.vat_rate || 20;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleCreateCompany = async () => {
    if (!parsedSupplier) return;
    
    if (!confirm(`${parsedSupplier.name} için yeni cari kart oluşturulsun mu?`)) return;

    try {
        setLoading(true);
        const newCompany = await createCompanyAction({
            name: parsedSupplier.name,
            taxNo: parsedSupplier.taxNo,
            taxOffice: parsedSupplier.taxOffice,
            address: parsedSupplier.address
        });
        
        if (newCompany) {
            // Add to list and select
            // Note: company object structure match check
            const companyForState: Company = {
                id: newCompany.id,
                name: newCompany.name,
                guncel_bakiye: newCompany.guncel_bakiye || 0
            };
            setCompanies(prev => [companyForState, ...prev]);
            setSelectedCompanyId(newCompany.id);
            setParsedSupplier(null); // Clear prompt
            toast.success("Cari kart oluşturuldu ve seçildi.");
        }
    } catch (error: any) {
        console.error("Error creating company:", error);
        toast.error("Cari kart oluşturulurken hata: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  // Kaydetme
  const handleSave = async () => {
    if (!selectedCompanyId && !skipCompanyLink) return alert("Lütfen cari seçiniz veya 'Cari Seçmeden Devam Et' seçeneğini işaretleyiniz.");
    if (items.some(i => !i.aciklama || i.miktar <= 0)) return alert("Lütfen kalemleri kontrol ediniz.");

    setLoading(true);
    try {
      // Frontend item yapısını backend (RPC) yapısına dönüştür
      // NOT: Backend henüz iskonto alanını desteklemediği için, iskontoyu birim fiyata yediriyoruz.
      // Net Birim Fiyat = (Brüt Tutar - İskonto Payı) / Miktar
      
      const { subtotal, discountTotal } = calculateTotals(); // Recalculate to get totals
      const lineDiscounts = items.reduce((sum, item) => sum + (item.iskonto || 0), 0);
      const totalNetBeforeGlobal = subtotal - lineDiscounts;
      
      const rpcItems = items.map(item => {
        const lineTotal = item.miktar * item.birim_fiyat;
        const lineDiscount = item.iskonto || 0;
        const lineNetBeforeGlobal = lineTotal - lineDiscount;
        
        // Global discount distribution
        let distributedGlobal = 0;
        if (genelIskonto > 0 && totalNetBeforeGlobal > 0) {
             const share = lineNetBeforeGlobal / totalNetBeforeGlobal;
             distributedGlobal = genelIskonto * share;
        }
        
        const finalLineNet = lineNetBeforeGlobal - distributedGlobal;
        const netUnitPrice = item.miktar > 0 ? finalLineNet / item.miktar : 0;
        
        return {
            urun_id: item.product_id || undefined,
            aciklama: item.aciklama + (item.iskonto || genelIskonto ? ` (İskonto Dahil)` : ""),
            miktar: item.miktar,
            birim_fiyat: netUnitPrice, // Send NET Price
            kdv_orani: item.kdv_orani
        };
      });

      // Server Action'ı çağır
      let result;
      if (invoiceId) {
        result = await updateInvoiceAction(invoiceId, {
          company_id: selectedCompanyId || null,
          fatura_no: invoiceNo,
          tarih: invoiceDate,
          son_odeme_tarihi: dueDate || null,
          tip: invoiceType as "SATIS" | "ALIS",
          para_birimi: currency,
          doviz_kuru: exchangeRate,
          notlar: (invoiceNotes ? invoiceNotes + " " : "") + "Web üzerinden güncellendi." + (parsedSupplier && !selectedCompanyId ? ` - Tedarikçi: ${parsedSupplier.name}` : ""),
          items: rpcItems
        });
      } else {
        result = await createInvoiceAction({
          company_id: selectedCompanyId || null,
          fatura_no: invoiceNo,
          tarih: invoiceDate,
          son_odeme_tarihi: dueDate || null,
          tip: invoiceType as "SATIS" | "ALIS",
          para_birimi: currency,
          doviz_kuru: exchangeRate,
          notlar: (invoiceNotes ? invoiceNotes + " " : "") + "Web üzerinden oluşturuldu." + (parsedSupplier && !selectedCompanyId ? ` - Tedarikçi: ${parsedSupplier.name}` : ""),
          items: rpcItems
        });
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      alert(invoiceId ? "Fatura başarıyla güncellendi!" : "Fatura başarıyla oluşturuldu!");
      setItems([{ product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20, iskonto: 0 }]);
      setInvoiceNo(`F${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`);
      setGenelIskonto(0);
      
      // Listeye yönlendir
      if (invoiceType === "ALIS") {
        router.push("/muhasebe/faturalar/alis");
      } else {
        router.push("/muhasebe/faturalar/satis");
      }
    } catch (err: any) {
      console.error(err);
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto my-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">{invoiceId ? "Fatura Düzenle" : "Yeni Fatura Oluştur"}</h1>

      {/* Başlık Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="flex flex-col gap-2">
          {parsedSupplier && !selectedCompanyId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                <p className="font-medium text-yellow-800 mb-1">Tedarikçi sistemde bulunamadı:</p>
                <p className="text-gray-700 mb-2">{parsedSupplier.name}</p>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCreateCompany}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                        Cari Kart Oluştur
                    </button>
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={skipCompanyLink} 
                            onChange={(e) => setSkipCompanyLink(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        Cari Seçmeden Devam Et
                    </label>
                </div>
            </div>
          )}
          <label className="block text-sm font-medium text-gray-700">Cari / Müşteri</label>
          <Combobox
            options={companies.map(c => ({
              value: c.id,
              label: `${c.name} (Bakiye: ${c.guncel_bakiye})`
            }))}
            value={selectedCompanyId}
            onChange={setSelectedCompanyId}
            placeholder="Cari Seçiniz..."
            searchPlaceholder="Cari ara..."
            emptyText="Cari bulunamadı."
            className="w-full"
          />
          {invoiceType === "ALIS" && (
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="skipCompany"
                checked={skipCompanyLink} 
                onChange={(e) => {
                    setSkipCompanyLink(e.target.checked);
                    if (e.target.checked) setSelectedCompanyId("");
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="skipCompany" className="text-sm text-gray-600 cursor-pointer select-none">
                Cari seçimi yapmadan devam et
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fatura No</label>
          <input 
            type="text" 
            className="w-full border rounded-md p-2"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
          <input 
            type="date" 
            className="w-full border rounded-md p-2"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vade Tarihi</label>
          <input 
            type="date" 
            className="w-full border rounded-md p-2"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
          <div className="flex gap-2">
            <select 
              className="w-24 border rounded-md p-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <div className="relative flex-1">
              <input 
                type="number" 
                className="w-full border rounded-md p-2 pr-8"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                disabled={currency === "TRY"}
                step="0.0001"
              />
              {loadingRate && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <RefreshCw className="animate-spin text-gray-400" size={16} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fatura Tipi</label>
          <select 
            className="w-full border rounded-md p-2"
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value)}
          >
            <option value="SATIS">Satış Faturası</option>
            <option value="ALIS">Alış Faturası</option>
          </select>
        </div>
      </div>

      {/* Kalemler */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Fatura Kalemleri</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="p-3">Açıklama</th>
                <th className="p-3">Stok Kartı (Opsiyonel)</th>
                <th className="p-3 w-24">Miktar</th>
                <th className="p-3 w-32">Birim Fiyat</th>
                <th className="p-3 w-24">İskonto</th>
                <th className="p-3 w-24">KDV %</th>
                <th className="p-3 w-32 text-right">Tutar</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="p-2">
                    <input 
                      type="text" 
                      className="w-full border rounded p-1"
                      value={item.aciklama}
                      onChange={(e) => updateItem(index, "aciklama", e.target.value)}
                      placeholder="Ürün veya hizmet açıklaması"
                    />
                  </td>
                  <td className="p-2">
                    <select 
                      className="w-full border rounded p-1"
                      value={item.product_id}
                      onChange={(e) => updateItem(index, "product_id", e.target.value)}
                    >
                      <option value="">Stok Eşleştirme Yok</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stok: {p.stok_miktari})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      className="w-full border rounded p-1"
                      value={item.miktar}
                      onChange={(e) => updateItem(index, "miktar", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      className="w-full border rounded p-1"
                      value={item.birim_fiyat}
                      onChange={(e) => updateItem(index, "birim_fiyat", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      className="w-full border rounded p-1"
                      value={item.iskonto || 0}
                      onChange={(e) => updateItem(index, "iskonto", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      className="w-full border rounded p-1"
                      value={item.kdv_orani}
                      onChange={(e) => updateItem(index, "kdv_orani", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 text-right font-medium">
                    {((item.miktar * item.birim_fiyat - (item.iskonto || 0))).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button 
          onClick={addItem}
          className="mt-2 flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <Plus size={16} className="mr-1" /> Yeni Satır Ekle
        </button>
      </div>

      {/* Alt Toplamlar */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Ara Toplam:</span>
            <span>{totals.subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-red-600">
                <span>İskonto:</span>
                <span>-{totals.discountTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span>
            </div>
          )}
           <div className="flex justify-between items-center text-gray-600 text-sm">
            <span>Genel İskonto:</span>
            <input 
                type="number" 
                className="w-24 border rounded p-1 text-right"
                value={genelIskonto}
                onChange={(e) => setGenelIskonto(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Toplam KDV:</span>
            <span>{totals.vatTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t">
            <span>Genel Toplam:</span>
            <span>{totals.grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {currency}</span>
          </div>
          {currency !== "TRY" && (
            <div className="space-y-2 mt-2 pt-2 border-t">
              <div className="text-right text-sm text-gray-500">
                (Yaklaşık {(totals.grandTotal * exchangeRate).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺)
              </div>
              <div className="flex justify-end">
                <AverageRateCalculator
                  totalAmountFX={totals.grandTotal}
                  currency={currency}
                  invoiceDate={invoiceDate}
                  currentRate={exchangeRate}
                  onApply={(desc) => {
                    setInvoiceNotes(prev => (prev ? prev + "\n\n" : "") + desc);
                    toast.success("Ortalama kur hesabı notlara eklendi.");
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fatura Notları */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fatura Notları</label>
        <textarea
          className="w-full border rounded-md p-2 h-24 text-sm"
          placeholder="Fatura notları..."
          value={invoiceNotes}
          onChange={(e) => setInvoiceNotes(e.target.value)}
        />
      </div>

      {/* Aksiyonlar */}
      <div className="flex justify-end gap-4">
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
        >
          Vazgeç
        </button>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
          {invoiceId ? "Faturayı Güncelle" : "Faturayı Oluştur"}
        </button>
      </div>
    </div>
  );
}

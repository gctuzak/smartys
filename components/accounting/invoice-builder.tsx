"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createInvoiceAction } from "@/app/actions/accounting";
import { useRouter } from "next/navigation";

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
}

export default function InvoiceBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState("SATIS");
  const [invoiceNo, setInvoiceNo] = useState(`F${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20 }
  ]);

  // Verileri Yükle
  useEffect(() => {
    async function loadData() {
      const { data: companiesData } = await supabase.from("companies").select("id, name, guncel_bakiye");
      const { data: productsData } = await supabase.from("products").select("*");
      
      if (companiesData) setCompanies(companiesData);
      if (productsData) setProducts(productsData);
    }
    loadData();
  }, []);

  // Hesaplamalar
  const calculateTotals = () => {
    let subtotal = 0;
    let vatTotal = 0;

    items.forEach(item => {
      const lineTotal = item.miktar * item.birim_fiyat;
      const lineVat = lineTotal * (item.kdv_orani / 100);
      subtotal += lineTotal;
      vatTotal += lineVat;
    });

    return {
      subtotal,
      vatTotal,
      grandTotal: subtotal + vatTotal
    };
  };

  const totals = calculateTotals();

  // Satır İşlemleri
  const addItem = () => {
    setItems([...items, { product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20 }]);
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

  // Kaydetme
  const handleSave = async () => {
    if (!selectedCompanyId) return alert("Lütfen cari seçiniz.");
    if (items.some(i => !i.aciklama || i.miktar <= 0)) return alert("Lütfen kalemleri kontrol ediniz.");

    setLoading(true);
    try {
      // Frontend item yapısını backend (RPC) yapısına dönüştür
      const rpcItems = items.map(item => ({
        urun_id: item.product_id || undefined, // undefined if empty string
        aciklama: item.aciklama,
        miktar: item.miktar,
        birim_fiyat: item.birim_fiyat,
        kdv_orani: item.kdv_orani
      }));

      // Server Action'ı çağır
      const result = await createInvoiceAction({
        company_id: selectedCompanyId,
        fatura_no: invoiceNo,
        tarih: invoiceDate,
        son_odeme_tarihi: dueDate || null,
        tip: invoiceType as "SATIS" | "ALIS",
        para_birimi: "TRY",
        doviz_kuru: 1,
        notlar: "Web üzerinden oluşturuldu.",
        items: rpcItems
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      alert("Fatura başarıyla oluşturuldu!");
      setItems([{ product_id: "", aciklama: "", miktar: 1, birim: "Adet", birim_fiyat: 0, kdv_orani: 20 }]);
      setInvoiceNo(`F${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`);
      
      // Listeye yönlendir
      router.push("/muhasebe/faturalar");
    } catch (err: any) {
      console.error(err);
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto my-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Yeni Fatura Oluştur</h1>

      {/* Başlık Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari / Müşteri</label>
          <select 
            className="w-full border rounded-md p-2"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="">Seçiniz...</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} (Bakiye: {c.guncel_bakiye})</option>
            ))}
          </select>
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
                <th className="p-3">Ürün / Hizmet</th>
                <th className="p-3">Açıklama</th>
                <th className="p-3 w-24">Miktar</th>
                <th className="p-3 w-32">Birim Fiyat</th>
                <th className="p-3 w-24">KDV %</th>
                <th className="p-3 w-32 text-right">Tutar</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="p-2">
                    <select 
                      className="w-full border rounded p-1"
                      value={item.product_id}
                      onChange={(e) => updateItem(index, "product_id", e.target.value)}
                    >
                      <option value="">Seçiniz...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stok: {p.stok_miktari})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      className="w-full border rounded p-1"
                      value={item.aciklama}
                      onChange={(e) => updateItem(index, "aciklama", e.target.value)}
                    />
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
                      value={item.kdv_orani}
                      onChange={(e) => updateItem(index, "kdv_orani", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 text-right font-medium">
                    {((item.miktar * item.birim_fiyat) * (1 + item.kdv_orani/100)).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
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
            <span>{totals.subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Toplam KDV:</span>
            <span>{totals.vatTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t">
            <span>Genel Toplam:</span>
            <span>{totals.grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
          </div>
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex justify-end gap-4">
        <button className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">
          Vazgeç
        </button>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
          Faturayı Oluştur
        </button>
      </div>
    </div>
  );
}

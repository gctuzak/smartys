"use client";

import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { deleteInvoiceAction } from "@/app/actions/accounting";
import { toast } from "sonner";

interface Invoice {
  id: string;
  fatura_no: string;
  company?: { name: string };
  tarih: string;
  son_odeme_tarihi?: string | null;
  tip: string;
  genel_toplam: number;
  kdv_toplam: number;
  kalan_tutar: number;
  durum: string;
}

interface InvoiceListProps {
  title: string;
  invoices: Invoice[];
  type: "SATIS" | "ALIS";
  children?: React.ReactNode; // For adding custom buttons like upload
}

export default function InvoiceList({ title, invoices, type, children }: InvoiceListProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (id: string) => {
    setSelectedInvoiceId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bu faturayı silmek istediğinize emin misiniz? Bu işlem stok ve cari hareketlerini geri alacaktır.")) return;

    const result = await deleteInvoiceAction(id);
    if (result.success) {
        toast.success("Fatura başarıyla silindi");
    } else {
        toast.error("Hata: " + result.error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <div className="flex gap-4">
          {children}
          <Link 
            href={`/muhasebe/faturalar/yeni?type=${type}`} 
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={18} className="mr-2" />
            Yeni Fatura
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fatura No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">KDV</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices && invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(inv.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    #{inv.fatura_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {inv.company?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inv.tarih).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {inv.son_odeme_tarihi ? new Date(inv.son_odeme_tarihi).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      inv.tip === 'SATIS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {inv.tip === 'SATIS' ? 'Satış' : 'Alış'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {Number(inv.kdv_toplam || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {Number(inv.genel_toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {Number(inv.kalan_tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      inv.durum === 'ODENDI' ? 'bg-blue-100 text-blue-800' : 
                      inv.durum === 'KISMI_ODENDI' ? 'bg-orange-100 text-orange-800' :
                      inv.durum === 'IPTAL' ? 'bg-gray-100 text-gray-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {inv.durum === 'KISMI_ODENDI' ? 'Kısmi Ödendi' : inv.durum}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link 
                        href={`/muhasebe/faturalar/${inv.id}/duzenle`}
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                        onClick={(e) => e.stopPropagation()}
                        title="Düzenle"
                      >
                        <Edit size={18} />
                      </Link>
                      <button 
                        onClick={(e) => handleDelete(e, inv.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                  Kayıtlı {type === "ALIS" ? "alış" : "satış"} faturası bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InvoiceDetailModal 
        invoiceId={selectedInvoiceId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

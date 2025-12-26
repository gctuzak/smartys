"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getInvoiceDetailAction } from "@/app/actions/accounting";
import { Loader2 } from "lucide-react";

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoiceId, isOpen, onClose }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setLoading(true);
      getInvoiceDetailAction(invoiceId)
        .then((result) => {
          if (result.success) {
            setInvoice(result.data);
          } else {
            console.error(result.error);
          }
        })
        .finally(() => setLoading(false));
    } else {
        setInvoice(null);
    }
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fatura Detayı: {invoice?.fatura_no || "Yükleniyor..."}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Cari Bilgileri</p>
                <p className="font-medium text-lg">{invoice.company?.name || "-"}</p>
                <p>{invoice.company?.address}</p>
                <p>{invoice.company?.district} {invoice.company?.city ? `/ ${invoice.company?.city}` : ""}</p>
                {invoice.company?.tax_no && <p>VKN: {invoice.company?.tax_no}</p>}
              </div>
              <div className="space-y-1 text-right">
                <p><span className="font-semibold text-gray-500">Tarih:</span> {new Date(invoice.tarih).toLocaleDateString("tr-TR")}</p>
                <p><span className="font-semibold text-gray-500">Vade:</span> {invoice.son_odeme_tarihi ? new Date(invoice.son_odeme_tarihi).toLocaleDateString("tr-TR") : "-"}</p>
                <p><span className="font-semibold text-gray-500">Tip:</span> {invoice.tip === "ALIS" ? "Alış Faturası" : "Satış Faturası"}</p>
                <p><span className="font-semibold text-gray-500">Durum:</span> {invoice.durum}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 font-medium text-gray-700">
                  <tr>
                    <th className="p-3">Açıklama</th>
                    <th className="p-3 text-right">Miktar</th>
                    <th className="p-3 text-right">Birim Fiyat</th>
                    <th className="p-3 text-right">KDV %</th>
                    <th className="p-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3">{item.aciklama}</td>
                      <td className="p-3 text-right">{Number(item.miktar).toLocaleString("tr-TR")} {item.birim}</td>
                      <td className="p-3 text-right">{Number(item.birim_fiyat).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {invoice.para_birimi}</td>
                      <td className="p-3 text-right">%{item.kdv_orani}</td>
                      <td className="p-3 text-right font-medium">{Number(item.toplam_tutar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {invoice.para_birimi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ara Toplam:</span>
                  <span>{Number(invoice.ara_toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {invoice.para_birimi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">KDV Toplam:</span>
                  <span>{Number(invoice.kdv_toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {invoice.para_birimi}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Genel Toplam:</span>
                  <span>{Number(invoice.genel_toplam).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {invoice.para_birimi}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notlar && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                    <span className="font-semibold">Notlar:</span> {invoice.notlar}
                </div>
            )}
          </div>
        ) : (
            <div className="text-center p-8 text-gray-500">Fatura bulunamadı.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

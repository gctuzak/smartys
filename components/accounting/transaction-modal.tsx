"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addTransactionAction, getCompanyOrdersAction } from "@/app/actions/current-account";
import { getUnpaidInvoicesAction } from "@/app/actions/accounting";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess: () => void;
}

interface Order {
    id: string;
    order_no: string;
    amount: number;
    status: string;
}

interface Invoice {
    id: string;
    fatura_no: string;
    genel_toplam: number;
    kalan_tutar: number;
    tarih: string;
    tip: string;
}

export function TransactionModal({ isOpen, onClose, companyId, onSuccess }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [formData, setFormData] = useState({
    type: "TAHSILAT",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    docNo: "",
    description: "",
    orderId: "",
    faturaId: ""
  });

  useEffect(() => {
    if (isOpen && companyId) {
        // Fetch orders and invoices
        const fetchData = async () => {
            const [ordersRes, invoicesRes] = await Promise.all([
                getCompanyOrdersAction(companyId),
                getUnpaidInvoicesAction(companyId)
            ]);

            if (ordersRes.success) {
                setOrders(ordersRes.data || []);
            }
            if (invoicesRes.success) {
                setInvoices(invoicesRes.data || []);
            }
        };
        fetchData();
    }
  }, [isOpen, companyId]);

  const handleInvoiceChange = (invoiceId: string) => {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
          setFormData(prev => ({
              ...prev,
              faturaId: invoiceId,
              amount: invoice.kalan_tutar.toString(), // Auto-fill with remaining amount
              description: prev.description || `${invoice.fatura_no} nolu fatura tahsilatı`
          }));
      } else {
          setFormData(prev => ({ ...prev, faturaId: invoiceId }));
      }
  };

  const handleOrderChange = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        setFormData(prev => ({
            ...prev,
            orderId: orderId,
            description: prev.description || `${order.order_no} nolu sipariş avansı`
        }));
    } else {
        setFormData(prev => ({ ...prev, orderId: orderId }));
    }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Geçerli bir tutar giriniz");
      return;
    }

    setLoading(true);
    try {
      const result = await addTransactionAction({
        company_id: companyId,
        islem_turu: formData.type as any,
        tutar: Number(formData.amount),
        tarih: formData.date,
        belge_no: formData.docNo,
        aciklama: formData.description,
        order_id: (formData.orderId && formData.orderId !== "none") ? formData.orderId : undefined,
        fatura_id: (formData.faturaId && formData.faturaId !== "none") ? formData.faturaId : undefined
      });

      if (result.success) {
        toast.success("İşlem başarıyla kaydedildi");
        onSuccess();
        onClose();
        setFormData({
            type: "TAHSILAT",
            amount: "",
            date: new Date().toISOString().split("T")[0],
            docNo: "",
            description: "",
            orderId: "",
            faturaId: ""
        });
      } else {
        toast.error(result.error || "İşlem kaydedilemedi");
      }
    } catch (error) {
      toast.error("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Cari İşlem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">İşlem Türü</label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAHSILAT">Tahsilat (Giriş)</SelectItem>
                  <SelectItem value="ODEME">Ödeme (Çıkış)</SelectItem>
                  <SelectItem value="ACILIS_BAKIYESI">Açılış Bakiyesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarih</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* New Fields for Order and Invoice Selection */}
          {formData.type === "TAHSILAT" && (
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium">İlgili Sipariş (Avans)</label>
                      <Select
                          value={formData.orderId}
                          onValueChange={handleOrderChange}
                      >
                          <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">Seçiniz</SelectItem>
                              {orders.map((order) => (
                                  <SelectItem key={order.id} value={order.id}>
                                      {order.order_no}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-medium">İlgili Fatura (Kapama)</label>
                      <Select
                          value={formData.faturaId}
                          onValueChange={handleInvoiceChange}
                      >
                          <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">Seçiniz</SelectItem>
                              {invoices.map((invoice) => (
                                  <SelectItem key={invoice.id} value={invoice.id}>
                                      {invoice.fatura_no} ({Number(invoice.kalan_tutar).toLocaleString('tr-TR')} TL)
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tutar</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Belge No</label>
            <Input
              value={formData.docNo}
              onChange={(e) => setFormData({ ...formData, docNo: e.target.value })}
              placeholder="Örn: MK-001"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Açıklama</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="İşlem açıklaması..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

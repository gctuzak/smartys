"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addTransactionAction, getCompanyOrdersAction, getLatestRatesAction } from "@/app/actions/current-account";
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
  const [rates, setRates] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    type: "TAHSILAT",
    amount: "",
    currency: "TRY",
    exchangeRate: "1",
    date: new Date().toISOString().split("T")[0],
    docNo: "",
    description: "",
    orderId: "",
    faturaId: ""
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch rates
      getLatestRatesAction().then(res => {
          if (res.success && res.data) {
              setRates(res.data);
          }
      });
    }
  }, [isOpen]);

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

  const handleCurrencyChange = (val: string) => {
      let rate = "1";
      if (val === 'USD' && rates) rate = rates.usdSelling.toString();
      else if (val === 'EUR' && rates) rate = rates.eurSelling.toString();
      
      setFormData(prev => ({
          ...prev,
          currency: val,
          exchangeRate: rate
      }));
  };

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
        currency: formData.currency,
        exchangeRate: Number(formData.exchangeRate),
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
            currency: "TRY",
            exchangeRate: "1",
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
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
            <div className="space-y-2 col-span-1">
              <label className="text-sm font-medium">Para Birimi</label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TL (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-sm font-medium">Kur</label>
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                disabled={formData.currency === 'TRY'}
                placeholder="1.0000"
              />
            </div>
          </div>

          {formData.currency !== 'TRY' && formData.amount && (
            <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded text-sm text-right text-gray-600 border border-gray-100">
                    TL Karşılığı: <strong>{(Number(formData.amount) * Number(formData.exchangeRate)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</strong>
                </div>
                {Number(formData.exchangeRate) === 1 && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        Dikkat: Kur 1.00 olarak girildi. Güncel kur alınamamış olabilir. Lütfen kuru kontrol ediniz.
                    </div>
                )}
            </div>
          )}

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

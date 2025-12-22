"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addTransactionAction } from "@/app/actions/current-account";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess: () => void;
}

export function TransactionModal({ isOpen, onClose, companyId, onSuccess }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "TAHSILAT",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    docNo: "",
    description: "",
  });

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

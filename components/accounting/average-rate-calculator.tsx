"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, Calculator } from "lucide-react";

interface PaymentRow {
  id: string;
  date: string;
  amountTL: number;
  exchangeRate: number;
}

interface AverageRateCalculatorProps {
  totalAmountFX: number;
  currency: string;
  onApply: (description: string) => void;
  invoiceDate?: string;
  currentRate?: number;
}

export function AverageRateCalculator({
  totalAmountFX,
  currency,
  onApply,
  invoiceDate = new Date().toISOString().split("T")[0],
  currentRate = 1,
}: AverageRateCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: "1", date: "", amountTL: 0, exchangeRate: 0 },
  ]);

  const addPayment = () => {
    setPayments([
      ...payments,
      {
        id: Math.random().toString(36).substr(2, 9),
        date: "",
        amountTL: 0,
        exchangeRate: 0,
      },
    ]);
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const updatePayment = (id: string, field: keyof PaymentRow, value: any) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Calculations
  const totalPaidTL = payments.reduce((sum, p) => sum + (p.amountTL || 0), 0);
  const totalPaidFX = payments.reduce((sum, p) => {
    if (p.amountTL && p.exchangeRate) {
      return sum + p.amountTL / p.exchangeRate;
    }
    return sum;
  }, 0);

  const remainingFX = Math.max(0, totalAmountFX - totalPaidFX);
  const remainingTL = remainingFX * currentRate;
  
  const grandTotalTL = totalPaidTL + remainingTL;
  const weightedAverageRate = totalAmountFX > 0 ? grandTotalTL / totalAmountFX : 0;

  const handleApply = () => {
    // Generate text description
    let text = "Ödeme ve Kur Detayları:\n";
    
    payments.forEach((p) => {
      if (p.amountTL > 0) {
        const fxVal = p.exchangeRate ? (p.amountTL / p.exchangeRate).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
        const rateVal = p.exchangeRate ? p.exchangeRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 }) : "0.0000";
        text += `- ${p.date}: ${p.amountTL.toLocaleString("tr-TR")} TL (Kur: ${rateVal}) = ${fxVal} ${currency}\n`;
      }
    });

    if (remainingFX > 0.01) {
       text += `- ${invoiceDate} (Kalan): ${remainingTL.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL (Kur: ${currentRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}) = ${remainingFX.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}\n`;
    }

    text += `\nToplam İşlem Tutarı: ${grandTotalTL.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL / ${totalAmountFX.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${currency}\n`;
    text += `Ortalama Kur: ${weightedAverageRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })} TL`;

    onApply(text);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <Calculator className="w-4 h-4" />
          Ortalama Kur Hesapla
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ortalama Kur Hesaplama</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Fatura Tutarı ({currency})</p>
              <p className="text-xl font-bold">{totalAmountFX.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fatura Tarihi Kuru</p>
              <p className="text-xl font-bold">{currentRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 font-semibold">
                <tr>
                  <th className="p-2">Tarih</th>
                  <th className="p-2">Tutar (TL)</th>
                  <th className="p-2">Kur</th>
                  <th className="p-2">Karşılık ({currency})</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                    const fxVal = (p.amountTL && p.exchangeRate) ? p.amountTL / p.exchangeRate : 0;
                    return (
                        <tr key={p.id}>
                        <td className="p-2">
                            <Input
                            type="date"
                            value={p.date}
                            onChange={(e) => updatePayment(p.id, "date", e.target.value)}
                            className="h-8"
                            />
                        </td>
                        <td className="p-2">
                            <Input
                            type="number"
                            value={p.amountTL || ""}
                            onChange={(e) => updatePayment(p.id, "amountTL", parseFloat(e.target.value))}
                            placeholder="0.00"
                            className="h-8"
                            />
                        </td>
                        <td className="p-2">
                            <Input
                            type="number"
                            value={p.exchangeRate || ""}
                            onChange={(e) => updatePayment(p.id, "exchangeRate", parseFloat(e.target.value))}
                            placeholder="0.0000"
                            className="h-8"
                            />
                        </td>
                        <td className="p-2 font-mono text-right">
                            {fxVal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                            <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removePayment(p.id)}
                            >
                            <Trash2 className="w-4 h-4" />
                            </Button>
                        </td>
                        </tr>
                    );
                })}
                
                {/* Remaining Balance Row (Read Only / Calculated) */}
                <tr className="bg-blue-50/50">
                    <td className="p-2 text-gray-600 italic">
                        {invoiceDate} (Kalan)
                    </td>
                    <td className="p-2 font-mono text-gray-600">
                        {remainingTL.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 font-mono text-gray-600">
                        {currentRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}
                    </td>
                    <td className="p-2 font-mono text-right font-medium text-blue-700">
                        {remainingFX.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                </tr>
              </tbody>
            </table>
            <div className="p-2 bg-gray-50 border-t">
              <Button variant="ghost" size="sm" onClick={addPayment} className="text-blue-600">
                <Plus className="w-4 h-4 mr-1" /> Ödeme Ekle
              </Button>
            </div>
          </div>

          <div className="bg-slate-100 p-4 rounded-lg space-y-2">
             <div className="flex justify-between">
                <span>Toplam TL Karşılığı:</span>
                <span className="font-bold">{grandTotalTL.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
             </div>
             <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-lg font-semibold">Ortalama Kur:</span>
                <span className="text-xl font-bold text-blue-700">{weightedAverageRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })} TL</span>
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
          <Button onClick={handleApply}>Hesapla ve Faturaya Ekle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

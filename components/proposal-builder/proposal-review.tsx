import { ParsedData } from "@/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveProposalAction } from "@/app/actions/save-proposal";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { ProductAutocomplete } from "./product-autocomplete";
import { ProductSearchResult } from "@/app/actions/search-products";

interface ProposalReviewProps {
  initialData: ParsedData;
  originalFile: File | null;
  onSuccess: () => void;
}

export function ProposalReview({ initialData, originalFile, onSuccess }: ProposalReviewProps) {
  const [data, setData] = useState<ParsedData>(() => ({
    ...initialData,
    person: initialData.person ?? { name: "", email: "", phone: "", title: "" }
  }));
  const [isSaving, setIsSaving] = useState(false);

  const handleCompanyChange = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value,
      },
    }));
  };

  const handlePersonChange = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      person: {
        ...(prev.person || { name: "", email: "", phone: "", title: "" }),
        [field]: value,
      },
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...data.proposal.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    
    // Recalculate totals if quantity or unit price changes
    if (field === "quantity" || field === "unitPrice") {
      const qty = Number(newItems[index].quantity);
      const price = Number(newItems[index].unitPrice);
      newItems[index].totalPrice = qty * price;
    }

    const newTotalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const vatRate = data.proposal.vatRate ?? 20;
    const vatAmount = newTotalAmount * (vatRate / 100);
    const grandTotal = newTotalAmount + vatAmount;

    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: newItems,
        totalAmount: newTotalAmount,
        vatRate,
        vatAmount,
        grandTotal
      },
    }));
  };
  const handleProductSelect = (index: number, product: ProductSearchResult) => {
    const newItems = [...data.proposal.items];
    
    // Update fields from product
    newItems[index] = {
      ...newItems[index],
      description: product.name,
      unit: product.unit || newItems[index].unit,
      unitPrice: product.defaultPrice ? Number(product.defaultPrice) : newItems[index].unitPrice,
    };

    // Recalculate total
    const qty = Number(newItems[index].quantity);
    const price = Number(newItems[index].unitPrice);
    newItems[index].totalPrice = qty * price;

    const newTotalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const vatRate = data.proposal.vatRate ?? 20;
    const vatAmount = newTotalAmount * (vatRate / 100);
    const grandTotal = newTotalAmount + vatAmount;

    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: newItems,
        totalAmount: newTotalAmount,
        vatRate,
        vatAmount,
        grandTotal
      },
    }));
  };

  const handleAttrChange = (index: number, key: "enCm" | "boyCm" | "adet", value: number) => {
    const newItems = [...data.proposal.items];
    const attrs: Record<string, unknown> = { ...(newItems[index].attributes || {}) };
    attrs[key] = value;
    newItems[index] = { ...newItems[index], attributes: attrs };
    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: newItems,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveProposalAction(data);
      if (result.success) {
        if (originalFile) {
          const formData = new FormData();
          formData.append("file", originalFile);
          formData.append("type", "excel");
          formData.append("proposalId", result.proposalId);
          if (result.companyId) formData.append("companyId", result.companyId);
          if (result.personId) formData.append("personId", result.personId);
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();
          if (!json.success) {
            toast.error("Excel dokümanı yüklenemedi");
          }
        }
        toast.success("Teklif başarıyla kaydedildi!");
        onSuccess();
      } else {
        // Type narrowing for the error case
        const errorMsg = "error" in result ? (result as { error: string }).error : "Kaydetme başarısız oldu.";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    const normalizedItems = (data.proposal.items || []).map((i) => {
      const qty = Number(i.quantity) || 0;
      const price = Number(i.unitPrice) || 0;
      const total = price && qty ? qty * price : Number(i.totalPrice) || 0;
      return { ...i, quantity: qty, unitPrice: price, totalPrice: total };
    });
    const totalAmount = normalizedItems.reduce((s, x) => s + x.totalPrice, 0);
    const vatRate = data.proposal.vatRate ?? 20;
    const vatAmount = totalAmount * (vatRate / 100);
    const grandTotal = totalAmount + vatAmount;

    setData((prev) => ({
      ...prev,
      proposal: { ...prev.proposal, items: normalizedItems, totalAmount, vatRate, vatAmount, grandTotal },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Customer Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Şirket Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Şirket Adı</label>
            <Input
              value={data.company.name || ""}
              onChange={(e) => handleCompanyChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">E-posta</label>
            <Input
              value={data.company.contactInfo.email || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  company: {
                    ...prev.company,
                    contactInfo: { ...prev.company.contactInfo, email: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">İlgili Kişi / Alt Şirket</label>
            <Input
              value={(data.company.contactInfo as Record<string, unknown>).company as string || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  company: {
                    ...prev.company,
                    contactInfo: { ...prev.company.contactInfo, company: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Proje</label>
            <Input
              value={(data.company.contactInfo as Record<string, unknown>).project as string || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  company: {
                    ...prev.company,
                    contactInfo: { ...prev.company.contactInfo, project: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefon</label>
            <Input
              value={data.company.contactInfo.phone || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  company: {
                    ...prev.company,
                    contactInfo: { ...prev.company.contactInfo, phone: e.target.value },
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Person Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Kişi Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ad Soyad</label>
            <Input
              value={data.person?.name || ""}
              onChange={(e) => handlePersonChange("name", e.target.value)}
              placeholder="Ad Soyad"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unvan</label>
            <Input
              value={data.person?.title || ""}
              onChange={(e) => handlePersonChange("title", e.target.value)}
              placeholder="Unvan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">E-posta</label>
            <Input
              value={data.person?.email || ""}
              onChange={(e) => handlePersonChange("email", e.target.value)}
              placeholder="E-posta"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefon</label>
            <Input
              value={data.person?.phone || ""}
              onChange={(e) => handlePersonChange("phone", e.target.value)}
              placeholder="Telefon"
            />
          </div>
        </CardContent>
      </Card>

      {/* Proposal Items Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Teklif Kalemleri</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Para Birimi:</span>
                <select
                  value={data.proposal.currency}
                  onChange={(e) => setData(prev => ({ ...prev, proposal: { ...prev.proposal, currency: e.target.value } }))}
                  className="h-8 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="TRY">TL (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
            </div>
            <div className="text-lg font-bold text-green-600">
                Toplam: {(() => {
                  try {
                    return data.proposal.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: data.proposal.currency || "TRY" });
                  } catch {
                    return `${data.proposal.totalAmount.toLocaleString("tr-TR")} ${data.proposal.currency}`;
                  }
                })()}
            </div>
            <div className="text-lg font-bold text-gray-600">
                KDV (%{data.proposal.vatRate ?? 20}): {(() => {
                  try {
                    return (data.proposal.vatAmount ?? 0).toLocaleString("tr-TR", { style: "currency", currency: data.proposal.currency || "TRY" });
                  } catch {
                    return `${(data.proposal.vatAmount ?? 0).toLocaleString("tr-TR")} ${data.proposal.currency}`;
                  }
                })()}
            </div>
            <div className="text-xl font-bold text-green-700">
                Genel Toplam: {(() => {
                  try {
                    return (data.proposal.grandTotal ?? 0).toLocaleString("tr-TR", { style: "currency", currency: data.proposal.currency || "TRY" });
                  } catch {
                    return `${(data.proposal.grandTotal ?? 0).toLocaleString("tr-TR")} ${data.proposal.currency}`;
                  }
                })()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Açıklama</TableHead>
                  <TableHead>EN (cm)</TableHead>
                  <TableHead>BOY (cm)</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead>Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.proposal.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <ProductAutocomplete
                        value={item.description}
                        onChange={(val) => handleItemChange(index, "description", val)}
                        onSelect={(product) => handleProductSelect(index, product)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={(item.attributes?.enCm as number) || 0}
                        onChange={(e) => handleAttrChange(index, "enCm", Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={(item.attributes?.boyCm as number) || 0}
                        onChange={(e) => handleAttrChange(index, "boyCm", Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={(item.attributes?.adet as number) || 0}
                        onChange={(e) => handleAttrChange(index, "adet", Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.totalPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button 
            variant="outline" 
            onClick={onSuccess}
            disabled={isSaving}
        >
            İptal
        </Button>
        <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
        >
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Onayla ve Kaydet
                </>
            )}
        </Button>
      </div>
    </div>
  );
}

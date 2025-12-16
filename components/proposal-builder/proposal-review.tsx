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
import { Loader2, Save, Plus, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
    if (!newItems[index].isHeader && (field === "quantity" || field === "unitPrice")) {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].totalPrice = qty * price;
    }

    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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

    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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

  const handleAddLine = () => {
    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: [
          ...prev.proposal.items,
          {
            description: "",
            quantity: 1,
            unit: "adet",
            unitPrice: 0,
            totalPrice: 0,
            order: prev.proposal.items.length,
          },
        ],
      },
    }));
  };

  const handleAddHeader = () => {
    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: [
          ...prev.proposal.items,
          {
            description: "",
            quantity: undefined,
            unit: "",
            unitPrice: undefined,
            totalPrice: undefined,
            isHeader: true,
            order: prev.proposal.items.length,
          },
        ],
      },
    }));
  };

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedItems, setPastedItems] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  
  const handlePasteExcel = async () => {
    if (!pastedItems.trim()) return;

    setIsParsing(true);
    try {
      const { parseItemsTextAction } = await import("@/app/actions/parse-items");
      const result = await parseItemsTextAction(pastedItems);
      
      if (result.success && result.data) {
        const newItems = result.data.map((item: any) => ({
          ...item,
          isHeader: false,
        }));
        
        const allItems = [...data.proposal.items, ...newItems];
        const newTotalAmount = allItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        const vatRate = data.proposal.vatRate ?? 20;
        const vatAmount = newTotalAmount * (vatRate / 100);
        const grandTotal = newTotalAmount + vatAmount;

        setData((prev) => ({
          ...prev,
          proposal: {
            ...prev.proposal,
            items: allItems,
            totalAmount: newTotalAmount,
            vatAmount,
            grandTotal
          },
        }));

        setPastedItems("");
        setIsPasteModalOpen(false);
        toast.success("Kalemler başarıyla eklendi");
      } else {
        toast.error("Ayrıştırma başarısız oldu");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      setIsParsing(false);
    }
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
      if (i.isHeader) return i;
      const qty = Number(i.quantity) || 0;
      const price = Number(i.unitPrice) || 0;
      const total = price && qty ? qty * price : Number(i.totalPrice) || 0;
      return { ...i, quantity: qty, unitPrice: price, totalPrice: total };
    });
    const totalAmount = normalizedItems.reduce((s, x) => s + (x.totalPrice || 0), 0);
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
                  <option value="EUR">EUR (€)</option>
                  <option value="TRY">TL (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
            </div>
            <div className="text-lg font-bold text-green-600">
                Toplam: {(() => {
                  try {
                    return data.proposal.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: (data.proposal.currency || "EUR").replace('TL', 'TRY') });
                  } catch {
                    return `${data.proposal.totalAmount.toLocaleString("tr-TR")} ${data.proposal.currency}`;
                  }
                })()}
            </div>
            <div className="text-lg font-bold text-gray-600">
                KDV (%{data.proposal.vatRate ?? 20}): {(() => {
                  try {
                    return (data.proposal.vatAmount ?? 0).toLocaleString("tr-TR", { style: "currency", currency: (data.proposal.currency || "EUR").replace('TL', 'TRY') });
                  } catch {
                    return `${(data.proposal.vatAmount ?? 0).toLocaleString("tr-TR")} ${data.proposal.currency}`;
                  }
                })()}
            </div>
            <div className="text-xl font-bold text-green-700">
                Genel Toplam: {(() => {
                  try {
                    return (data.proposal.grandTotal ?? 0).toLocaleString("tr-TR", { style: "currency", currency: (data.proposal.currency || "EUR").replace('TL', 'TRY') });
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
                  <TableRow key={index} className={item.isHeader ? "bg-gray-50" : ""}>
                    {item.isHeader ? (
                      <TableCell colSpan={8}>
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                            className="font-bold border-none bg-transparent h-auto p-0 focus-visible:ring-0 w-full"
                            placeholder="Bölüm Başlığı / Açıklama Satırı"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 ml-auto"
                            onClick={() => {
                              const newItems = [...data.proposal.items];
                              newItems.splice(index, 1);
                              setData((prev) => ({ ...prev, proposal: { ...prev.proposal, items: newItems } }));
                            }}
                          >
                            Sil
                          </Button>
                        </div>
                      </TableCell>
                    ) : (
                      <>
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
                            value={item.quantity ?? 0}
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
                            value={item.unitPrice ?? 0}
                            onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(item.totalPrice ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-4 h-4 mr-2" /> Satır Ekle
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddHeader}>
                <Plus className="w-4 h-4 mr-2" /> Başlık/Açıklama Ekle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsPasteModalOpen(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel'den Ekle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Excel'den Ürün Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
              Excel'den ürün listesini kopyalayıp aşağıdaki alana yapıştırın. Sütunların sırası önemli değildir.
            </div>
            <textarea
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ürün Adı | Adet | Birim | Fiyat..."
              value={pastedItems}
              onChange={(e) => setPastedItems(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasteModalOpen(false)}>
              İptal
            </Button>
            <Button onClick={handlePasteExcel} disabled={!pastedItems.trim() || isParsing}>
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

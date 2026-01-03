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
import { updateProposalAction } from "@/app/actions/update-proposal";
import { toast } from "sonner";
import { Loader2, Save, Plus, FileSpreadsheet, GripVertical, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProductAutocomplete } from "./product-autocomplete";
import { ProductSearchResult } from "@/app/actions/search-products";
import { EntityVerificationModal } from "./entity-verification-modal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrency } from "@/lib/utils";

interface ProposalReviewProps {
  initialData: ParsedData;
  originalFile: File | null;
  onSuccess: () => void;
  isEditing?: boolean;
  proposalId?: string;
  onCancel?: () => void;
}

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

interface SpecsCellProps {
  item: any;
  index: number;
  handleSpecChange: (index: number, key: "kelvin" | "watt" | "lumen", value: number) => void;
  handleDimensionChange: (index: number, key: "width" | "length" | "pieceCount", value: number) => void;
}

function SpecsCell({ item, index, handleSpecChange, handleDimensionChange }: SpecsCellProps) {
  const [forceVisible, setForceVisible] = useState<string[]>([]);

  const specs = [
    { key: "width", label: "EN", type: "dim", suffix: "cm" },
    { key: "length", label: "BOY", type: "dim", suffix: "cm" },
    { key: "pieceCount", label: "ADET", type: "dim", suffix: "" },
    { key: "kelvin", label: "K", type: "spec", suffix: "" },
    { key: "watt", label: "WATT", type: "spec", suffix: "" },
    { key: "lumen", label: "LÜMEN", type: "spec", suffix: "" },
  ] as const;

  const isVisible = (key: string, val: number | undefined | null) => {
    return (val && val > 0) || forceVisible.includes(key);
  };

  const visibleSpecs = specs.filter((s) => isVisible(s.key, item[s.key]));
  const hiddenSpecs = specs.filter((s) => !isVisible(s.key, item[s.key]));

  const handleFocus = (key: string) => {
    if (!forceVisible.includes(key)) {
      setForceVisible((prev) => [...prev, key]);
    }
  };

  const handleBlur = (key: string, val: number) => {
    if (!val || val === 0) {
      setForceVisible((prev) => prev.filter((k) => k !== key));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
      {visibleSpecs.map((spec) => (
        <div
          key={spec.key}
          className={`flex items-center border rounded px-2 h-7 transition-all animate-in fade-in zoom-in-95 duration-200 ${
            spec.type === "dim"
              ? "bg-blue-50/50 border-blue-100 hover:border-blue-300"
              : "bg-orange-50/50 border-orange-100 hover:border-orange-300"
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase mr-1.5 ${
              spec.type === "dim" ? "text-blue-600" : "text-orange-600"
            }`}
          >
            {spec.label}
          </span>
          <input
            type="number"
            value={item[spec.key] ?? ""}
            onFocus={() => handleFocus(spec.key)}
            onBlur={(e) => handleBlur(spec.key, parseFloat(e.target.value) || 0)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const numVal = isNaN(val) ? 0 : val;
              if (spec.type === "dim") {
                handleDimensionChange(index, spec.key as any, numVal);
              } else {
                handleSpecChange(index, spec.key as any, numVal);
              }
            }}
            className="w-12 bg-transparent text-xs font-medium text-gray-700 focus:outline-none placeholder:text-gray-300 text-center"
            placeholder="-"
          />
        </div>
      ))}

      {hiddenSpecs.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <div className="text-[10px] font-semibold text-gray-400 px-2 py-1.5 uppercase tracking-wider">
              Özellik Ekle
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {hiddenSpecs.map((spec) => (
                <button
                  key={spec.key}
                  onClick={() => {
                    setForceVisible((prev) => [...prev, spec.key]);
                  }}
                  className="flex items-center w-full px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-sm text-left group transition-colors"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                    spec.type === "dim" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                  }`}>
                    <Plus className="w-3 h-3" />
                  </div>
                  <span
                    className={`font-semibold mr-auto ${
                      spec.type === "dim" ? "text-blue-600" : "text-orange-600"
                    }`}
                  >
                    {spec.label}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">
                    {spec.type === "dim" ? "Boyut" : "Teknik"}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function SortableRow({ id, children, className }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "bg-accent opacity-50 shadow-md" : ""} ${className || ""}`}
    >
      <TableCell className="w-[40px] p-0 text-center align-middle">
        <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab hover:bg-gray-100 p-2 rounded-md inline-flex items-center justify-center active:cursor-grabbing"
        >
            <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      {children}
    </TableRow>
  );
}

export function ProposalReview({ initialData, originalFile, onSuccess, isEditing, proposalId, onCancel }: ProposalReviewProps) {
  const [data, setData] = useState<ParsedData>(() => {
    // Ensure all items have an ID for drag and drop
    const itemsWithIds = initialData.proposal.items.map(item => ({
      ...item,
      id: item.id || Math.random().toString(36).substring(2, 15)
    }));
    
    return {
      ...initialData,
      person: initialData.person ?? { name: "", email: "", phone: "", title: "" },
      proposal: {
        ...initialData.proposal,
        items: itemsWithIds
      }
    };
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.proposal.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.proposal.items.findIndex((item) => item.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newItems = arrayMove(prev.proposal.items, oldIndex, newIndex);
            // Update order field based on new index
            const updatedItems = newItems.map((item, index) => ({
                ...item,
                order: index
            }));
            
            return {
                ...prev,
                proposal: {
                    ...prev.proposal,
                    items: updatedItems
                }
            };
        }
        return prev;
      });
    }
  };

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

  const handleSpecChange = (index: number, key: "kelvin" | "watt" | "lumen", value: number) => {
    const newItems = [...data.proposal.items];
    newItems[index] = {
      ...newItems[index],
      [key]: value
    };
    
    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: newItems
      }
    }));
  };

  const handleDimensionChange = (index: number, key: "width" | "length" | "pieceCount", value: number) => {
    const newItems = [...data.proposal.items];
    
    // Update the specific field
    newItems[index] = {
      ...newItems[index],
      [key]: value
    };
    
    // Otomatik Miktar Hesaplama (m2 veya mt)
    const en = key === 'width' ? value : Number(newItems[index].width) || 0;
    const boy = key === 'length' ? value : Number(newItems[index].length) || 0;
    const adet = key === 'pieceCount' ? value : Number(newItems[index].pieceCount) || 0;

    let newQuantity = newItems[index].quantity;

    if (en > 0 && boy > 0) {
      const adetVal = adet || 1;
      
      // Metretül (mt) kontrolü: En veya Boy < 70cm ise
      if (en < 70 || boy < 70) {
        // Uzun kenar metretül olarak baz alınır
        const lengthCm = Math.max(en, boy);
        const mt = (lengthCm / 100) * adetVal;
        newQuantity = Number(mt.toFixed(2));
        
        // Birim güncelleme (eğer uygunsa)
        if (!newItems[index].unit || newItems[index].unit === 'adet' || newItems[index].unit === 'm²') {
          newItems[index].unit = 'mt';
        }
      } else {
        // m2 hesabı: (En/100) * (Boy/100) * Adet
        const m2 = (en / 100) * (boy / 100) * adetVal;
        newQuantity = Number(m2.toFixed(2));
        
        // Birim güncelleme (eğer uygunsa)
        if (!newItems[index].unit || newItems[index].unit === 'adet' || newItems[index].unit === 'mt') {
          newItems[index].unit = 'm²';
        }
      }
    } else if (key === 'pieceCount' && adet > 0 && en === 0 && boy === 0) {
      // Sadece adet değiştiyse ve boyut yoksa miktarı adete eşitle
      newQuantity = adet;
    }

    newItems[index] = { 
      ...newItems[index], 
      quantity: newQuantity
    };

    // Recalculate total price with new quantity
    const qty = Number(newQuantity) || 0;
    const price = Number(newItems[index].unitPrice) || 0;
    newItems[index].totalPrice = qty * price;

    // Recalculate grand totals
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

  const handleAddLine = () => {
    setData((prev) => ({
      ...prev,
      proposal: {
        ...prev.proposal,
        items: [
          ...prev.proposal.items,
          {
            id: Math.random().toString(36).substring(2, 15),
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
            id: Math.random().toString(36).substring(2, 15),
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
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
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
          id: Math.random().toString(36).substring(2, 15),
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
      let result: { success: boolean; proposalId?: string; error?: string; companyId?: string | null; personId?: string | null };
      if (isEditing && proposalId) {
        result = await updateProposalAction(proposalId, data);
      } else {
        result = await saveProposalAction(data);
      }

      if (result.success) {
        if (originalFile && !isEditing && result.proposalId) {
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
        toast.success(isEditing ? "Teklif güncellendi!" : "Teklif başarıyla kaydedildi!");
        onSuccess();
      } else {
        // Type narrowing for the error case
        const errorMsg = "error" in result ? (result as { error: string }).error : "İşlem başarısız oldu.";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1400px] mx-auto pb-20">
      <EntityVerificationModal 
        isOpen={isVerificationOpen} 
        onClose={() => setIsVerificationOpen(false)} 
        data={data}
        onDataUpdate={setData}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Info Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100/50">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Şirket Bilgileri</h3>
             </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şirket Adı</label>
              <Input
                className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                value={data.company.name || ""}
                onChange={(e) => handleCompanyChange("name", e.target.value)}
                placeholder="Şirket Adı Giriniz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-posta</label>
                <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
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
                    placeholder="ornek@sirket.com"
                />
                </div>
                <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</label>
                <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
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
                    placeholder="0555 555 55 55"
                />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">İlgili Kişi / Alt Şirket</label>
                    <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
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
                    placeholder="Alt Şirket / Departman"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proje</label>
                    <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
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
                    placeholder="Proje Adı"
                    />
                </div>
            </div>
          </div>
        </div>

        {/* Person Info Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100/50">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Plus className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900">Kişi Bilgileri</h3>
             </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Soyad</label>
                    <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                    value={data.person?.name || ""}
                    onChange={(e) => handlePersonChange("name", e.target.value)}
                    placeholder="Ad Soyad"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unvan</label>
                    <Input
                    className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                    value={data.person?.title || ""}
                    onChange={(e) => handlePersonChange("title", e.target.value)}
                    placeholder="Unvan"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-posta</label>
                <Input
                className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                value={data.person?.email || ""}
                onChange={(e) => handlePersonChange("email", e.target.value)}
                placeholder="E-posta"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</label>
                <Input
                className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-lg"
                value={data.person?.phone || ""}
                onChange={(e) => handlePersonChange("phone", e.target.value)}
                placeholder="Telefon"
                />
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Items Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white rounded-lg shadow-sm">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
             </div>
             <h3 className="font-bold text-gray-900">Teklif Kalemleri</h3>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
            <span className="text-sm font-medium text-gray-500 pl-2">Para Birimi:</span>
            <select
              value={data.proposal.currency}
              onChange={(e) => setData(prev => ({ ...prev, proposal: { ...prev.proposal, currency: e.target.value } }))}
              className="h-8 rounded-md border-0 bg-gray-50 py-1 pl-3 pr-8 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option value="EUR">EUR (€)</option>
              <option value="TRY">TL (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[25%] font-semibold text-gray-600">Açıklama</TableHead>
                  <TableHead className="font-semibold text-gray-600 w-[30%]">Detaylar</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-center w-[80px]">Miktar</TableHead>
                  <TableHead className="font-semibold text-gray-600 w-[70px]">Birim</TableHead>
                  <TableHead className="font-semibold text-gray-600 w-[100px]">Birim Fiyat</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600 w-[100px]">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={data.proposal.items.map(i => i.id || '')} strategy={verticalListSortingStrategy}>
                  {data.proposal.items.map((item, index) => (
                    <SortableRow key={item.id || index} id={item.id || ''} className={`group transition-colors ${item.isHeader ? "bg-gray-50/80 hover:bg-gray-100" : "hover:bg-blue-50/30"}`}>
                      {item.isHeader ? (
                        <TableCell colSpan={7} className="py-3">
                          <div className="flex items-center gap-3 px-2">
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(index, "description", e.target.value)}
                              className="font-bold text-gray-900 border-transparent bg-transparent h-10 px-3 focus-visible:ring-0 focus:border-gray-200 focus:bg-white w-full text-lg placeholder:text-gray-400"
                              placeholder="Bölüm Başlığı / Açıklama Satırı"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <TableCell className="py-2 align-top">
                            <ProductAutocomplete
                              value={item.description}
                              onChange={(val) => handleItemChange(index, "description", val)}
                              onSelect={(product) => handleProductSelect(index, product)}
                              className="w-full border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all rounded-md h-9"
                            />
                          </TableCell>
                          <TableCell className="py-2 align-top">
                             <SpecsCell 
                                item={item} 
                                index={index} 
                                handleSpecChange={handleSpecChange} 
                                handleDimensionChange={handleDimensionChange} 
                             />
                          </TableCell>
                          <TableCell className="p-1 align-top pt-3">
                            <Input
                              type="number"
                              value={item.quantity ?? 0}
                              onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                              className="w-full text-center font-medium text-gray-900 border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all rounded-md h-9 px-1"
                            />
                          </TableCell>
                          <TableCell className="p-1 align-top pt-3">
                            <Input
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                              className="w-full border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all rounded-md h-9 px-2"
                            />
                          </TableCell>
                          <TableCell className="p-1 align-top pt-3">
                            <Input
                              type="number"
                              value={item.unitPrice ?? 0}
                              onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                              className="w-full border-transparent bg-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all rounded-md h-9 px-2"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-900 py-2 pr-4 align-top pt-4">
                            {(item.totalPrice ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="w-[40px] p-0 text-center align-top pt-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => {
                                const newItems = [...data.proposal.items];
                                newItems.splice(index, 1);
                                setData((prev) => ({ ...prev, proposal: { ...prev.proposal, items: newItems } }));
                              }}
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </SortableRow>
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
            </DndContext>
            
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <Button variant="outline" size="sm" onClick={handleAddLine} className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                <Plus className="w-4 h-4 mr-2" /> Satır Ekle
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddHeader} className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all">
                <Plus className="w-4 h-4 mr-2" /> Başlık Ekle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsPasteModalOpen(true)} className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel'den Ekle
              </Button>
            </div>
          </div>
          
          {/* Totals Summary */}
          <div className="mt-8 flex justify-end">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 min-w-[320px] space-y-4">
                <div className="flex justify-between items-center text-gray-500">
                    <span className="font-medium">Ara Toplam</span>
                    <span className="font-semibold text-gray-900">
                        {formatCurrency(data.proposal.totalAmount, data.proposal.currency)}
                    </span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                    <span className="font-medium">KDV (%{data.proposal.vatRate ?? 20})</span>
                    <span className="font-semibold text-gray-900">
                        {formatCurrency(data.proposal.vatAmount ?? 0, data.proposal.currency)}
                    </span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Genel Toplam</span>
                    <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(data.proposal.grandTotal ?? 0, data.proposal.currency)}
                    </span>
                </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 rounded-2xl">
          <DialogHeader className="p-6 bg-gray-50 border-b">
            <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Excel'den Ürün Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
              Excel'den ürün listesini kopyalayıp aşağıdaki alana yapıştırın. Yapay zeka sütunları otomatik olarak algılayacaktır.
            </div>
            <textarea
              className="flex min-h-[200px] w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent resize-y placeholder:text-gray-400"
              placeholder="Örnek:
Laptop | 5 Adet | 25000 TL
Masa | 2 Adet | 5000 TL"
              value={pastedItems}
              onChange={(e) => setPastedItems(e.target.value)}
            />
          </div>
          <DialogFooter className="p-6 bg-gray-50 border-t gap-2">
            <Button variant="outline" onClick={() => setIsPasteModalOpen(false)} className="rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200">
              İptal
            </Button>
            <Button onClick={handlePasteExcel} disabled={!pastedItems.trim() || isParsing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-200">
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Otomatik Ayrıştır ve Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <div className="sticky bottom-4 z-50">
        <div className="bg-white/80 backdrop-blur-md border border-gray-200 shadow-2xl rounded-2xl p-4 flex justify-between items-center max-w-4xl mx-auto">
            <div className="text-sm text-gray-500 font-medium pl-2">
                Teklif hazırlanıyor...
            </div>
            <div className="flex gap-3">
                <Button 
                    variant="ghost" 
                    onClick={onSuccess}
                    disabled={isSaving}
                    className="hover:bg-red-50 hover:text-red-600 rounded-xl"
                >
                    İptal
                </Button>
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[180px] rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Kaydediliyor...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" /> Onayla ve Kaydet
                        </>
                    )}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}

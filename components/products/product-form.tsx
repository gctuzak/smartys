"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product, saveProductAction } from "@/app/actions/products";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>(
    initialData || {
      name: "",
      code: "",
      type: "product",
      description: "",
      unit: "",
      cost: 0,
      defaultPrice: 0,
      currency: "EUR",
      vatRate: 20,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await saveProductAction(formData as Product);
      if (result.success) {
        toast.success(initialData ? "Ürün güncellendi" : "Ürün oluşturuldu");
        onSuccess();
      } else {
        toast.error(result.error || "Bir hata oluştu");
      }
    } catch (error) {
        console.error(error);
      toast.error("Beklenmedik bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof Product, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ürün Adı *</label>
          <Input
            required
            value={formData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Örn: Gergi Tavan"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Ürün Kodu</label>
          <Input
            value={formData.code || ""}
            onChange={(e) => handleChange("code", e.target.value)}
            placeholder="Örn: GT-001"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tip</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.type || "product"}
            onChange={(e) => handleChange("type", e.target.value)}
          >
            <option value="product">Stoklu Ürün</option>
            <option value="service">Hizmet / Masraf</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Açıklama</label>
        <Input
          value={formData.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Ürün açıklaması..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Birim</label>
          <Input
            value={formData.unit || ""}
            onChange={(e) => handleChange("unit", e.target.value)}
            placeholder="mt, adet..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">KDV (%)</label>
          <Input
            type="number"
            min="0"
            value={formData.vatRate}
            onChange={(e) => handleChange("vatRate", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Para Birimi</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.currency}
            onChange={(e) => handleChange("currency", e.target.value)}
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="TRY">TRY (₺)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Maliyet</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.cost || 0}
            onChange={(e) => handleChange("cost", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Satış Fiyatı</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.defaultPrice || 0}
            onChange={(e) => handleChange("defaultPrice", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          İptal
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor
            </>
          ) : (
            initialData ? "Güncelle" : "Oluştur"
          )}
        </Button>
      </div>
    </form>
  );
}

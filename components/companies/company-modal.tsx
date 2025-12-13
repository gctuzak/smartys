'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCompanyAction } from "@/app/actions/save-company";
import { getUsersAction } from "@/app/actions/fetch-data";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: any; // If provided, we are editing
  onSuccess: () => void;
}

export function CompanyModal({ isOpen, onClose, company, onSuccess }: CompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    tax_no: "",
    tax_office: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    representative_id: "",
  });

  useEffect(() => {
    // Fetch users for the dropdown
    const fetchUsers = async () => {
      const result = await getUsersAction(1, 100); // Fetch first 100 users
      if (result.success) {
        setUsers(result.data || []);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        tax_no: company.tax_no || "",
        tax_office: company.tax_office || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        representative_id: company.representative_id || "",
      });
    } else {
      setFormData({
        name: "",
        tax_no: "",
        tax_office: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        representative_id: "",
      });
    }
  }, [company, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Şirket adı zorunludur.");
      return;
    }

    setLoading(true);
    try {
      const result = await saveCompanyAction({
        id: company?.id,
        ...formData,
      });

      if (result.success) {
        toast.success(company ? "Şirket güncellendi" : "Şirket oluşturuldu");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Bir hata oluştu");
      }
    } catch (error) {
      toast.error("Beklenmedik bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? "Şirketi Düzenle" : "Yeni Şirket Ekle"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Şirket Adı *</label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Şirket ünvanı"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Vergi No</label>
            <Input
              name="tax_no"
              value={formData.tax_no}
              onChange={handleChange}
              placeholder="Vergi numarası"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Vergi Dairesi</label>
            <Input
              name="tax_office"
              value={formData.tax_office}
              onChange={handleChange}
              placeholder="Vergi dairesi"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Adres</label>
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Açık adres"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Telefon</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Telefon numarası"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">E-posta</label>
            <Input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-posta adresi"
              type="email"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Web Sitesi</label>
          <Input
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Müşteri Temsilcisi</label>
          <select
            name="representative_id"
            value={formData.representative_id}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seçiniz...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {company ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

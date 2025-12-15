'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCompanyAction } from "@/app/actions/save-company";
import { getRepresentativesAction } from "@/app/actions/fetch-data";
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
    type: "Müşteri",
    tax_no: "",
    tax_office: "",
    address: "",
    city: "",
    district: "",
    country: "Türkiye",
    post_code: "",
    phone1: "",
    phone1Type: "cep",
    phone2: "",
    phone2Type: "cep",
    phone3: "",
    phone3Type: "santral",
    email1: "",
    email2: "",
    website: "",
    notes: "",
    authorized_person: "",
    representative_id: "",
  });

  useEffect(() => {
    // Fetch users for the dropdown
    const fetchUsers = async () => {
      const result = await getRepresentativesAction();
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
        type: company.type || "Müşteri",
        tax_no: company.tax_no || "",
        tax_office: company.tax_office || "",
        address: company.address || "",
        city: company.city || "",
        district: company.district || "",
        country: company.country || "Türkiye",
        post_code: company.post_code || "",
        phone1: company.phone1 || "",
        phone1Type: company.phone1_type || "cep",
        phone2: company.phone2 || "",
        phone2Type: company.phone2_type || "cep",
        phone3: company.phone3 || "",
        phone3Type: company.phone3_type || "santral",
        email1: company.email1 || "",
        email2: company.email2 || "",
        website: company.website || "",
        notes: company.notes || "",
        authorized_person: company.authorized_person || "",
        representative_id: company.representative_id || "",
      });
    } else {
      setFormData({
        name: "",
        type: "Müşteri",
        tax_no: "",
        tax_office: "",
        address: "",
        city: "",
        district: "",
        country: "Türkiye",
        post_code: "",
        phone1: "",
        phone1Type: "cep",
        phone2: "",
        phone2Type: "cep",
        phone3: "",
        phone3Type: "santral",
        email1: "",
        email2: "",
        website: "",
        notes: "",
        authorized_person: "",
        representative_id: "",
      });
    }
  }, [company, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="text-sm font-medium mb-1 block">Şirket Adı *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Şirket ünvanı"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm font-medium mb-1 block">Kişi/Kurum Türü</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Müşteri">Müşteri</option>
              <option value="Potansiyel Müşteri">Potansiyel Müşteri</option>
              <option value="Tedarikçi">Tedarikçi</option>
              <option value="Rakip">Rakip</option>
              <option value="Partner">Partner</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
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
            <label className="text-sm font-medium mb-1 block">İl</label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="İl"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">İlçe/Bölge</label>
            <Input
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="İlçe"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ülke</label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Ülke"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Posta Kodu</label>
            <Input
              name="post_code"
              value={formData.post_code}
              onChange={handleChange}
              placeholder="Posta Kodu"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Yetkili</label>
          <Input
            name="authorized_person"
            value={formData.authorized_person}
            onChange={handleChange}
            placeholder="Yetkili Adı Soyadı"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">E-posta 1</label>
            <Input
              name="email1"
              value={formData.email1}
              onChange={handleChange}
              placeholder="E-posta adresi 1"
              type="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">E-posta 2</label>
            <Input
              name="email2"
              value={formData.email2}
              onChange={handleChange}
              placeholder="E-posta adresi 2"
              type="email"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium block">Telefonlar</label>
          
          <div className="flex gap-2">
            <select
              name="phone1Type"
              value={formData.phone1Type}
              onChange={handleChange}
              className="w-28 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="cep">Cep</option>
              <option value="cep1">Cep 1</option>
              <option value="santral">Santral</option>
              <option value="is">İş</option>
            </select>
            <Input
              name="phone1"
              value={formData.phone1}
              onChange={handleChange}
              placeholder="Telefon 1"
              className="flex-1"
            />
          </div>

          <div className="flex gap-2">
            <select
              name="phone2Type"
              value={formData.phone2Type}
              onChange={handleChange}
              className="w-28 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="cep">Cep</option>
              <option value="cep1">Cep 1</option>
              <option value="santral">Santral</option>
              <option value="is">İş</option>
            </select>
            <Input
              name="phone2"
              value={formData.phone2}
              onChange={handleChange}
              placeholder="Telefon 2"
              className="flex-1"
            />
          </div>

          <div className="flex gap-2">
             <select
              name="phone3Type"
              value={formData.phone3Type}
              onChange={handleChange}
              className="w-28 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="cep">Cep</option>
              <option value="cep1">Cep 1</option>
              <option value="santral">Santral</option>
              <option value="is">İş</option>
            </select>
            <Input
              name="phone3"
              value={formData.phone3}
              onChange={handleChange}
              placeholder="Telefon 3"
              className="flex-1"
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

        <div>
          <label className="text-sm font-medium mb-1 block">Notlar</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange} // This might need a type cast or specific handler if types are strict
            placeholder="Notlar..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
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

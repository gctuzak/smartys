'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePersonAction } from "@/app/actions/save-person";
import { getCompaniesAction, getRepresentativesAction } from "@/app/actions/fetch-data";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: any; // If provided, we are editing
  onSuccess: () => void;
}

export function PersonModal({ isOpen, onClose, person, onSuccess }: PersonModalProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_id: "",
    first_name: "",
    last_name: "",
    salutation: "Bay",
    tckn: "",
    email1: "",
    email2: "",
    phone1: "",
    phone1Type: "cep",
    phone2: "",
    phone2Type: "cep",
    phone3: "",
    phone3Type: "santral",
    title: "",
    address: "",
    city: "",
    district: "",
    country: "Türkiye",
    post_code: "",
    notes: "",
    representative_id: "",
  });

  useEffect(() => {
    // Fetch companies and users for the dropdowns
    const fetchData = async () => {
      const [companiesResult, usersResult] = await Promise.all([
        getCompaniesAction(1, 100),
        getRepresentativesAction()
      ]);

      if (companiesResult.success) {
        setCompanies(companiesResult.data || []);
      }
      if (usersResult.success) {
        setUsers(usersResult.data || []);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (person) {
      setFormData({
        company_id: person.company_id || "",
        first_name: person.first_name || "",
        last_name: person.last_name || "",
        salutation: person.salutation || "Bay",
        tckn: person.tckn || "",
        email1: person.email1 || "",
        email2: person.email2 || "",
        phone1: person.phone1 || "",
        phone1Type: person.phone1_type || "cep",
        phone2: person.phone2 || "",
        phone2Type: person.phone2_type || "cep",
        phone3: person.phone3 || "",
        phone3Type: person.phone3_type || "santral",
        title: person.title || "",
        address: person.address || "",
        city: person.city || "",
        district: person.district || "",
        country: person.country || "Türkiye",
        post_code: person.post_code || "",
        notes: person.notes || "",
        representative_id: person.representative_id || "",
      });
    } else {
      setFormData({
        company_id: "",
        first_name: "",
        last_name: "",
        salutation: "Bay",
        tckn: "",
        email1: "",
        email2: "",
        phone1: "",
        phone1Type: "cep",
        phone2: "",
        phone2Type: "cep",
        phone3: "",
        phone3Type: "santral",
        title: "",
        address: "",
        city: "",
        district: "",
        country: "Türkiye",
        post_code: "",
        notes: "",
        representative_id: "",
      });
    }
  }, [person, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("Ad ve Soyad zorunludur.");
      return;
    }
    if (!formData.company_id) {
      toast.error("Lütfen bir şirket seçin.");
      return;
    }

    setLoading(true);
    try {
      const result = await savePersonAction({
        id: person?.id,
        ...formData,
      });

      if (result.success) {
        toast.success(person ? "Kişi güncellendi" : "Kişi oluşturuldu");
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
      title={person ? "Kişiyi Düzenle" : "Yeni Kişi Ekle"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Şirket *</label>
          <select
            name="company_id"
            value={formData.company_id}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Şirket Seçin</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
             <label className="text-sm font-medium mb-1 block">Hitap</label>
             <select
              name="salutation"
              value={formData.salutation}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Bay">Bay</option>
              <option value="Bayan">Bayan</option>
            </select>
          </div>
          <div className="col-span-5">
            <label className="text-sm font-medium mb-1 block">Ad *</label>
            <Input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Ad"
              required
            />
          </div>
          <div className="col-span-4">
            <label className="text-sm font-medium mb-1 block">Soyad *</label>
            <Input
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Soyad"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ünvan</label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Örn: Satış Müdürü"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">TC Kimlik No</label>
            <Input
              name="tckn"
              value={formData.tckn}
              onChange={handleChange}
              placeholder="TCKN"
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
            onChange={handleChange} // This needs to be typed as TextArea event
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
            placeholder="Kişi hakkında notlar..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {person ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

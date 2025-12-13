'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePersonAction } from "@/app/actions/save-person";
import { getCompaniesAction, getUsersAction } from "@/app/actions/fetch-data";
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
    email: "",
    phone: "",
    title: "",
    representative_id: "",
  });

  useEffect(() => {
    // Fetch companies and users for the dropdowns
    const fetchData = async () => {
      const [companiesResult, usersResult] = await Promise.all([
        getCompaniesAction(1, 100),
        getUsersAction(1, 100)
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
        email: person.email || "",
        phone: person.phone || "",
        title: person.title || "",
        representative_id: person.representative_id || "",
      });
    } else {
      setFormData({
        company_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        title: "",
        representative_id: "",
      });
    }
  }, [person, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ad *</label>
            <Input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Ad"
              required
            />
          </div>
          <div>
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
            <label className="text-sm font-medium mb-1 block">Telefon</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Telefon numarası"
            />
          </div>
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
            {person ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

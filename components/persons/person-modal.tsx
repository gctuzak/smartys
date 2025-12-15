'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePersonAction } from "@/app/actions/save-person";
import { getCompaniesAction, getRepresentativesAction, getCompanyAction } from "@/app/actions/fetch-data";
import { toast } from "sonner";
import { Loader2, User, Phone, Mail, MapPin, FileText, Building2, History } from "lucide-react";
import { PastJobsModal } from "@/components/shared/past-jobs-modal";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: any; // If provided, we are editing
  onSuccess: () => void;
}

export function PersonModal({ isOpen, onClose, person, onSuccess }: PersonModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPastJobs, setShowPastJobs] = useState(false);
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

      let loadedCompanies: any[] = [];
      if (companiesResult.success) {
        loadedCompanies = companiesResult.data || [];
      }

      // If we are editing a person and their company is not in the list, fetch it
      if (person?.company_id) {
        const companyExists = loadedCompanies.find((c: any) => c.id === person.company_id);
        if (!companyExists) {
          const companyResult = await getCompanyAction(person.company_id);
          if (companyResult.success && companyResult.data) {
            loadedCompanies = [...loadedCompanies, companyResult.data];
            // Sort companies by name
            loadedCompanies.sort((a: any, b: any) => a.name.localeCompare(b.name));
          }
        }
      }

      setCompanies(loadedCompanies);

      if (usersResult.success) {
        setUsers(usersResult.data || []);
      }
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, person]);

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
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {person && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPastJobs(true)}
              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <History className="w-4 h-4" />
              Geçmiş İşler
            </Button>
          </div>
        )}
        
        {/* Top Row: Company & Representative */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-lg border">
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-gray-500" />
                Şirket *
              </label>
              <select
                name="company_id"
                value={formData.company_id}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
             <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <User className="w-4 h-4 text-gray-500" />
                Müşteri Temsilcisi
              </label>
              <select
                name="representative_id"
                value={formData.representative_id}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seçiniz...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>
        </div>

        {/* Section 1: Kimlik Bilgileri */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-primary border-b pb-2">
            <User className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Kimlik Bilgileri</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
             <div className="md:col-span-2">
                 <label className="text-sm font-medium mb-1.5 block text-gray-700">Hitap</label>
                 <select
                  name="salutation"
                  value={formData.salutation}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Bay">Bay</option>
                  <option value="Bayan">Bayan</option>
                </select>
             </div>
              <div className="md:col-span-5">
                <label className="text-sm font-medium mb-1.5 block text-gray-700">Ad *</label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Ad"
                  required
                  className="bg-gray-50/50"
                />
              </div>
              <div className="md:col-span-5">
                <label className="text-sm font-medium mb-1.5 block text-gray-700">Soyad *</label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Soyad"
                  required
                  className="bg-gray-50/50"
                />
              </div>
              <div className="md:col-span-6">
                <label className="text-sm font-medium mb-1.5 block text-gray-700">Ünvan</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Örn: Satış Müdürü"
                  className="bg-gray-50/50"
                />
              </div>
              <div className="md:col-span-6">
                <label className="text-sm font-medium mb-1.5 block text-gray-700">TC Kimlik No</label>
                <Input
                  name="tckn"
                  value={formData.tckn}
                  onChange={handleChange}
                  placeholder="TCKN"
                  className="bg-gray-50/50"
                />
              </div>
          </div>
        </div>

        {/* Section 2: İletişim */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 text-primary border-b pb-2">
            <Phone className="w-5 h-5" />
            <h3 className="font-semibold text-lg">İletişim Bilgileri</h3>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phone 1 */}
            <div className="space-y-1">
               <label className="text-xs text-gray-500 font-medium ml-1">Telefon 1</label>
               <div className="flex gap-2">
                <select
                  name="phone1Type"
                  value={formData.phone1Type}
                  onChange={handleChange}
                  className="w-24 h-10 rounded-md border border-input bg-gray-50/50 px-2 text-sm"
                >
                  <option value="cep">Cep</option>
                  <option value="is">İş</option>
                  <option value="santral">Santral</option>
                </select>
                <Input
                  name="phone1"
                  value={formData.phone1}
                  onChange={handleChange}
                  placeholder="Telefon 1"
                  className="flex-1 bg-gray-50/50"
                />
              </div>
            </div>

            {/* Phone 2 */}
            <div className="space-y-1">
               <label className="text-xs text-gray-500 font-medium ml-1">Telefon 2</label>
               <div className="flex gap-2">
                <select
                  name="phone2Type"
                  value={formData.phone2Type}
                  onChange={handleChange}
                  className="w-24 h-10 rounded-md border border-input bg-gray-50/50 px-2 text-sm"
                >
                  <option value="cep">Cep</option>
                  <option value="is">İş</option>
                  <option value="santral">Santral</option>
                </select>
                <Input
                  name="phone2"
                  value={formData.phone2}
                  onChange={handleChange}
                  placeholder="Telefon 2"
                  className="flex-1 bg-gray-50/50"
                />
              </div>
            </div>

             {/* Phone 3 */}
             <div className="space-y-1">
               <label className="text-xs text-gray-500 font-medium ml-1">Telefon 3</label>
               <div className="flex gap-2">
                <select
                  name="phone3Type"
                  value={formData.phone3Type}
                  onChange={handleChange}
                  className="w-24 h-10 rounded-md border border-input bg-gray-50/50 px-2 text-sm"
                >
                  <option value="cep">Cep</option>
                  <option value="is">İş</option>
                  <option value="santral">Santral</option>
                </select>
                <Input
                  name="phone3"
                  value={formData.phone3}
                  onChange={handleChange}
                  placeholder="Telefon 3"
                  className="flex-1 bg-gray-50/50"
                />
              </div>
            </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
               <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">E-posta 1</label>
               </div>
              <Input
                name="email1"
                value={formData.email1}
                onChange={handleChange}
                placeholder="ornek@sirket.com"
                type="email"
                className="bg-gray-50/50"
              />
            </div>
            <div className="md:col-span-1">
               <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">E-posta 2</label>
               </div>
              <Input
                name="email2"
                value={formData.email2}
                onChange={handleChange}
                placeholder="diger@sirket.com"
                type="email"
                className="bg-gray-50/50"
              />
            </div>
           </div>
        </div>

        {/* Section 3: Adres & Notlar */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
             <div className="flex items-center gap-2 text-primary border-b pb-2">
                <MapPin className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Adres Bilgileri</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block text-gray-700">Açık Adres</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Mahalle, Cadde, Sokak, No..."
                    className="bg-gray-50/50"
                  />
                </div>
                 <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700">İl</label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="İl"
                      className="bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700">İlçe</label>
                    <Input
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="İlçe"
                      className="bg-gray-50/50"
                    />
                  </div>
                   <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700">Ülke</label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Ülke"
                      className="bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700">Posta Kodu</label>
                    <Input
                      name="post_code"
                      value={formData.post_code}
                      onChange={handleChange}
                      placeholder="PK"
                      className="bg-gray-50/50"
                    />
                  </div>
             </div>
           </div>

           <div className="space-y-4">
             <div className="flex items-center gap-2 text-primary border-b pb-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Notlar</h3>
             </div>
             <div className="h-full">
                <label className="text-sm font-medium mb-1 block text-gray-700">Kişi Hakkında Notlar</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Özel notlar, hatırlatmalar..."
                  className="flex min-h-[160px] w-full rounded-md border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
             </div>
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="px-6">
            İptal
          </Button>
          <Button type="submit" disabled={loading} className="px-6">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {person ? "Değişiklikleri Kaydet" : "Kişi Oluştur"}
          </Button>
        </div>
      </form>

      {person && (
        <PastJobsModal
          isOpen={showPastJobs}
          onClose={() => setShowPastJobs(false)}
          entityType="person"
          entityId={person.id}
          entityName={`${person.first_name} ${person.last_name}`}
        />
      )}
    </Modal>
  );
}

'use client';

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCompanyAction } from "@/app/actions/save-company";
import { getRepresentativesAction, getPersonsAction, getUserAction } from "@/app/actions/fetch-data";
import { toast } from "sonner";
import { Loader2, Building2, Phone, Mail, MapPin, FileText, Users, History } from "lucide-react";
import { PastJobsModal } from "@/components/shared/past-jobs-modal";
import { Combobox } from "@/components/ui/combobox";
import { FileManager } from "@/components/shared/file-manager";

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: any; // If provided, we are editing
  onSuccess: () => void;
}

export function CompanyModal({ isOpen, onClose, company, onSuccess }: CompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPastJobs, setShowPastJobs] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
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

  // Debounced search for users
  const handleUserSearch = useCallback(async (search: string) => {
    setLoadingUsers(true);
    const result = await getRepresentativesAction(1, 20, search);
    if (result.success) {
      setUsers(result.data || []);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    // Fetch users for the dropdown
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const result = await getRepresentativesAction(1, 20);
      let loadedUsers: any[] = [];
      if (result.success) {
        loadedUsers = result.data || [];
      }
      
      // If we are editing and representative is not in list, fetch it
      if (company?.representative_id) {
        const userExists = loadedUsers.find((u: any) => u.id === company.representative_id);
        if (!userExists) {
            const userResult = await getUserAction(company.representative_id);
            if (userResult.success && userResult.data) {
                loadedUsers = [...loadedUsers, userResult.data];
                loadedUsers.sort((a: any, b: any) => a.first_name.localeCompare(b.first_name));
                setSelectedUser(userResult.data);
            }
        } else {
            setSelectedUser(userExists);
        }
      } else {
        setSelectedUser(null);
      }

      setUsers(loadedUsers);
      setLoadingUsers(false);
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, company]);

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

      const fetchPersons = async () => {
        const result = await getPersonsAction(company.id, 1, 100); // Fetch up to 100 persons
        if (result.success) {
          setPersons(result.data || []);
        }
      };
      fetchPersons();
    } else {
      setPersons([]);
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
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {company && (
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
        
        {/* Section 1: Genel Bilgiler */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary border-b pb-2">
            <Building2 className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Genel Bilgiler</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Şirket Adı *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Şirket ünvanı"
                required
                className="bg-gray-50/50"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Tür</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-gray-50/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Müşteri">Müşteri</option>
                <option value="Potansiyel Müşteri">Potansiyel Müşteri</option>
                <option value="Tedarikçi">Tedarikçi</option>
                <option value="Rakip">Rakip</option>
                <option value="Partner">Partner</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Temsilci</label>
              <Combobox
                options={[
                  ...(selectedUser && !users.find(u => u.id === selectedUser.id) ? [selectedUser] : []),
                  ...users
                ].map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))}
                value={formData.representative_id}
                onChange={(value) => {
                    setFormData(prev => ({ ...prev, representative_id: value }));
                    const user = users.find(u => u.id === value) || (selectedUser?.id === value ? selectedUser : null);
                    if (user) setSelectedUser(user);
                }}
                placeholder="Seçiniz..."
                searchPlaceholder="Temsilci Ara..."
                emptyText="Temsilci bulunamadı."
                loading={loadingUsers}
                onSearch={handleUserSearch}
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Vergi No</label>
              <Input
                name="tax_no"
                value={formData.tax_no}
                onChange={handleChange}
                placeholder="Vergi numarası"
                className="bg-gray-50/50"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Vergi Dairesi</label>
              <Input
                name="tax_office"
                value={formData.tax_office}
                onChange={handleChange}
                placeholder="Vergi dairesi"
                className="bg-gray-50/50"
              />
            </div>
             <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1.5 block text-gray-700">Yetkili Kişi</label>
              <Input
                name="authorized_person"
                value={formData.authorized_person}
                onChange={handleChange}
                placeholder="Yetkili Adı Soyadı"
                className="bg-gray-50/50"
              />
            </div>
            <div className="md:col-span-3">
               <label className="text-sm font-medium mb-1.5 block text-gray-700">Web Sitesi</label>
              <Input
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
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

             {/* Email 1 */}
            <div className="md:col-span-1.5">
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

             {/* Email 2 */}
            <div className="md:col-span-1.5">
               <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">E-posta 2</label>
               </div>
              <Input
                name="email2"
                value={formData.email2}
                onChange={handleChange}
                placeholder="muhasebe@sirket.com"
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
                <label className="text-sm font-medium mb-1 block text-gray-700">Şirket Hakkında Notlar</label>
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

        {/* Section 4: Employees List */}
        {company && persons.length > 0 && (
          <div className="space-y-4 pt-2">
             <div className="flex items-center gap-2 text-primary border-b pb-2">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Şirket Çalışanları ({persons.length})</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
              {persons.map((person) => (
                <div key={person.id} className="flex flex-col p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="font-semibold text-gray-900">{person.first_name} {person.last_name}</div>
                  <div className="text-sm text-primary mb-2">{person.title || "Ünvan Yok"}</div>
                  <div className="mt-auto space-y-1">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {person.phone1 || "-"}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {person.email1 || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Files */}
        {company && (
          <div className="space-y-4 pt-2">
             <div className="flex items-center gap-2 text-primary border-b pb-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Dosyalar</h3>
             </div>
             <FileManager
               entityType="company"
               entityId={company.id}
               companyId={company.id}
             />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="px-6">
            İptal
          </Button>
          <Button type="submit" disabled={loading} className="px-6">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {company ? "Değişiklikleri Kaydet" : "Şirket Oluştur"}
          </Button>
        </div>
      </form>

      {company && (
        <PastJobsModal
          isOpen={showPastJobs}
          onClose={() => setShowPastJobs(false)}
          entityType="company"
          entityId={company.id}
          entityName={company.name}
        />
      )}
    </Modal>
  );
}

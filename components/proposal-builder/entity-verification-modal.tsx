"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParsedData } from "@/types";
import { checkEntitiesAction } from "@/app/actions/check-entities";
import { createCompanyAction, createPersonAction } from "@/app/actions/create-entity";
import { Loader2, Check, AlertCircle, User, Building2 } from "lucide-react";
import { toast } from "sonner";

interface EntityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ParsedData;
  onDataUpdate: (newData: ParsedData) => void;
}

export function EntityVerificationModal({ isOpen, onClose, data, onDataUpdate }: EntityVerificationModalProps) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"check" | "company" | "person">("check");
  const [existingCompany, setExistingCompany] = useState<any>(null);
  const [existingPerson, setExistingPerson] = useState<any>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxNo: "",
    taxOffice: "",
  });

  const [personForm, setPersonForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
  });

  useEffect(() => {
    if (isOpen && data) {
      checkEntities();
    }
  }, [isOpen, data]);

  const checkEntities = async () => {
    setLoading(true);
    try {
      const result = await checkEntitiesAction(data.company.name, data.person?.name || null);
      setExistingCompany(result.company);
      setExistingPerson(result.person);

      // Initialize forms
      setCompanyForm({
        name: data.company.name || "",
        email: (data.company.contactInfo?.email as string) || "",
        phone: (data.company.contactInfo?.phone as string) || "",
        address: (data.company.contactInfo?.address as string) || "",
        taxNo: (data.company.contactInfo?.tax_no as string) || "",
        taxOffice: (data.company.contactInfo?.tax_office as string) || "",
      });

      setPersonForm({
        name: data.person?.name || "",
        email: data.person?.email || "",
        phone: data.person?.phone || "",
        title: data.person?.title || "",
      });

      // Decide start step
      if (!result.company) {
        setStep("company");
      } else if (!result.person && data.person?.name) {
        // Only prompt for person if we have a name parsed but not found
        // OR if user wants to add one (we can handle that in review, but here we focus on parsed data)
        setStep("person");
      } else {
        // Both found or person name missing from parse -> nothing to verify urgently
        // But the user requested a modal if *both* are missing.
        // If company is missing, we start there.
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Veriler kontrol edilirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      setLoading(true);
      const newCompany = await createCompanyAction({
        name: companyForm.name,
        contactInfo: {
            email: companyForm.email,
            phone: companyForm.phone,
            address: companyForm.address,
            tax_no: companyForm.taxNo,
            tax_office: companyForm.taxOffice
        },
        address: companyForm.address,
        email: companyForm.email,
        phone: companyForm.phone,
        taxNo: companyForm.taxNo,
        taxOffice: companyForm.taxOffice
      });
      
      setExistingCompany(newCompany);
      toast.success("Şirket oluşturuldu!");
      
      // Update local data context
      onDataUpdate({
        ...data,
        company: {
            ...data.company,
            name: newCompany.name,
            contactInfo: {
                ...data.company.contactInfo,
                email: companyForm.email,
                phone: companyForm.phone,
                address: companyForm.address,
            }
        }
      });

      // Move to next step
      if (!existingPerson && (personForm.name || data.person?.name)) {
        setStep("person");
      } else {
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Şirket oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePerson = async () => {
    try {
      setLoading(true);
      
      const parts = personForm.name.trim().split(' ');
      let firstName = personForm.name;
      let lastName = '';
      if (parts.length > 1) {
        lastName = parts.pop() || '';
        firstName = parts.join(' ');
      }

      const newPerson = await createPersonAction({
        firstName,
        lastName,
        email: personForm.email,
        phone: personForm.phone,
        title: personForm.title,
        companyId: existingCompany?.id // Link to the company we just found or created
      });

      setExistingPerson(newPerson);
      toast.success("Kişi oluşturuldu!");

      // Update local data context
      onDataUpdate({
        ...data,
        person: {
            name: personForm.name,
            email: personForm.email,
            phone: personForm.phone,
            title: personForm.title
        }
      });

      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Kişi oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "check" && loading) {
     return null; // Or a spinner
  }

  // If we shouldn't be open (logic in checkEntities handles closing), return null
  if (step === "check") return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === "company" ? "Yeni Şirket Kaydı" : "Yeni Kişi Kaydı"}
          </DialogTitle>
          <DialogDescription>
            {step === "company" 
              ? "Bu şirket veritabanında bulunamadı. Lütfen bilgileri doğrulayıp kaydedin." 
              : "Bu kişi veritabanında bulunamadı. Lütfen bilgileri doğrulayıp kaydedin."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "company" && (
            <>
              <div className="grid gap-2">
                <Label>Şirket Adı</Label>
                <Input 
                  value={companyForm.name} 
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                    <Label>E-posta</Label>
                    <Input 
                        value={companyForm.email} 
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Telefon</Label>
                    <Input 
                        value={companyForm.phone} 
                        onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} 
                    />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adres</Label>
                <Input 
                  value={companyForm.address} 
                  onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} 
                />
              </div>
            </>
          )}

          {step === "person" && (
            <>
               <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3 mb-4">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                      <div className="text-xs text-blue-600 font-medium">Bağlı Şirket</div>
                      <div className="text-sm font-bold text-blue-900">{existingCompany?.name || companyForm.name}</div>
                  </div>
               </div>

              <div className="grid gap-2">
                <Label>Adı Soyadı</Label>
                <Input 
                  value={personForm.name} 
                  onChange={(e) => setPersonForm({...personForm, name: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>E-posta</Label>
                <Input 
                  value={personForm.email} 
                  onChange={(e) => setPersonForm({...personForm, email: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input 
                  value={personForm.phone} 
                  onChange={(e) => setPersonForm({...personForm, phone: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Ünvan</Label>
                <Input 
                  value={personForm.title} 
                  onChange={(e) => setPersonForm({...personForm, title: e.target.value})} 
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Atla</Button>
          <Button 
            onClick={step === "company" ? handleCreateCompany : handleCreatePerson} 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === "company" ? "Şirketi Kaydet ve Devam Et" : "Kişiyi Kaydet ve Bitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

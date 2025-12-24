"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ParsedData } from "@/types";
import { Search, Plus, ArrowRight, User, Building2, Check, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { toTurkishLikePattern, cn } from "@/lib/utils";
import { parseCustomerTextAction } from "@/app/actions/parse-customer";
import { createCompanyWithPersonAction, createPersonForCompanyAction } from "@/app/actions/create-customer";
import { processCustomerAction } from "@/app/actions/process-customer";
import { parseItemsTextAction } from "@/app/actions/parse-items";
import { Loader2 } from "lucide-react";
import { ProductAutocomplete } from "./product-autocomplete";
import { ProductSearchResult } from "@/app/actions/search-products";

interface ManualProposalBuilderProps {
  onComplete: (data: ParsedData) => void;
  onCancel: () => void;
  initialMode?: 'manual' | 'database';
}

type Step = "customer" | "items";

export function ManualProposalBuilder({ onComplete, onCancel, initialMode = 'manual' }: ManualProposalBuilderProps) {
  const [step, setStep] = useState<Step>("customer");
  const [mode, setMode] = useState<'manual' | 'database'>(initialMode);
  const [loading, setLoading] = useState(false);
  
  // Database Mode State
  const [databaseItems, setDatabaseItems] = useState<{
    id: string;
    product: ProductSearchResult;
    quantity: number;
  }[]>([]);
  const [productSearchInput, setProductSearchInput] = useState("");
  
  // Data State
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [pastedItems, setPastedItems] = useState("");

  // Customer Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ companies: any[], persons: any[] }>({ companies: [], persons: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [companyPersons, setCompanyPersons] = useState<any[]>([]); // Persons of the selected company
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonData, setNewPersonData] = useState({ name: "", email: "", phone: "", title: "" });

  // Paste Customer State
  const [showPasteCustomer, setShowPasteCustomer] = useState(false);
  const [pastedCustomerText, setPastedCustomerText] = useState("");
  const [parsedCustomer, setParsedCustomer] = useState<{
    company_name: string;
    person_name: string;
    project_name: string;
    city: string;
    phone: string;
  } | null>(null);

  // Process State
  const [processStatus, setProcessStatus] = useState<'idle' | 'checking' | 'company_not_found' | 'person_not_found' | 'multiple_companies_found'>('idle');
  const [foundCompany, setFoundCompany] = useState<any>(null);
  const [potentialCompanies, setPotentialCompanies] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ companies: [], persons: [] });
      return;
    }

    setIsSearching(true);
    try {
      const term = toTurkishLikePattern(query);
      
      // Search Companies AND Persons
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', `%${term}%`)
        .limit(20);

      const { data: persons } = await supabase
        .from('persons')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(20);

      setSearchResults({ 
        companies: companies || [], 
        persons: persons || [] 
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchCompanyPersons = async (companyId: string) => {
      setLoading(true);
      try {
          const { data } = await supabase
            .from('persons')
            .select('*')
            .eq('company_id', companyId);
          setCompanyPersons(data || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleSelectCustomer = async (type: 'company' | 'person', data: any) => {
    if (type === 'company') {
      setSelectedCompany(data);
      setSelectedPerson(null);
      // Fetch persons for this company
      await fetchCompanyPersons(data.id);
    } else {
      setSelectedPerson(data);
      // If person has a company, select it too
      if (data.companies) {
        setSelectedCompany(data.companies);
        // Fetch other persons for this company as well, so dropdown is populated
        await fetchCompanyPersons(data.companies.id);
      } else if (data.company_id) {
         // Fetch company details if not included
         const { data: company } = await supabase.from('companies').select('*').eq('id', data.company_id).single();
         if (company) {
             setSelectedCompany(company);
             await fetchCompanyPersons(company.id);
         }
      }
    }
    // Clear search
    setSearchQuery("");
    setSearchResults({ companies: [], persons: [] });
  };

  const handleAddNewPerson = async () => {
      if (!selectedCompany) return;
      if (!newPersonData.name || !newPersonData.phone) {
          toast.error("İsim ve telefon zorunludur.");
          return;
      }
      
      setLoading(true);
      try {
          const result = await createPersonForCompanyAction(selectedCompany.id, {
              name: newPersonData.name,
              phone: newPersonData.phone,
              email: newPersonData.email,
              title: newPersonData.title
          });
          
          if (result.success) {
              toast.success("Kişi eklendi.");
              setSelectedPerson(result.person);
              setShowNewPersonForm(false);
              setNewPersonData({ name: "", email: "", phone: "", title: "" });
              // Refresh list
              fetchCompanyPersons(selectedCompany.id);
          } else {
              toast.error(result.error);
          }
      } catch (e) {
          toast.error("Hata oluştu");
      } finally {
          setLoading(false);
      }
  };

  const handleParseCustomer = async () => {
      if (!pastedCustomerText) return;
      setLoading(true);
      setProcessStatus('idle');
      setFoundCompany(null);
      try {
          const result = await parseCustomerTextAction(pastedCustomerText);
          if (result.success && result.data) {
              setParsedCustomer(result.data);
          } else {
              toast.error(result.error || "Ayrıştırma başarısız.");
          }
      } catch (e) {
          toast.error("Ayrıştırma hatası");
      } finally {
          setLoading(false);
      }
  };

  const handleProcessCustomer = async (forceCompanyId?: string) => {
    if (!parsedCustomer) return;
    setLoading(true);
    setProcessStatus('checking');
    try {
        // If triggered by button click (event object), don't pass it as forceCompanyId
        const companyId = typeof forceCompanyId === 'string' ? forceCompanyId : undefined;

        const result = await processCustomerAction(parsedCustomer, companyId);
        
        if (result.status === 'FOUND') {
            setSelectedCompany(result.company);
            setSelectedPerson(result.person);
            toast.success("Müşteri ve ilgili kişi bulundu ve seçildi.");
            setShowPasteCustomer(false);
            setParsedCustomer(null);
            setPastedCustomerText("");
        } else if (result.status === 'MULTIPLE_COMPANIES_FOUND') {
            setPotentialCompanies((result as any).companies);
            setProcessStatus('multiple_companies_found');
            toast.info("Birden fazla benzer şirket bulundu, lütfen seçin.");
        } else if (result.status === 'COMPANY_FOUND_PERSON_NOT_FOUND') {
            setFoundCompany(result.company);
            setProcessStatus('person_not_found');
            toast.info("Şirket bulundu, ancak kişi bulunamadı.");
        } else if (result.status === 'COMPANY_NOT_FOUND') {
            setProcessStatus('company_not_found');
            toast.info("Şirket bulunamadı, yeni oluşturulacak.");
        } else {
            toast.error("Bir hata oluştu: " + (result as any).error);
            setProcessStatus('idle');
        }

    } catch (e) {
        toast.error("İşlem sırasında hata oluştu");
        setProcessStatus('idle');
    } finally {
        setLoading(false);
    }
  };

  const handleSelectPotentialCompany = (companyId: string) => {
      // Re-run process logic but force this company
      handleProcessCustomer(companyId);
  };

  const handleIgnorePotentialCompanies = () => {
      setProcessStatus('company_not_found');
      setPotentialCompanies([]);
  };

  const handleCreateCompany = async () => {
      if (!parsedCustomer) return;
      setLoading(true);
      try {
          // Validate Phone
          if (!parsedCustomer.phone) {
              toast.error("Telefon numarası zorunludur.");
              setLoading(false);
              return;
          }

          const result = await createCompanyWithPersonAction({
              company: {
                  name: parsedCustomer.company_name,
                  phone: parsedCustomer.phone, // Assuming primary phone for company
                  city: parsedCustomer.city,
                  // We don't have explicit company email/tax in parsed data yet, but could add if needed
                  // Using same phone for now
              },
              person: parsedCustomer.person_name ? {
                  name: parsedCustomer.person_name,
                  phone: parsedCustomer.phone, // Same phone for person contact
                  // email: ... 
              } : undefined
          });

          if (result.success) {
              setSelectedCompany(result.company);
              setSelectedPerson(result.person);
              toast.success("Şirket ve kişi oluşturuldu.");
              setShowPasteCustomer(false);
              setParsedCustomer(null);
              setPastedCustomerText("");
              setProcessStatus('idle');
          } else {
              toast.error(result.error);
          }
      } catch (e) {
          toast.error("Oluşturma hatası");
      } finally {
          setLoading(false);
      }
  };

  const handleCreatePersonForCompany = async () => {
      if (!parsedCustomer || !foundCompany) return;
      setLoading(true);
      try {
           if (!parsedCustomer.phone) {
              toast.error("Telefon numarası zorunludur.");
              setLoading(false);
              return;
          }

          const result = await createPersonForCompanyAction(foundCompany.id, {
              name: parsedCustomer.person_name,
              phone: parsedCustomer.phone,
          });

          if (result.success) {
              setSelectedCompany(foundCompany);
              setSelectedPerson(result.person);
              toast.success("Kişi şirkete eklendi ve seçildi.");
              setShowPasteCustomer(false);
              setParsedCustomer(null);
              setPastedCustomerText("");
              setProcessStatus('idle');
          } else {
              toast.error(result.error);
          }
      } catch (e) {
          toast.error("Kişi oluşturma hatası");
      } finally {
          setLoading(false);
      }
  };

  const handleSkipPerson = () => {
      if (foundCompany) {
          setSelectedCompany(foundCompany);
          setSelectedPerson(null);
          toast.success("Sadece şirket seçildi.");
          setShowPasteCustomer(false);
          setParsedCustomer(null);
          setPastedCustomerText("");
          setProcessStatus('idle');
      }
  };

  const handleNext = () => {
    if (!selectedCompany && !selectedPerson) {
      toast.error("Lütfen bir müşteri seçin");
      return;
    }
    setStep("items");
  };

  const handleAddDatabaseItem = (product: ProductSearchResult) => {
    setDatabaseItems(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      product,
      quantity: 1
    }]);
    setProductSearchInput("");
    toast.success(`${product.name} eklendi`);
  };

  const handleRemoveDatabaseItem = (id: string) => {
    setDatabaseItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateDatabaseItemQuantity = (id: string, quantity: number) => {
    setDatabaseItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const handleDatabaseComplete = () => {
    if (databaseItems.length === 0) {
      toast.error("Lütfen en az bir ürün ekleyin");
      return;
    }

    const items = databaseItems.map((item, index) => ({
      id: item.id,
      description: item.product.name,
      quantity: item.quantity,
      unit: item.product.unit || "Adet",
      unitPrice: item.product.defaultPrice || 0,
      totalPrice: (item.product.defaultPrice || 0) * item.quantity,
      order: index + 1,
      // Add extra fields if needed from product type
      isHeader: false
    }));

    const parsedData: ParsedData = {
        company: selectedCompany ? {
            name: selectedCompany.name,
            contactInfo: {
                email: selectedCompany.email1,
                phone: selectedCompany.phone1,
                address: selectedCompany.address,
                taxNo: selectedCompany.tax_no,
                taxOffice: selectedCompany.tax_office
            }
        } : { name: "", contactInfo: {} },
        person: selectedPerson ? {
            name: `${selectedPerson.first_name} ${selectedPerson.last_name}`,
            email: selectedPerson.email1,
            phone: selectedPerson.phone1,
            title: selectedPerson.title
        } : undefined,
        proposal: {
            items: items,
            totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
            vatRate: 20,
            currency: 'EUR', // Default currency
            notes: parsedCustomer?.project_name ? `Proje: ${parsedCustomer.project_name}` : undefined
        }
    };

    onComplete(parsedData);
  };

  const handleParseAndComplete = async () => {
    if (!pastedItems.trim()) {
      toast.error("Lütfen teklif kalemlerini yapıştırın");
      return;
    }

    setLoading(true);
    try {
      const result = await parseItemsTextAction(pastedItems);
      
      if (!result.success) {
          throw new Error(result.error);
      }

      const items = result.data;

      const parsedData: ParsedData = {
        company: selectedCompany ? {
            name: selectedCompany.name,
            contactInfo: {
                email: selectedCompany.email1,
                phone: selectedCompany.phone1,
                address: selectedCompany.address,
                taxNo: selectedCompany.tax_no,
                taxOffice: selectedCompany.tax_office
            }
        } : { name: "", contactInfo: {} },
        person: selectedPerson ? {
            name: `${selectedPerson.first_name} ${selectedPerson.last_name}`,
            email: selectedPerson.email1,
            phone: selectedPerson.phone1,
            title: selectedPerson.title
        } : undefined,
        proposal: {
            items: items,
            totalAmount: items.reduce((sum: number, i: any) => sum + i.totalPrice, 0),
            vatRate: 20,
            currency: 'EUR',
            notes: parsedCustomer?.project_name ? `Proje: ${parsedCustomer.project_name}` : undefined
        }
      };

      onComplete(parsedData);
    } catch (e) {
      console.error(e);
      toast.error("Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Modern Stepper */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full" />
        <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-blue-100 -z-10 rounded-full transition-all duration-500" style={{ width: step === 'items' ? '100%' : '50%' }} />
        
        <div className="flex justify-between w-full max-w-md mx-auto">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-2 bg-white px-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 shadow-sm",
              step === 'customer' || step === 'items'
                ? "border-blue-600 bg-blue-600 text-white scale-110" 
                : "border-gray-200 text-gray-400"
            )}>
              1
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors duration-300",
              step === 'customer' ? "text-blue-600" : "text-gray-500"
            )}>Müşteri Seçimi</span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-2 bg-white px-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 shadow-sm",
              step === 'items'
                ? "border-blue-600 bg-blue-600 text-white scale-110" 
                : "border-gray-200 text-gray-400 bg-white"
            )}>
              2
            </div>
            <span className={cn(
              "text-sm font-medium transition-colors duration-300",
              step === 'items' ? "text-blue-600" : "text-gray-500"
            )}>Teklif Kalemleri</span>
          </div>
        </div>
      </div>

      {step === 'customer' && (
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900">Müşteri Bilgileri</CardTitle>
            <p className="text-gray-500">Teklifin hazırlanacağı müşteri veya kişi bilgilerini seçin.</p>
          </CardHeader>
          <CardContent className="space-y-6 px-0">
            
            {/* Search Section */}
            {!showPasteCustomer && (
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <Input 
                    placeholder="Müşteri veya Kişi Ara..." 
                    className="pl-12 h-14 text-lg bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 rounded-xl transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Results */}
                {searchQuery.length >= 2 && !selectedCompany && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {searchResults.companies.map(c => (
                            <div 
                                key={c.id} 
                                className={`p-4 hover:bg-blue-50/50 cursor-pointer flex items-center gap-4 transition-colors ${selectedCompany?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                onClick={() => handleSelectCustomer('company', c)}
                            >
                                <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                                  <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 text-lg">{c.name}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      {c.tax_no && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">VKN: {c.tax_no}</span>}
                                      {c.city && <span className="text-gray-400">• {c.city}</span>}
                                    </div>
                                </div>
                                <ArrowRight className="ml-auto w-5 h-5 text-gray-300" />
                            </div>
                        ))}
                        {searchResults.companies.length === 0 && !isSearching && (
                            <div className="p-8 text-center">
                                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3">
                                  <Search className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-900 font-medium">Sonuç bulunamadı</p>
                                <p className="text-sm text-gray-500 mt-1">Lütfen farklı bir arama terimi deneyin.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Company Display & Change */}
                {selectedCompany && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 rounded-xl p-6 flex justify-between items-center shadow-sm">
                         <div className="flex items-center gap-5">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                              <Building2 className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-sm text-blue-600 font-medium mb-1">Seçilen Şirket</div>
                                <div className="font-bold text-gray-900 text-xl">{selectedCompany.name}</div>
                                <div className="text-sm text-gray-500 mt-1">{selectedCompany.tax_no ? `VKN: ${selectedCompany.tax_no}` : ''}</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="hover:bg-white/50 text-gray-500 hover:text-red-600" onClick={() => {
                            setSelectedCompany(null);
                            setSelectedPerson(null);
                            setCompanyPersons([]);
                        }}>
                            Değiştir
                        </Button>
                    </div>
                )}

                {/* Person Selection (Only after Company Selected) */}
                {selectedCompany && !showNewPersonForm && (
                    <div className="space-y-4 pt-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-end mb-4">
                             <div>
                               <h3 className="font-bold text-gray-900 text-lg">İlgili Kişi</h3>
                               <p className="text-sm text-gray-500">Teklifi kime hitaben hazırlıyorsunuz?</p>
                             </div>
                             <Button size="sm" variant="outline" className="gap-2 hover:border-blue-300 hover:text-blue-600" onClick={() => setShowNewPersonForm(true)}>
                                <Plus className="h-4 w-4" /> Yeni Kişi Ekle
                             </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {companyPersons.length > 0 ? (
                                companyPersons.map(p => (
                                    <div 
                                        key={p.id} 
                                        className={cn(
                                          "group relative border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                                          selectedPerson?.id === p.id 
                                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm" 
                                            : "border-gray-200 bg-white hover:border-blue-300"
                                        )}
                                        onClick={() => handleSelectCustomer('person', p)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                              selectedPerson?.id === p.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                                            )}>
                                                {p.first_name[0]}{p.last_name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{p.first_name} {p.last_name}</div>
                                                <div className="text-sm text-gray-500">{p.title || 'Ünvan Belirtilmemiş'}</div>
                                                {p.email1 && <div className="text-xs text-gray-400 mt-1">{p.email1}</div>}
                                            </div>
                                            {selectedPerson?.id === p.id && (
                                              <div className="bg-blue-600 rounded-full p-1">
                                                <Check className="h-3 w-3 text-white" />
                                              </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                    <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-900 font-medium">Kayıtlı kişi bulunamadı</p>
                                    <p className="text-sm text-gray-500 mt-1">Lütfen "Yeni Kişi Ekle" butonunu kullanın.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* New Person Form */}
                {showNewPersonForm && (
                     <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Yeni Kişi Ekle</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowNewPersonForm(false)} className="hover:bg-gray-200">İptal</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Soyad</label>
                                <Input 
                                    className="bg-white border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                                    value={newPersonData.name} 
                                    onChange={(e) => setNewPersonData({...newPersonData, name: e.target.value})} 
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</label>
                                <Input 
                                    className="bg-white border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                                    value={newPersonData.phone} 
                                    onChange={(e) => setNewPersonData({...newPersonData, phone: e.target.value})} 
                                    placeholder="Örn: 0555 123 45 67"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">E-posta</label>
                                <Input 
                                    className="bg-white border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                                    value={newPersonData.email} 
                                    onChange={(e) => setNewPersonData({...newPersonData, email: e.target.value})} 
                                    placeholder="ornek@sirket.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ünvan</label>
                                <Input 
                                    className="bg-white border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                                    value={newPersonData.title} 
                                    onChange={(e) => setNewPersonData({...newPersonData, title: e.target.value})} 
                                    placeholder="Örn: Satınalma Müdürü"
                                />
                            </div>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11" onClick={handleAddNewPerson} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Kişiyi Kaydet ve Seç
                        </Button>
                    </div>
                )}

                {!selectedCompany && !showPasteCustomer && (
                    <>
                        <div className="relative flex py-4 items-center">
                            <div className="flex-grow border-t border-gray-100"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-widest">veya</span>
                            <div className="flex-grow border-t border-gray-100"></div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-gray-500 hover:text-blue-600 h-16 rounded-xl transition-all duration-200"
                            onClick={() => setShowPasteCustomer(true)}
                        >
                            <Plus className="mr-2 h-5 w-5" /> Excel'den Müşteri Bilgisi Yapıştır
                        </Button>
                    </>
                )}
                {searchResults.persons.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kişiler</h3>
                    <div className="grid gap-3">
                    {searchResults.persons.map((person) => (
                      <div 
                        key={person.id}
                        className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200"
                        onClick={() => handleSelectCustomer('person', person)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{person.first_name} {person.last_name}</div>
                            <div className="text-sm text-gray-500">{person.companies?.name || "Şirket Yok"} • {person.title || "Ünvan Yok"}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">Seç</Button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paste Customer Section */}
            {showPasteCustomer && (
                <div className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-gray-50/30">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-lg">Müşteri Bilgisi Yapıştır</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowPasteCustomer(false)} className="hover:bg-red-50 hover:text-red-600">İptal</Button>
                    </div>
                    
                    {!parsedCustomer ? (
                        <>
                            <textarea 
                                placeholder="Excel'den kopyaladığınız müşteri satırını buraya yapıştırın..."
                                className="flex min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none shadow-sm transition-all"
                                value={pastedCustomerText}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedCustomerText(e.target.value)}
                            />
                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                <span className="font-semibold text-blue-700">İpucu:</span>
                                Format: Ad Soyad | Şirket | Proje | Şehir | Telefon
                            </div>
                            <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={!pastedCustomerText || loading} onClick={handleParseCustomer}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Veriyi Analiz Et
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-900 border-b pb-3">
                                {processStatus === 'idle' && "Analiz Sonucu (Düzenleyebilirsiniz)"}
                                {processStatus === 'company_not_found' && "Yeni Şirket Oluştur"}
                                {processStatus === 'person_not_found' && "Şirkete Kişi Ekle"}
                            </h4>

                            {processStatus === 'person_not_found' && foundCompany && (
                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 flex items-center gap-3 border border-blue-100">
                                    <div className="bg-blue-100 p-1 rounded-full"><Check className="h-4 w-4 text-blue-600" /></div>
                                    <div>
                                        Şirket bulundu: <strong>{foundCompany.name}</strong>. Bu şirkete aşağıdaki kişiyi eklemek ister misiniz?
                                    </div>
                                </div>
                            )}

                             {processStatus === 'company_not_found' && (
                                <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 flex items-center gap-3 border border-amber-100">
                                    <div className="bg-amber-100 p-1 rounded-full"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
                                    Şirket bulunamadı. Yeni kayıt oluşturulacak.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şirket</label>
                                    <Input 
                                        className="bg-gray-50 border-gray-200"
                                        value={parsedCustomer.company_name || ''} 
                                        onChange={(e) => setParsedCustomer({...parsedCustomer, company_name: e.target.value})}
                                        disabled={processStatus === 'person_not_found'} // Locked if company found
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Soyad</label>
                                    <Input className="bg-gray-50 border-gray-200" value={parsedCustomer.person_name || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, person_name: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proje</label>
                                    <Input className="bg-gray-50 border-gray-200" value={parsedCustomer.project_name || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, project_name: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şehir</label>
                                    <Input className="bg-gray-50 border-gray-200" value={parsedCustomer.city || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, city: e.target.value})} />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon (Zorunlu)</label>
                                    <Input 
                                        value={parsedCustomer.phone || ''} 
                                        onChange={(e) => setParsedCustomer({...parsedCustomer, phone: e.target.value})} 
                                        className={!parsedCustomer.phone ? "border-red-300 bg-red-50" : "bg-gray-50 border-gray-200"}
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-2 flex gap-3">
                                {processStatus === 'idle' && (
                                    <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={loading} onClick={() => handleProcessCustomer()}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Verileri Kontrol Et
                                    </Button>
                                )}

                                {processStatus === 'multiple_companies_found' && (
                                    <div className="w-full space-y-3">
                                        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                                            <div className="font-semibold mb-3">Benzer şirketler bulundu:</div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto mb-3 pr-1">
                                                {potentialCompanies.map((c: any) => (
                                                    <Button 
                                                        key={c.id}
                                                        variant="outline" 
                                                        className="w-full justify-start text-left bg-white hover:bg-blue-100 border-blue-200 h-auto py-3 px-4 rounded-lg"
                                                        onClick={() => handleSelectPotentialCompany(c.id)}
                                                    >
                                                        <Building2 className="mr-3 h-5 w-5 text-blue-600 shrink-0" />
                                                        <span className="truncate font-medium">{c.name}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-10"
                                                onClick={handleIgnorePotentialCompanies}
                                            >
                                                Hiçbiri değil, yeni şirket oluştur
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {processStatus === 'company_not_found' && (
                                    <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white shadow-sm" disabled={loading} onClick={handleCreateCompany}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Şirketi (+Kişiyi) Oluştur
                                    </Button>
                                )}

                                {processStatus === 'person_not_found' && (
                                    <>
                                        <Button variant="outline" className="flex-1 h-11 border-gray-200 hover:bg-gray-50 hover:text-gray-900" onClick={handleSkipPerson}>
                                            Hayır, Sadece Şirketi Seç
                                        </Button>
                                        <Button className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white shadow-sm" disabled={loading} onClick={handleCreatePersonForCompany}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Evet, Kişiyi Ekle
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end pt-6">
                <Button 
                    onClick={handleNext} 
                    disabled={(!selectedCompany && !selectedPerson) || showPasteCustomer}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl font-medium transition-all hover:scale-105"
                >
                    Devam Et <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {step === 'items' && (
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pb-6">
             <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Teklif Kalemleri</CardTitle>
                    <p className="text-gray-500 mt-1">Teklifinizde yer alacak ürün veya hizmetleri ekleyin.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('customer')} className="border-gray-200 hover:bg-white hover:border-gray-300">
                    Geri Dön
                </Button>
             </div>
          </CardHeader>
          <CardContent className="space-y-6 px-0">
             {mode === 'manual' ? (
                 <>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm h-fit">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1">Nasıl Çalışır?</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Excel'den ürün listesini kopyalayıp aşağıdaki alana yapıştırın. Sütunların sırası önemli değildir, yapay zeka sütunları (Ürün Adı, Adet, Fiyat vb.) otomatik olarak algılayacaktır.
                            </p>
                        </div>
                    </div>
                    
                    <textarea 
                        placeholder="Örnek: 
Laptop Bilgisayar | 5 Adet | 25.000 TL
Ofis Sandalyesi | 10 Adet | 3.500 TL"
                        className="flex min-h-[300px] w-full rounded-xl border border-gray-200 bg-white px-6 py-6 text-sm font-mono leading-relaxed ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 resize-y shadow-sm"
                        value={pastedItems}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedItems(e.target.value)}
                    />

                    <div className="flex justify-end pt-4">
                        <Button 
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl font-bold text-lg transition-all hover:scale-105" 
                            disabled={!pastedItems.trim() || loading} 
                            onClick={handleParseAndComplete}
                        >
                            {loading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                            Teklifi Oluştur
                        </Button>
                    </div>
                 </>
             ) : (
                 <>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Ürün Ara</label>
                            <ProductAutocomplete 
                                 value={productSearchInput} 
                                 onChange={setProductSearchInput} 
                                 onSelect={handleAddDatabaseItem}
                                 className="bg-gray-50 border-gray-200 focus:bg-white"
                             />
                        </div>

                        {/* List of added items */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Eklenen Ürünler ({databaseItems.length})</h3>
                            
                            {databaseItems.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                                    Henüz ürün eklenmedi. Yukarıdan arama yaparak ekleyebilirsiniz.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                    {databaseItems.map((item, index) => (
                                        <div key={item.id} className="p-4 bg-white flex items-center gap-4 group hover:bg-gray-50 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate">{item.product.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {item.product.code ? `#${item.product.code}` : ''} 
                                                    {item.product.defaultPrice ? ` • ${item.product.defaultPrice} ${item.product.unit || 'Birim'}` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center border rounded-lg bg-white shadow-sm h-9">
                                                    <button 
                                                        className="px-2.5 h-full hover:bg-gray-100 text-gray-600 border-r"
                                                        onClick={() => handleUpdateDatabaseItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                    >
                                                        -
                                                    </button>
                                                    <div className="w-12 text-center text-sm font-medium">{item.quantity}</div>
                                                    <button 
                                                        className="px-2.5 h-full hover:bg-gray-100 text-gray-600 border-l"
                                                        onClick={() => handleUpdateDatabaseItemQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleRemoveDatabaseItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button 
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl font-bold text-lg transition-all hover:scale-105" 
                            disabled={databaseItems.length === 0} 
                            onClick={handleDatabaseComplete}
                        >
                            Teklifi Oluştur
                        </Button>
                    </div>
                 </>
             )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

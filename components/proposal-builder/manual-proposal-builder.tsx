"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ParsedData } from "@/types";
import { Search, Plus, ArrowRight, User, Building2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { toTurkishLikePattern } from "@/lib/utils";
import { parseCustomerTextAction } from "@/app/actions/parse-customer";
import { createCompanyWithPersonAction, createPersonForCompanyAction } from "@/app/actions/create-customer";
import { processCustomerAction } from "@/app/actions/process-customer";
import { parseItemsTextAction } from "@/app/actions/parse-items";
import { Loader2 } from "lucide-react";

interface ManualProposalBuilderProps {
  onComplete: (data: ParsedData) => void;
  onCancel: () => void;
}

type Step = "customer" | "items";

export function ManualProposalBuilder({ onComplete, onCancel }: ManualProposalBuilderProps) {
  const [step, setStep] = useState<Step>("customer");
  const [loading, setLoading] = useState(false);
  
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
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-8">
        <div className={`flex items-center gap-2 ${step === 'customer' ? 'text-blue-600 font-bold' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'customer' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>1</div>
          Müşteri Seçimi
        </div>
        <div className="w-8 h-px bg-gray-300" />
        <div className={`flex items-center gap-2 ${step === 'items' ? 'text-blue-600 font-bold' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'items' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>2</div>
          Teklif Kalemleri
        </div>
      </div>

      {step === 'customer' && (
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Seçimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Search Section */}
            {!showPasteCustomer && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Müşteri ara (Şirket veya Kişi)..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Results */}
                {searchQuery.length >= 2 && !selectedCompany && (
                    <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                        {searchResults.companies.map(c => (
                            <div 
                                key={c.id} 
                                className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${selectedCompany?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                onClick={() => handleSelectCustomer('company', c)}
                            >
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div>
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-xs text-gray-500">{c.tax_no ? `VKN: ${c.tax_no}` : 'VKN Yok'}</div>
                                </div>
                            </div>
                        ))}
                        {searchResults.companies.length === 0 && !isSearching && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                Sonuç bulunamadı.
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Company Display & Change */}
                {selectedCompany && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <div>
                                <div className="font-medium text-blue-900">{selectedCompany.name}</div>
                                <div className="text-xs text-blue-700">{selectedCompany.tax_no ? `VKN: ${selectedCompany.tax_no}` : ''}</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
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
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                             <h3 className="font-medium text-sm">İlgili Kişi Seçin</h3>
                             <Button size="sm" variant="outline" onClick={() => setShowNewPersonForm(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Yeni Kişi Ekle
                             </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {companyPersons.length > 0 ? (
                                companyPersons.map(p => (
                                    <div 
                                        key={p.id} 
                                        className={`border rounded-md p-3 cursor-pointer hover:border-blue-500 transition-colors ${selectedPerson?.id === p.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'bg-white'}`}
                                        onClick={() => handleSelectCustomer('person', p)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{p.first_name} {p.last_name}</div>
                                                <div className="text-xs text-gray-500">{p.title || '-'}</div>
                                            </div>
                                            {selectedPerson?.id === p.id && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 p-4 text-center text-gray-500 text-sm border border-dashed rounded-md bg-gray-50">
                                    Bu şirkete kayıtlı kişi bulunamadı. Lütfen yeni kişi ekleyin.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* New Person Form */}
                {showNewPersonForm && (
                     <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-sm">Yeni Kişi Ekle</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowNewPersonForm(false)}>İptal</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Ad Soyad</label>
                                <Input 
                                    value={newPersonData.name} 
                                    onChange={(e) => setNewPersonData({...newPersonData, name: e.target.value})} 
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Telefon</label>
                                <Input 
                                    value={newPersonData.phone} 
                                    onChange={(e) => setNewPersonData({...newPersonData, phone: e.target.value})} 
                                    placeholder="Örn: 0555 123 45 67"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">E-posta</label>
                                <Input 
                                    value={newPersonData.email} 
                                    onChange={(e) => setNewPersonData({...newPersonData, email: e.target.value})} 
                                    placeholder="ornek@sirket.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Ünvan</label>
                                <Input 
                                    value={newPersonData.title} 
                                    onChange={(e) => setNewPersonData({...newPersonData, title: e.target.value})} 
                                    placeholder="Örn: Satınalma Müdürü"
                                />
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleAddNewPerson} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Kişiyi Kaydet ve Seç
                        </Button>
                    </div>
                )}

                {!selectedCompany && !showPasteCustomer && (
                    <>
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">veya</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-dashed"
                            onClick={() => setShowPasteCustomer(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Excel'den Müşteri Bilgisi Yapıştır
                        </Button>
                    </>
                )}
                {searchResults.persons.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Kişiler</h3>
                    {searchResults.persons.map((person) => (
                      <div 
                        key={person.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectCustomer('person', person)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{person.first_name} {person.last_name}</div>
                            <div className="text-xs text-gray-500">{person.companies?.name || "Şirket Yok"} • {person.title || "Ünvan Yok"}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600">Seç</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Paste Customer Section */}
            {showPasteCustomer && (
                <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm">Müşteri Bilgisi Yapıştır</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowPasteCustomer(false)}>İptal</Button>
                    </div>
                    
                    {!parsedCustomer ? (
                        <>
                            <textarea 
                                placeholder="Excel'den kopyaladığınız müşteri satırını buraya yapıştırın..."
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={pastedCustomerText}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedCustomerText(e.target.value)}
                            />
                            <div className="text-xs text-gray-500">
                                Format: Ad Soyad | Şirket | Proje | Şehir | Telefon
                            </div>
                            <Button className="w-full" disabled={!pastedCustomerText || loading} onClick={handleParseCustomer}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Analiz Et
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4 bg-white p-4 rounded border">
                            <h4 className="text-sm font-semibold border-b pb-2">
                                {processStatus === 'idle' && "Analiz Sonucu (Düzenleyebilirsiniz)"}
                                {processStatus === 'company_not_found' && "Yeni Şirket Oluştur"}
                                {processStatus === 'person_not_found' && "Şirkete Kişi Ekle"}
                            </h4>

                            {processStatus === 'person_not_found' && foundCompany && (
                                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    Şirket bulundu: <strong>{foundCompany.name}</strong>. Bu şirkete aşağıdaki kişiyi eklemek ister misiniz?
                                </div>
                            )}

                             {processStatus === 'company_not_found' && (
                                <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Şirket bulunamadı. Yeni kayıt oluşturulacak.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Şirket</label>
                                    <Input 
                                        value={parsedCustomer.company_name || ''} 
                                        onChange={(e) => setParsedCustomer({...parsedCustomer, company_name: e.target.value})}
                                        disabled={processStatus === 'person_not_found'} // Locked if company found
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Ad Soyad</label>
                                    <Input value={parsedCustomer.person_name || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, person_name: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Proje</label>
                                    <Input value={parsedCustomer.project_name || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, project_name: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Şehir</label>
                                    <Input value={parsedCustomer.city || ''} onChange={(e) => setParsedCustomer({...parsedCustomer, city: e.target.value})} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs font-medium">Telefon (Zorunlu)</label>
                                    <Input 
                                        value={parsedCustomer.phone || ''} 
                                        onChange={(e) => setParsedCustomer({...parsedCustomer, phone: e.target.value})} 
                                        className={!parsedCustomer.phone ? "border-red-300" : ""}
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-2 flex gap-2">
                                {processStatus === 'idle' && (
                                    <Button className="w-full" disabled={loading} onClick={() => handleProcessCustomer()}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Kontrol Et
                                    </Button>
                                )}

                                {processStatus === 'multiple_companies_found' && (
                                    <div className="w-full space-y-3">
                                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                                            <div className="font-semibold mb-2">Benzer şirketler bulundu:</div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto mb-2 pr-1">
                                                {potentialCompanies.map((c: any) => (
                                                    <Button 
                                                        key={c.id}
                                                        variant="outline" 
                                                        className="w-full justify-start text-left bg-white hover:bg-blue-100 border-blue-200 h-auto py-2"
                                                        onClick={() => handleSelectPotentialCompany(c.id)}
                                                    >
                                                        <Building2 className="mr-2 h-4 w-4 text-blue-600 shrink-0" />
                                                        <span className="truncate">{c.name}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={handleIgnorePotentialCompanies}
                                            >
                                                Hiçbiri değil, yeni şirket oluştur
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {processStatus === 'company_not_found' && (
                                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading} onClick={handleCreateCompany}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Şirketi (+Kişiyi) Oluştur
                                    </Button>
                                )}

                                {processStatus === 'person_not_found' && (
                                    <>
                                        <Button variant="outline" className="flex-1" onClick={handleSkipPerson}>
                                            Hayır, Sadece Şirketi Seç
                                        </Button>
                                        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={loading} onClick={handleCreatePersonForCompany}>
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

            <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={(!selectedCompany && !selectedPerson) || showPasteCustomer}>
                    Devam Et <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {step === 'items' && (
        <Card>
          <CardHeader>
             <div className="flex items-center justify-between">
                <CardTitle>Teklif Kalemleri</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setStep('customer')}>
                    Geri Dön
                </Button>
             </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 mb-4">
                Excel'den ürün listesini kopyalayıp aşağıdaki alana yapıştırın. Sütunların sırası önemli değildir, yapay zeka/algoritma sütunları otomatik algılayacaktır.
             </div>
             
             <textarea 
                placeholder="Ürün Adı | Adet | Birim | Fiyat..."
                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pastedItems}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedItems(e.target.value)}
             />

             <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel}>İptal</Button>
                <Button onClick={handleParseAndComplete} disabled={!pastedItems || loading}>
                    {loading ? 'İşleniyor...' : 'Teklifi Oluştur'}
                </Button>
             </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

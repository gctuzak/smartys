"use client";

import { useState, useEffect, useRef } from "react";
import { getProposalDetailsAction } from "@/app/actions/fetch-data";
import { listDocumentsAction, uploadDocumentAction } from "@/app/actions/documents";
import { updateProposalStatusAction } from "@/app/actions/update-proposal-status";
import { generateProposalPDF } from "@/lib/generate-proposal-pdf";
import { Modal } from "@/components/ui/modal";
import { Loader2, Building2, User, MapPin, Phone, Mail, Calendar, Hash, Check, FileText, CreditCard, Upload, Download, File as FileIcon, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROPOSAL_STATUSES = [
  { value: 'draft', label: 'Taslak Teklif', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'sent', label: 'Gönderilen Teklif', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'needs_revision', label: 'Revize edilecek teklif', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'converted_to_order', label: 'Siparişe dönüştü', color: 'bg-green-50 text-green-700 border-green-200' },
];

interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | null;
  onUpdate?: () => void;
}

export function ProposalDetailModal({ isOpen, onClose, proposalId, onUpdate }: ProposalDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && proposalId) {
      const fetchData = async () => {
        setLoading(true);
        const result = await getProposalDetailsAction(proposalId);
        if (result.success) {
          setData(result.data);
          setSelectedStatus(result.data.status);
          const docs = await listDocumentsAction({ proposalId });
          if (docs.success) setDocuments(docs.data || []);
        }
        setLoading(false);
      };
      fetchData();
    } else {
      setData(null);
      setSelectedStatus(null);
      setDocuments([]);
    }
  }, [isOpen, proposalId]);

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setIsDropdownOpen(false);
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    setIsGeneratingPDF(true);
    try {
      const doc = await generateProposalPDF(data);
      const filename = `Teklif-${data.proposal_no || "Detay"}.pdf`;
      
      // 1. İndir
      doc.save(filename);

      // 2. Sisteme Kaydet
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: "application/pdf" });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pdf");
      formData.append("proposalId", data.id);
      if (data.company?.id) formData.append("companyId", data.company.id);
      if (data.person?.id) formData.append("personId", data.person.id);

      const res = await uploadDocumentAction(formData);
      if (res.success) {
         const docs = await listDocumentsAction({ proposalId: data.id });
         if (docs.success) setDocuments(docs.data || []);
         toast.success("PDF indirildi ve sisteme kaydedildi");
      } else {
         toast.success("PDF indirildi ancak sisteme kaydedilemedi");
         console.error(res.error);
      }

    } catch (error) {
      console.error(error);
      toast.error("PDF oluşturulurken bir hata oluştu");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!data || !selectedStatus || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const result = await updateProposalStatusAction(data.id, selectedStatus);
      if (result.success) {
        setData((prev: any) => ({ ...prev, status: selectedStatus }));
        toast.success("Değişiklikler başarıyla kaydedildi");
        if (onUpdate) onUpdate();
      } else {
        toast.error("Değişiklikler kaydedilemedi");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type.includes("pdf") ? "pdf" : "excel");
      formData.append("proposalId", data.id);
      if (data.company?.id) formData.append("companyId", data.company.id);
      if (data.person?.id) formData.append("personId", data.person.id);
      const res = await uploadDocumentAction(formData);
      if (res.success) {
        const docs = await listDocumentsAction({ proposalId: data.id });
        if (docs.success) setDocuments(docs.data || []);
        setFileInputKey((k) => k + 1);
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Teklif Detayları" maxWidth="5xl">
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                     Teklif #{data.proposal_no || "-"}
                     {data.legacy_proposal_no && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 font-mono border">Ref: {data.legacy_proposal_no}</span>
                     )}
                   </h2>
                   <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Oluşturulma: {new Date(data.proposal_date || data.created_at).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF}
                className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-3 h-3 mr-2" />
                )}
                PDF İndir
              </Button>

              {data.status !== selectedStatus && (
                <Button 
                  onClick={handleSaveChanges} 
                  disabled={updatingStatus}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Değişiklikleri Kaydet"
                  )}
                </Button>
              )}
              <div className="relative inline-block text-left" ref={dropdownRef}>
                <button 
                  disabled={updatingStatus}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm",
                    PROPOSAL_STATUSES.find(s => s.value === selectedStatus)?.color || 'bg-gray-100 text-gray-800 border-gray-200'
                  )}>
                  {PROPOSAL_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus}
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                      {PROPOSAL_STATUSES.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleStatusChange(status.value)}
                          className={cn(
                            "group flex w-full items-center px-4 py-2.5 text-sm transition-colors",
                            selectedStatus === status.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {selectedStatus === status.value && (
                            <Check className="mr-3 h-4 w-4 text-blue-600" aria-hidden="true" />
                          )}
                          <span className={selectedStatus === status.value ? '' : 'ml-7'}>
                            {status.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Details */}
            {data.company ? (
              <div className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-900 font-semibold border-b border-gray-100 pb-3 mb-4">
                  <div className="bg-blue-50 p-1.5 rounded text-blue-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3>Müşteri Bilgileri</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{data.company.name}</p>
                    {data.company.tax_no && (
                       <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                         <FileText className="w-3 h-3" />
                         VKN: {data.company.tax_no} {data.company.tax_office && `• ${data.company.tax_office} VD`}
                       </p>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {data.company.address && (
                      <div className="flex gap-3 items-start group">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="leading-relaxed">{data.company.address}</span>
                      </div>
                    )}
                    {data.company.phone && (
                      <div className="flex gap-3 items-center group">
                        <Phone className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span>{data.company.phone}</span>
                      </div>
                    )}
                    {data.company.email && (
                      <div className="flex gap-3 items-center group">
                        <Mail className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span>{data.company.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
                 <div className="bg-gray-50 rounded-xl p-5 border border-dashed flex items-center justify-center text-gray-400 text-sm">
                    Müşteri bilgisi yok
                 </div>
            )}

            {/* Person Details */}
            {data.person ? (
              <div className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-900 font-semibold border-b border-gray-100 pb-3 mb-4">
                  <div className="bg-purple-50 p-1.5 rounded text-purple-600">
                    <User className="w-4 h-4" />
                  </div>
                  <h3>İlgili Kişi</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{data.person.first_name} {data.person.last_name}</p>
                    {data.person.title && (
                       <p className="text-purple-600 font-medium text-xs mt-1 uppercase tracking-wide">{data.person.title}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {data.person.phone && (
                      <div className="flex gap-3 items-center group">
                        <Phone className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        <span>{data.person.phone}</span>
                      </div>
                    )}
                    {data.person.email && (
                      <div className="flex gap-3 items-center group">
                        <Mail className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        <span>{data.person.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-5 border border-dashed flex items-center justify-center text-gray-400 text-sm">
                    İlgili kişi yok
                 </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-gray-50/50 px-4 py-3 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Teklif Kalemleri</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-[40%]">Açıklama</TableHead>
                  <TableHead>Özellikler</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items?.map((item: any) => (
                  <TableRow key={item.id} className={item.is_header ? "bg-gray-100 font-semibold" : "hover:bg-gray-50/50"}>
                    {item.is_header ? (
                      <TableCell colSpan={5} className="py-3 text-gray-800 align-top">
                        {item.description}
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="align-top">
                          <div className="font-medium text-gray-900">{item.description}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-2">
                            {/* En/Boy/Adet Badges */}
                            {(item.attributes?.["enCm"] || item.attributes?.["En"] || item.attributes?.["en"]) && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                En: {item.attributes?.["enCm"] || item.attributes?.["En"] || item.attributes?.["en"]}
                              </span>
                            )}
                            {(item.attributes?.["boyCm"] || item.attributes?.["Boy"] || item.attributes?.["boy"]) && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Boy: {item.attributes?.["boyCm"] || item.attributes?.["Boy"] || item.attributes?.["boy"]}
                              </span>
                            )}
                            {(item.attributes?.["adet"] || item.attributes?.["Adet"]) && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Adet: {item.attributes?.["adet"] || item.attributes?.["Adet"]}
                              </span>
                            )}

                            {/* Other Attributes */}
                            {item.attributes &&
                              Object.entries(item.attributes)
                                .filter(([key]) => !["en", "boy", "adet", "encm", "boycm"].includes(key.toLowerCase()))
                                .map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                  >
                                    {key}: {value as any}
                                  </span>
                                ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top font-medium text-gray-700">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right align-top text-gray-600">
                          {Number(item.unit_price || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {data.currency}
                        </TableCell>
                        <TableCell className="text-right align-top font-semibold text-gray-900">
                          {Number(item.total_price || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {data.currency}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Left Column: Notes & Terms */}
             <div className="lg:col-span-2 space-y-6">
                 {(data.payment_terms || data.notes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.payment_terms && (
                            <div className="bg-yellow-50/50 rounded-xl p-5 border border-yellow-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <CreditCard className="w-4 h-4 text-yellow-600" />
                                    <h4 className="text-sm font-semibold text-yellow-800">Ödeme Koşulları</h4>
                                </div>
                                <p className="text-sm text-yellow-700/80 whitespace-pre-wrap leading-relaxed">{data.payment_terms}</p>
                            </div>
                        )}
                        {data.notes && (
                            <div className={cn("bg-gray-50/50 rounded-xl p-5 border border-gray-100", !data.payment_terms && "md:col-span-2")}>
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <h4 className="text-sm font-semibold text-gray-700">Notlar</h4>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{data.notes}</p>
                            </div>
                        )}
                    </div>
                 )}
                 
                 {/* Documents Section */}
                 <div className="border rounded-xl p-5 bg-gray-50/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <FileIcon className="w-4 h-4 text-gray-500" />
                            Dokümanlar
                        </h3>
                        <label className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border bg-white text-xs font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                            <input key={fileInputKey} type="file" className="hidden" onChange={handleUpload} />
                            {uploading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
                            <span>{uploading ? "Yükleniyor..." : "Dosya Yükle"}</span>
                        </label>
                    </div>
                    {documents.length === 0 ? (
                        <div className="text-sm text-gray-500 italic text-center py-4 border-2 border-dashed rounded-lg">
                            Bu teklife bağlı doküman bulunmamaktadır.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {documents.map((doc) => (
                            <a
                                key={doc.id}
                                href={doc.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between rounded-lg border bg-white px-3 py-2.5 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-gray-100 p-1.5 rounded text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <FileIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate text-gray-900">{doc.original_name}</span>
                                        <span className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </a>
                            ))}
                        </div>
                    )}
                 </div>
             </div>

             {/* Right Column: Financial Totals */}
             <div className="lg:col-span-1">
                 <div className="bg-gray-50 rounded-xl p-6 border sticky top-6">
                    <h3 className="font-semibold text-gray-900 mb-6 pb-2 border-b">Özet</h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-gray-600">
                            <span className="text-sm">Ara Toplam</span>
                            <span className="font-medium">
                                {Number(data.total_amount).toLocaleString("tr-TR", { 
                                    style: 'currency', 
                                    currency: (data.currency || 'EUR').replace('TL', 'TRY')
                                })}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-gray-600">
                            <span className="text-sm">KDV (%{data.vat_rate || 20})</span>
                            <span className="font-medium">
                                {Number(data.vat_amount || 0).toLocaleString("tr-TR", { 
                                    style: 'currency', 
                                    currency: (data.currency || 'EUR').replace('TL', 'TRY')
                                })}
                            </span>
                        </div>

                        <div className="pt-4 mt-2 border-t flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Genel Toplam</span>
                            <span className="text-xl font-bold text-blue-600">
                                {Number(data.grand_total || (Number(data.total_amount) + Number(data.vat_amount || 0))).toLocaleString("tr-TR", { 
                                    style: 'currency', 
                                    currency: (data.currency || 'EUR').replace('TL', 'TRY')
                                })}
                            </span>
                        </div>
                    </div>
                 </div>
             </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-24 text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p>Veri bulunamadı.</p>
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { getProposalDetailsAction } from "@/app/actions/fetch-data";
import { listDocumentsAction, uploadDocumentAction } from "@/app/actions/documents";
import { updateProposalStatusAction } from "@/app/actions/update-proposal-status";
import { Modal } from "@/components/ui/modal";
import { Loader2, Building2, User, MapPin, Phone, Mail, Calendar, Hash, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
    <Modal isOpen={isOpen} onClose={onClose} title="Teklif Detayları" className="max-w-4xl">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-4 h-4 text-gray-400" />
                <h2 className="text-2xl font-bold text-gray-900">Teklif #{data.proposal_no || "-"}</h2>
                {data.legacy_proposal_no && (
                   <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 font-mono">Ref: {data.legacy_proposal_no}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(data.proposal_date || data.created_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              {data.status !== selectedStatus && (
                <Button 
                  onClick={handleSaveChanges} 
                  disabled={updatingStatus}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  PROPOSAL_STATUSES.find(s => s.value === selectedStatus)?.color || 'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {PROPOSAL_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus}
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      {PROPOSAL_STATUSES.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleStatusChange(status.value)}
                          className={`group flex w-full items-center px-4 py-2 text-sm ${
                            selectedStatus === status.value ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {selectedStatus === status.value && (
                            <Check className="mr-3 h-4 w-4 text-blue-600" aria-hidden="true" />
                          )}
                          <span className={selectedStatus === status.value ? 'font-medium ml-0' : 'ml-7'}>
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
          <div className={`grid grid-cols-1 ${data.company && data.person ? 'md:grid-cols-2' : ''} gap-8 py-4`}>
            {/* Company Details */}
            {data.company && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-semibold border-b border-gray-200 pb-3 mb-4">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3>Müşteri Bilgileri</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{data.company.name}</p>
                    {data.company.tax_no && (
                       <p className="text-gray-500 text-xs mt-1">VKN: {data.company.tax_no} {data.company.tax_office && `• ${data.company.tax_office} VD`}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2.5 text-gray-600">
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
            )}

            {/* Person Details */}
            {data.person && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-semibold border-b border-gray-200 pb-3 mb-4">
                  <User className="w-5 h-5 text-purple-600" />
                  <h3>İlgili Kişi</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{data.person.first_name} {data.person.last_name}</p>
                    {data.person.title && (
                       <p className="text-purple-600 font-medium text-xs mt-1 uppercase tracking-wide">{data.person.title}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2.5 text-gray-600">
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
            )}

            {/* Fallback if neither exists */}
            {!data.company && !data.person && (
                <div className="col-span-full text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-500 italic">Müşteri veya kişi bilgisi bulunamadı.</p>
                </div>
            )}
          </div>

          {/* Extra Details (Notes & Payment) */}
          {(data.notes || data.payment_terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
               {data.payment_terms && (
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">Ödeme Koşulları</h4>
                    <p className="text-sm text-yellow-700 whitespace-pre-wrap">{data.payment_terms}</p>
                  </div>
               )}
               {data.notes && (
                  <div className={`${data.payment_terms ? '' : 'col-span-2'} bg-gray-50 rounded-xl p-4 border border-gray-100`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Notlar</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.notes}</p>
                  </div>
               )}
            </div>
          )}

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Açıklama</TableHead>
                  <TableHead>En</TableHead>
                  <TableHead>Boy</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                        <div className="font-medium">{item.description}</div>
                        {item.attributes && (
                            <div className="text-xs text-gray-500">
                                {Object.entries(item.attributes)
                                .filter(([key]) => !['en', 'boy', 'adet', 'encm', 'boycm'].includes(key.toLowerCase()))
                                .map(([key, value]) => (
                                    <span key={key} className="mr-2">{key}: {value as any}</span>
                                ))}
                            </div>
                        )}
                    </TableCell>
                    <TableCell>
                        {item.attributes?.['enCm'] || item.attributes?.['En'] || item.attributes?.['en'] || "-"}
                    </TableCell>
                    <TableCell>
                        {item.attributes?.['boyCm'] || item.attributes?.['Boy'] || item.attributes?.['boy'] || "-"}
                    </TableCell>
                    <TableCell>
                        {item.attributes?.['adet'] || item.attributes?.['Adet'] || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                        {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                        {Number(item.unit_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {data.currency}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                        {Number(item.total_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {data.currency}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>

        {/* Footer Total */}
        <div className="flex justify-end border-t pt-4">
          <div className="text-right space-y-1">
              <div className="flex justify-end items-center gap-4 text-gray-600">
                  <span className="text-sm">Ara Toplam:</span>
                  <span className="font-medium text-lg">
                      {Number(data.total_amount).toLocaleString("tr-TR", { 
                          style: 'currency', 
                          currency: (data.currency || 'EUR').replace('TL', 'TRY')
                      })}
                  </span>
              </div>
              
              <div className="flex justify-end items-center gap-4 text-gray-600">
                  <span className="text-sm">KDV (%{data.vat_rate || 20}):</span>
                  <span className="font-medium text-lg">
                      {Number(data.vat_amount || 0).toLocaleString("tr-TR", { 
                          style: 'currency', 
                          currency: (data.currency || 'EUR').replace('TL', 'TRY')
                      })}
                  </span>
              </div>

              <div className="flex justify-end items-center gap-4 pt-2 mt-2 border-t">
                  <span className="text-base font-bold text-gray-800">Genel Toplam:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {Number(data.grand_total || (Number(data.total_amount) + Number(data.vat_amount || 0))).toLocaleString("tr-TR", { 
                        style: 'currency', 
                        currency: (data.currency || 'EUR').replace('TL', 'TRY')
                    })}
                  </span>
              </div>
            </div>
          </div>
          {/* Documents */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Dokümanlar</h3>
              <label className="inline-flex items-center justify-center px-3 py-2 rounded-md border bg-white text-sm cursor-pointer">
                <input key={fileInputKey} type="file" className="hidden" onChange={handleUpload} />
                <span>{uploading ? "Yükleniyor..." : "Dosya Yükle"}</span>
              </label>
            </div>
            {documents.length === 0 ? (
              <div className="text-sm text-gray-500">Bu teklife bağlı doküman yok.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100">{doc.type}</span>
                      <span className="text-sm font-medium">{doc.original_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleString("tr-TR")}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Veri bulunamadı.
        </div>
      )}
    </Modal>
  );
}

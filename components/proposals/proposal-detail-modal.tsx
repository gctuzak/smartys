"use client";

import { useState, useEffect } from "react";
import { getProposalDetailsAction } from "@/app/actions/fetch-data";
import { listDocumentsAction, uploadDocumentAction } from "@/app/actions/documents";
import { Modal } from "@/components/ui/modal";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | null;
}

export function ProposalDetailModal({ isOpen, onClose, proposalId }: ProposalDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (isOpen && proposalId) {
      const fetchData = async () => {
        setLoading(true);
        const result = await getProposalDetailsAction(proposalId);
        if (result.success) {
          setData(result.data);
          const docs = await listDocumentsAction({ proposalId });
          if (docs.success) setDocuments(docs.data || []);
        }
        setLoading(false);
      };
      fetchData();
    } else {
      setData(null);
      setDocuments([]);
    }
  }, [isOpen, proposalId]);

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
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Teklif No</p>
              <p className="font-mono font-bold text-lg">#{data.proposal_no || "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Tarih</p>
              <p className="font-medium">{new Date(data.created_at).toLocaleDateString("tr-TR")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Müşteri / Şirket</p>
              <p className="font-bold">{data.company?.name}</p>
              {data.company?.email && (
                 <p className="text-sm text-gray-600">{data.company.email}</p>
              )}
               {data.company?.phone && (
                 <p className="text-sm text-gray-600">{data.company.phone}</p>
              )}
            </div>
             <div className="text-right">
              <p className="text-sm text-gray-500">Durum</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                data.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                data.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                data.status === 'accepted' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {data.status === 'draft' ? 'Taslak' :
                 data.status === 'sent' ? 'Gönderildi' :
                 data.status === 'accepted' ? 'Onaylandı' : data.status}
              </span>
            </div>
          </div>

          {(data.company?.tax_no || data.company?.address) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                   {data.company.tax_no && (
                       <div>
                           <span className="font-semibold">Vergi No:</span> {data.company.tax_no}
                       </div>
                   )}
                   {data.company.tax_office && (
                       <div>
                           <span className="font-semibold">Vergi Dairesi:</span> {data.company.tax_office}
                       </div>
                   )}
                   {data.company.address && (
                       <div className="col-span-3">
                           <span className="font-semibold">Adres:</span> {data.company.address}
                       </div>
                   )}
              </div>
          )}

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

        <div className="flex justify-end border-t pt-4">
          <div className="text-right space-y-1">
              <div className="flex justify-end items-center gap-4 text-gray-600">
                  <span className="text-sm">Ara Toplam:</span>
                  <span className="font-medium text-lg">
                      {Number(data.total_amount).toLocaleString("tr-TR", { 
                          style: 'currency', 
                          currency: data.currency || 'EUR' 
                      })}
                  </span>
              </div>
              
              <div className="flex justify-end items-center gap-4 text-gray-600">
                  <span className="text-sm">KDV (%{data.vat_rate || 20}):</span>
                  <span className="font-medium text-lg">
                      {Number(data.vat_amount || 0).toLocaleString("tr-TR", { 
                          style: 'currency', 
                          currency: data.currency || 'EUR' 
                      })}
                  </span>
              </div>

              <div className="flex justify-end items-center gap-4 pt-2 mt-2 border-t">
                  <span className="text-base font-bold text-gray-800">Genel Toplam:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {Number(data.grand_total || (Number(data.total_amount) + Number(data.vat_amount || 0))).toLocaleString("tr-TR", { 
                        style: 'currency', 
                        currency: data.currency || 'EUR' 
                    })}
                  </span>
              </div>
            </div>
          </div>
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

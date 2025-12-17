"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Trash2, ExternalLink, Loader2, FolderOpen, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadDocumentAction, listDocumentsAction, deleteDocumentAction } from "@/app/actions/documents";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileManagerProps {
  entityType: "company" | "person" | "order" | "proposal";
  entityId: string;
  companyId?: string | null; // Needed for context if available
  personId?: string | null; // Needed for context if available
  proposalId?: string | null; // Needed for context if available
  orderId?: string | null; // Needed for context if available
}

interface Document {
  id: string;
  original_name: string;
  type: string;
  public_url: string;
  size: number;
  created_at: string;
  mime_type: string;
  company_id?: string;
  person_id?: string;
  proposal_id?: string;
  order_id?: string;
}

const DOCUMENT_TYPES = [
  { value: "tax_plate", label: "Vergi Levhası" },
  { value: "trade_registry", label: "Ticaret Sicil Gazetesi" },
  { value: "signature_circular", label: "İmza Sirküleri" },
  { value: "identity", label: "Kimlik Fotokopisi" },
  { value: "contract", label: "Sözleşme" },
  { value: "invoice", label: "Fatura" },
  { value: "proposal", label: "Teklif Dosyası" },
  { value: "project", label: "Proje Dosyası" },
  { value: "other", label: "Diğer" },
];

export function FileManager({ 
  entityType, 
  entityId, 
  companyId, 
  personId, 
  proposalId, 
  orderId 
}: FileManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("other");
  const [showAllFiles, setShowAllFiles] = useState(false); // Toggle for "All Related Files"

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        includeRelated: showAllFiles
      };

      // Set base filter based on entity type or forced IDs
      if (entityType === "company") filters.companyId = entityId;
      else if (entityType === "person") filters.personId = entityId;
      else if (entityType === "proposal") filters.proposalId = entityId;
      else if (entityType === "order") filters.orderId = entityId;
      
      const result = await listDocumentsAction(filters);
      
      if (result.success) {
        setDocuments(result.data || []);
      } else {
        toast.error("Dosyalar yüklenemedi: " + result.error);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, showAllFiles]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedType);
      
      // Append context IDs
      if (companyId) formData.append("companyId", companyId);
      if (personId) formData.append("personId", personId);
      if (proposalId) formData.append("proposalId", proposalId);
      if (orderId) formData.append("orderId", orderId);
      
      // Also append current entity ID if it's missing from props (e.g. if we are on company page, entityId is companyId)
      if (entityType === "company" && !companyId) formData.append("companyId", entityId);
      if (entityType === "person" && !personId) formData.append("personId", entityId);
      if (entityType === "proposal" && !proposalId) formData.append("proposalId", entityId);
      if (entityType === "order" && !orderId) formData.append("orderId", entityId);

      const result = await uploadDocumentAction(formData);

      if (result.success) {
        toast.success("Dosya başarıyla yüklendi");
        fetchDocuments();
        // Reset input
        e.target.value = "";
      } else {
        toast.error("Yükleme hatası: " + result.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Bir hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;

    try {
      const result = await deleteDocumentAction(id);
      if (result.success) {
        toast.success("Dosya silindi");
        setDocuments(docs => docs.filter(d => d.id !== id));
      } else {
        toast.error("Silme hatası: " + result.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("image")) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  
  const getContextBadge = (doc: Document) => {
    if (entityType === "company" || entityType === "person") {
       if (doc.order_id) return <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">Sipariş</Badge>;
       if (doc.proposal_id) return <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Teklif</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Dosya Türü" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="relative">
             <input
                type="file"
                id="file-upload-input"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button 
                type="button"
                onClick={() => document.getElementById("file-upload-input")?.click()}
                disabled={uploading}
                className="whitespace-nowrap"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Dosya Yükle
              </Button>
          </div>
        </div>

        {(entityType === "company" || entityType === "person") && (
             <Button 
                type="button"
                variant={showAllFiles ? "secondary" : "outline"}
                onClick={() => setShowAllFiles(!showAllFiles)}
                className="w-full sm:w-auto"
             >
                <FolderOpen className="w-4 h-4 mr-2" />
                {showAllFiles ? "Sadece Bu Kayda Ait Olanlar" : "Tüm İlişkili Dosyaları Göster"}
             </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Henüz dosya yüklenmemiş.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="shrink-0 bg-gray-50 p-2 rounded-lg">
                  {getFileIcon(doc.mime_type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                     <p className="text-sm font-medium text-gray-900 truncate pr-2" title={doc.original_name}>
                        {doc.original_name}
                     </p>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatSize(doc.size)}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString("tr-TR")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] h-5">
                        {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label || doc.type}
                    </Badge>
                    {getContextBadge(doc)}
                  </div>

                  <a 
                    href={doc.public_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                  >
                    Görüntüle <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

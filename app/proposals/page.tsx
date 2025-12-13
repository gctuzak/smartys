"use client";

import { useState, useEffect, useCallback } from "react";
import { getProposalsAction, deleteProposalAction } from "@/app/actions/fetch-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Loader2, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { ProposalDetailModal } from "@/components/proposals/proposal-detail-modal";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    const result = await getProposalsAction(page, 20, search);
    if (result.success) {
      setProposals(result.data || []);
      setTotalPages(result.totalPages || 1);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProposals();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProposals]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu teklifi ve ilgili tüm kalemleri silmek istediğinize emin misiniz?")) return;
    
    const result = await deleteProposalAction(id);
    if (result.success) {
      toast.success("Teklif silindi");
      fetchProposals();
    } else {
      toast.error(result.error || "Silme işlemi başarısız");
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedProposalId(id);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teklifler</h1>
          <p className="text-gray-500">Oluşturulan tüm tekliflerin listesi</p>
        </div>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="mr-2 h-4 w-4" /> Yeni Teklif
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Durum araması..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teklif No</TableHead>
                <TableHead>Şirket</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Teklif bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((proposal) => (
                  <TableRow 
                    key={proposal.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewDetails(proposal.id)}
                  >
                    <TableCell className="font-mono text-sm text-gray-500">
                      #{proposal.proposal_no || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {proposal.company?.name ? (
                         <div className="flex flex-col">
                           <span>{proposal.company.name}</span>
                           {proposal.person && (
                             <span className="text-xs text-gray-500">{proposal.person.first_name} {proposal.person.last_name}</span>
                           )}
                         </div>
                      ) : proposal.person ? (
                         <div className="flex flex-col">
                           <span>{proposal.person.first_name} {proposal.person.last_name}</span>
                           <span className="text-xs text-gray-400 font-normal italic">Şirket yok</span>
                         </div>
                      ) : (
                        <span className="text-gray-400 italic">İsimsiz Teklif</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(proposal.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {Number(proposal.grand_total || (Number(proposal.total_amount) * 1.2)).toLocaleString("tr-TR", { 
                        style: 'currency', 
                        currency: proposal.currency || 'EUR' 
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        proposal.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        proposal.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {proposal.status === 'draft' ? 'Taslak' :
                         proposal.status === 'sent' ? 'Gönderildi' :
                         proposal.status === 'accepted' ? 'Onaylandı' : proposal.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* 
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(proposal.id);
                          }}
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Önceki
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Sayfa {page} / {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sonraki
          </Button>
        </div>
      </div>

      <ProposalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        proposalId={selectedProposalId}
      />
    </div>
  );
}

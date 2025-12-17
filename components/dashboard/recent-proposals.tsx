"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ProposalDetailModal } from "@/components/proposals/proposal-detail-modal";
import { CompanyModal } from "@/components/companies/company-modal";

interface RecentProposalsProps {
  proposals: any[];
}

export function RecentProposals({ proposals }: RecentProposalsProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const handleProposalClick = (id: string) => {
    setSelectedProposalId(id);
    setIsProposalModalOpen(true);
  };

  const handleCompanyClick = (e: React.MouseEvent, company: any) => {
    e.stopPropagation();
    if (company) {
      setSelectedCompany(company);
      setIsCompanyModalOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    switch (normalizedStatus) {
      case 'approved':
      case 'converted_to_order':
        return { label: 'Onaylandı', className: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: 'Reddedildi', className: 'bg-red-100 text-red-800' };
      case 'draft':
        return { label: 'Taslak', className: 'bg-gray-100 text-gray-800' };
      case 'sent':
        return { label: 'Gönderildi', className: 'bg-blue-100 text-blue-800' };
      case 'needs_revision':
        return { label: 'Revize İsteniyor', className: 'bg-orange-100 text-orange-800' };
      case 'pending':
        return { label: 'Beklemede', className: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: 'Beklemede', className: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <>
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Son Teklifler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Henüz teklif yok.
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((proposal) => {
                  const statusBadge = getStatusBadge(proposal.status);
                  return (
                    <TableRow 
                      key={proposal.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleProposalClick(proposal.id)}
                    >
                      <TableCell className="font-medium">
                        <span 
                          className="hover:underline hover:text-blue-600"
                          onClick={(e) => handleCompanyClick(e, proposal.companies)}
                        >
                          {proposal.companies?.name || "Bilinmiyor"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(proposal.total_amount, proposal.currency)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {format(new Date(proposal.created_at), "d MMM", { locale: tr })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProposalDetailModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        proposalId={selectedProposalId}
      />

      {selectedCompany && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          company={selectedCompany}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}

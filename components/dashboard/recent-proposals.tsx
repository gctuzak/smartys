"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProposalDetailModal } from "@/components/proposals/proposal-detail-modal";
import { CompanyModal } from "@/components/companies/company-modal";
import { Proposal } from "@/app/actions/dashboard";

interface RecentProposalsProps {
  proposals: Proposal[];
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
        return { label: 'Onaylandı', className: 'bg-green-50 text-green-700 border border-green-200' };
      case 'rejected':
        return { label: 'Reddedildi', className: 'bg-red-50 text-red-700 border border-red-200' };
      case 'draft':
        return { label: 'Taslak', className: 'bg-gray-50 text-gray-700 border border-gray-200' };
      case 'sent':
        return { label: 'Gönderildi', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'needs_revision':
        return { label: 'Revize', className: 'bg-orange-50 text-orange-700 border border-orange-200' };
      case 'pending':
        return { label: 'Beklemede', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
      default:
        return { label: 'Beklemede', className: 'bg-gray-50 text-gray-700 border border-gray-200' };
    }
  };

  return (
    <>
      <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Son Teklifler</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {proposals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Henüz teklif bulunmuyor.
            </div>
          ) : (
            proposals.map((proposal) => {
              const statusBadge = getStatusBadge(proposal.status);
              const companyName = proposal.companies?.name || "Bilinmiyor";
              const companyInitial = companyName.charAt(0).toUpperCase();

              return (
                <div 
                  key={proposal.id} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => handleProposalClick(proposal.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {companyInitial}
                    </div>
                    <div>
                      <p 
                        className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors"
                        onClick={(e) => handleCompanyClick(e, proposal.companies)}
                      >
                        {companyName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {proposal.proposal_no ? `#${proposal.proposal_no}` : ''} • {formatCurrency(proposal.total_amount, proposal.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {formatDate(proposal.created_at, "d MMM")}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isProposalModalOpen && selectedProposalId && (
        <ProposalDetailModal
          isOpen={isProposalModalOpen}
          onClose={() => {
            setIsProposalModalOpen(false);
            setSelectedProposalId(null);
          }}
          proposalId={selectedProposalId}
        />
      )}

      {isCompanyModalOpen && selectedCompany && (
        <CompanyModal
          isOpen={isCompanyModalOpen}
          onClose={() => {
            setIsCompanyModalOpen(false);
            setSelectedCompany(null);
          }}
          company={selectedCompany}
          onSuccess={() => {
            // Optional: refresh data if needed
          }}
        />
      )}
    </>
  );
}

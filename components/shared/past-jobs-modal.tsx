'use client';

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { getPastJobsAction } from "@/app/actions/get-past-jobs";
import { Loader2, FileText, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";
import { ProposalDetailModal } from "@/components/proposals/proposal-detail-modal";

interface PastJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'company' | 'person';
  entityId: string;
  entityName: string;
}

export function PastJobsModal({ isOpen, onClose, entityType, entityId, entityName }: PastJobsModalProps) {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      const fetchJobs = async () => {
        setLoading(true);
        const result = await getPastJobsAction(entityType, entityId);
        if (result.success) {
          setJobs(result.data || []);
        } else {
          // Show error toast or state
          console.error(result.error);
        }
        setLoading(false);
      };
      fetchJobs();
    }
  }, [isOpen, entityId, entityType]);

  const handleJobClick = (job: any) => {
    if (job.type === 'order') {
      setSelectedOrderId(job.id);
    } else if (job.type === 'proposal') {
      setSelectedProposalId(job.id);
    }
  };

  const formatCurrency = (amount: any, currency: string) => {
    if (amount === null || amount === undefined) return "-";
    
    let validCurrency = currency;
    // Basic validation for currency code (3 letters)
    // If invalid (e.g. number string like "2.206,27"), fallback to TRY
    if (!validCurrency || validCurrency.length !== 3 || !/^[A-Za-z]{3}$/.test(validCurrency)) {
      validCurrency = "TRY";
    }

    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: validCurrency,
      }).format(amount);
    } catch (error) {
      console.error("Currency format error:", error);
      return new Intl.NumberFormat("tr-TR").format(amount);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${entityName} - Geçmiş İşler`}
      maxWidth="3xl"
    >
      <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <FileText className="w-12 h-12 mb-2 opacity-20" />
            <p>Henüz geçmiş iş kaydı bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={`${job.type}-${job.id}`}
                onClick={() => handleJobClick(job)}
                className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  job.type === 'order' 
                    ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50' 
                    : 'bg-orange-50/50 border-orange-100 hover:bg-orange-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    job.type === 'order' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {job.type === 'order' ? (
                      <ShoppingCart className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {job.type === 'order' ? 'Sipariş' : 'Teklif'} 
                        <span className="text-sm font-normal text-gray-500 ml-1">#{job.reference}</span>
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.type === 'order'
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-orange-200 text-orange-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(job.date), "d MMMM yyyy", { locale: tr })}
                    </p>
                    {job.notes && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {job.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {formatCurrency(job.amount, job.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OrderDetailModal 
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />

      <ProposalDetailModal
        isOpen={!!selectedProposalId}
        onClose={() => setSelectedProposalId(null)}
        proposalId={selectedProposalId}
        onUpdate={() => {
          // Optional: Refresh list if needed
        }}
      />
    </Modal>
  );
}

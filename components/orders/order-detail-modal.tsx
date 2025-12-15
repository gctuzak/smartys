"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { getOrderDetailsAction } from "@/app/actions/fetch-data";
import { ProposalDetailModal } from "@/components/proposals/proposal-detail-modal";
import { Loader2, FileText, User, Building2, Calendar, Banknote, Briefcase, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export function OrderDetailModal({ isOpen, onClose, orderId }: OrderDetailModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const result = await getOrderDetailsAction(orderId);
      if (result.success) {
        setOrder(result.data);
      } else {
        toast.error(result.error || "Sipariş detayları alınamadı");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sipariş Detayı ${order?.order_no ? '#' + order.order_no : ''}`}>
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-2" /> Müşteri Bilgileri
              </h3>
              {order.company ? (
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900">{order.company.name}</p>
                  <p>{order.company.email1}</p>
                  <p>{order.company.phone1}</p>
                  <p className="text-gray-500 text-xs mt-1">{order.company.city}, {order.company.country}</p>
                </div>
              ) : order.person ? (
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900">{order.person.first_name} {order.person.last_name}</p>
                  <p>{order.person.email1}</p>
                  <p>{order.person.phone1}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Müşteri bilgisi yok</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <User className="h-4 w-4 mr-2" /> Temsilci & İlgili Kişi
              </h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-xs text-gray-500 block">Sipariş Sorumlusu</span>
                  {order.representative ? (
                    <span className="font-medium">{order.representative.first_name} {order.representative.last_name}</span>
                  ) : (
                    <span className="text-gray-400 italic">-</span>
                  )}
                </div>
                {order.person && order.company && (
                   <div className="text-sm">
                   <span className="text-xs text-gray-500 block">İlgili Kişi</span>
                   <span className="font-medium">{order.person.first_name} {order.person.last_name}</span>
                   <span className="text-xs text-gray-400 block">{order.person.title}</span>
                 </div>
                )}
              </div>
            </div>
          </div>

          {/* Financials & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
                <Banknote className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm text-gray-500">Tutar</span>
                <span className="text-xl font-bold text-green-700">
                    {Number(order.amount || 0).toLocaleString("tr-TR", { 
                        style: 'currency', 
                        currency: (order.currency || 'EUR').replace('TL', 'TRY')
                    })}
                </span>
             </div>
             
             <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
                <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm text-gray-500">Sipariş Tarihi</span>
                <span className="text-lg font-medium text-gray-900">
                    {new Date(order.order_date || order.created_at).toLocaleDateString("tr-TR")}
                </span>
             </div>

             <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
                <Briefcase className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm text-gray-500">Durum</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                    {order.status}
                </span>
             </div>
          </div>

          {/* Project & Notes */}
          <div className="space-y-4">
             {order.project_name && (
                 <div>
                     <h4 className="text-sm font-medium text-gray-900 mb-1">Proje Adı</h4>
                     <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{order.project_name}</p>
                 </div>
             )}

             {order.notes && (
                 <div>
                     <h4 className="text-sm font-medium text-gray-900 mb-1">Notlar</h4>
                     <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border whitespace-pre-wrap">{order.notes}</p>
                 </div>
             )}
          </div>
          
          {/* Proposal Link */}
          {order.proposal && (
              <div className="mt-4 pt-4 border-t">
                  <div 
                    className="flex items-center justify-between bg-blue-50 p-3 rounded-md border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors group"
                    onClick={() => setIsProposalModalOpen(true)}
                  >
                      <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                              <p className="text-sm font-medium text-blue-900 group-hover:text-blue-800 flex items-center gap-2">
                                Bağlı Teklif: #{order.proposal.proposal_no}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-xs text-blue-700">
                                  Teklif Tutarı: {Number(order.proposal.grand_total).toLocaleString("tr-TR", { style: 'currency', currency: (order.proposal.currency || 'EUR').replace('TL', 'TRY') })}
                              </p>
                          </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium flex items-center bg-white/50 px-2 py-1 rounded">
                        Görüntüle <ExternalLink className="ml-1 h-3 w-3" />
                      </div>
                  </div>
              </div>
          )}

        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Sipariş detayları bulunamadı.
        </div>
      )}

      {/* Proposal Detail Modal */}
      {order?.proposal && (
        <ProposalDetailModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          proposalId={order.proposal.id}
          onUpdate={fetchOrderDetails}
        />
      )}
    </Modal>
  );
}

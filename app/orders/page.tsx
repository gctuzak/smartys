"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrdersAction, deleteOrderAction } from "@/app/actions/fetch-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Loader2, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortField, setSortField] = useState("order_no");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getOrdersAction(page, 20, search, sortField, sortOrder);
      if (result.success) {
        setOrders(result.data || []);
        setTotalPages(result.totalPages || 1);
      } else {
        toast.error(result.error || "Veriler alınamadı");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortField, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu siparişi silmek istediğinize emin misiniz?")) return;
    
    const result = await deleteOrderAction(id);
    if (result.success) {
      toast.success("Sipariş silindi");
      fetchOrders();
    } else {
      toast.error(result.error || "Silme işlemi başarısız");
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDetailModalOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-500">Tüm siparişlerin listesi</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Sipariş No veya Durum araması..."
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
                <TableHead onClick={() => handleSort("order_no")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Sipariş No <SortIcon field="order_no" />
                  </div>
                </TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Temsilci</TableHead>
                <TableHead onClick={() => handleSort("order_date")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Tarih <SortIcon field="order_date" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("amount")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Tutar <SortIcon field="amount" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center">
                    Durum <SortIcon field="status" />
                  </div>
                </TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Sipariş bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewDetails(order.id)}
                  >
                    <TableCell className="font-mono text-sm text-gray-500">
                      #{order.order_no}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.company?.name || (order.person ? `${order.person.first_name} ${order.person.last_name}` : "-")}
                    </TableCell>
                    <TableCell>
                      {order.representative ? `${order.representative.first_name} ${order.representative.last_name}` : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(order.order_date || order.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {Number(order.amount || 0).toLocaleString("tr-TR", { 
                        style: 'currency', 
                        currency: (order.currency || 'EUR').replace('TL', 'TRY')
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* 
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(order.id);
                          }}
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
                            handleDelete(order.id);
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

      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        orderId={selectedOrderId}
      />
    </div>
  );
}

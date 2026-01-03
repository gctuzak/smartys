"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getOrdersAction } from "@/app/actions/fetch-data";
import { Search, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function CreateFromOrderButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                fetchOrders();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, search]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const result = await getOrdersAction(1, 50, search); 
            if (result.success) {
                setOrders(result.data || []);
            }
        } catch (error) {
            console.error("Fetch orders error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (orderId: string) => {
        setIsOpen(false);
        router.push(`/muhasebe/faturalar/yeni?type=SATIS&orderId=${orderId}`);
    };

    return (
        <>
            <Button 
                variant="outline" 
                className="bg-white"
                onClick={() => setIsOpen(true)}
            >
                <FileText className="w-4 h-4 mr-2" />
                Siparişten Oluştur
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Sipariş Seçimi"
            >
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Sipariş no veya firma ara..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto border rounded-md">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : orders.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 font-medium text-gray-500">No</th>
                                        <th className="px-4 py-2 font-medium text-gray-500">Firma</th>
                                        <th className="px-4 py-2 font-medium text-gray-500">Tarih</th>
                                        <th className="px-4 py-2 font-medium text-gray-500 text-right">Tutar</th>
                                        <th className="px-4 py-2 font-medium text-gray-500"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-blue-600">{order.order_no}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {order.company?.name || (order.person ? `${order.person.first_name} ${order.person.last_name}` : '-')}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{formatDate(order.order_date || order.created_at)}</td>
                                            <td className="px-4 py-3 font-medium text-right text-gray-900">
                                                {formatCurrency(order.amount, order.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="secondary" onClick={() => handleSelect(order.id)}>
                                                    Seç
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                Sipariş bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}

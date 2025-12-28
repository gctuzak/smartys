"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";

interface RecentOrdersProps {
  orders: any[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <>
      <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Son Siparişler</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Henüz sipariş bulunmuyor.
            </div>
          ) : (
            orders.map((order) => {
              // Supabase returns relations with table names (plural) by default
              const company = order.companies || order.company;
              const person = order.persons || order.person;
              
              const isCompany = !!company;
              const name = isCompany 
                ? company.name 
                : (person ? `${person.first_name} ${person.last_name}` : 'Bilinmeyen Müşteri');
              const type = isCompany ? "Kurumsal" : "Bireysel";
              
              return (
                <div 
                  key={order.id} 
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">
                        #{order.order_no} • {type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.amount, order.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(order.order_date, "d MMM")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <OrderDetailModal 
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </>
  );
}

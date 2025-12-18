import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

interface RecentOrdersProps {
  orders: any[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
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
            const companyName = order.companies?.name || "Bilinmiyor";
            const companyInitial = companyName.charAt(0).toUpperCase();

            return (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.order_no}
                    </p>
                    <p className="text-xs text-gray-500">
                      {companyName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(order.amount, order.currency)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {order.order_date ? format(new Date(order.order_date), "d MMM", { locale: tr }) : '-'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

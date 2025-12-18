import { Card, CardContent } from "@/components/ui/card";
import { FileText, ShoppingCart, Users, CheckCircle } from "lucide-react";
import { DashboardStats } from "@/app/actions/dashboard";
import { formatCurrency } from "@/lib/utils";

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const statItems = [
    {
      title: "Tekliflerim",
      value: stats.user.totalProposals,
      subValue: `Şirket: ${stats.company.totalProposals}`,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      trend: "+12%", // Dummy trend
      trendUp: true
    },
    {
      title: "Siparişlerim",
      value: stats.user.totalOrders,
      subValue: `Toplam: ${formatCurrency(stats.user.totalOrderAmount, 'EUR')}`,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100",
      trend: "+5%", // Dummy trend
      trendUp: true
    },
    {
      title: "Bekleyen Görevler",
      value: stats.user.pendingTasks,
      subValue: "Tamamlanması gereken",
      icon: CheckCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      trend: "-2%", // Dummy trend
      trendUp: false
    },
    {
      title: "Şirket Siparişleri",
      value: stats.company.totalOrders,
      subValue: formatCurrency(stats.company.totalOrderAmount, 'EUR'),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      trend: "+8%", // Dummy trend
      trendUp: true
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${item.bgColor}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{item.value}</h3>
                </div>
              </div>
              {/* Optional Trend Indicator 
              <div className={`flex items-center text-xs font-medium ${item.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {item.trendUp ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                {item.trend}
              </div>
              */}
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 font-medium">
                {item.subValue}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

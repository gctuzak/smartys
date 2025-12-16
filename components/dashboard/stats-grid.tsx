import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/app/actions/dashboard";
import { FileText, ShoppingCart, CheckCircle, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tekliflerim</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.user.totalProposals}</div>
          <p className="text-xs text-muted-foreground">
            Şirket geneli: {stats.company.totalProposals}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Siparişlerim</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.user.totalOrders}</div>
          <p className="text-xs text-muted-foreground">
            Toplam: {formatCurrency(stats.user.totalOrderAmount, 'EUR')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bekleyen Görevler</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.user.pendingTasks}</div>
          <p className="text-xs text-muted-foreground">
            Tamamlanması gereken
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Şirket Siparişleri</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.company.totalOrders}</div>
          <p className="text-xs text-muted-foreground">
             {formatCurrency(stats.company.totalOrderAmount, 'EUR')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

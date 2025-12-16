import { getDashboardStats, getRecentProposals, getRecentOrders, getUpcomingTasks } from "@/app/actions/dashboard";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Parallel data fetching
  const [stats, recentProposals, recentOrders, upcomingTasks] = await Promise.all([
    getDashboardStats(),
    getRecentProposals(),
    getRecentOrders(),
    getUpcomingTasks(),
  ]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Genel Bakış</h2>
        <div className="flex items-center space-x-2">
          {/* Optional: Add date range picker or download button here */}
        </div>
      </div>
      
      <StatsGrid stats={stats} />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-4">
            <RecentProposals proposals={recentProposals} />
            <RecentOrders orders={recentOrders} />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <UpcomingTasks tasks={upcomingTasks} />
        </div>
      </div>
    </div>
  );
}

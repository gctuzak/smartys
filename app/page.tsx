import { getDashboardStats, getRecentProposals, getRecentOrders, getUpcomingTasks } from "@/app/actions/dashboard";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Parallel data fetching
  const [stats, recentProposals, recentOrders, upcomingTasks, userData] = await Promise.all([
    getDashboardStats(),
    getRecentProposals(),
    getRecentOrders(),
    getUpcomingTasks(),
    supabase.from('users').select('first_name').eq('id', session.userId).single()
  ]);

  const userName = userData.data?.first_name || "Kullanıcı";

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Hoş geldin, {userName} 👋
        </h2>
        <p className="text-muted-foreground">
          Bugün neler olduğuna hızlıca bir göz atalım.
        </p>
      </div>
      
      <StatsGrid stats={stats} />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-6">
            <RecentProposals proposals={recentProposals} />
            <RecentOrders orders={recentOrders} />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-6">
          <UpcomingTasks tasks={upcomingTasks} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

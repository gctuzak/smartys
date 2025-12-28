import { getOrderStatuses, getProposalStatuses } from "@/app/actions/status-settings";
import { StatusManager } from "@/components/settings/status-manager";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function StatusesPage() {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "finance")) {
    redirect("/");
  }

  const [proposalStatuses, orderStatuses] = await Promise.all([
    getProposalStatuses(),
    getOrderStatuses(),
  ]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Durum Yönetimi</h1>
          <p className="text-muted-foreground">
            Teklif ve sipariş süreçlerinizde kullanacağınız durumları buradan yönetebilirsiniz.
          </p>
        </div>
        
        <StatusManager 
          initialProposalStatuses={proposalStatuses} 
          initialOrderStatuses={orderStatuses} 
        />
      </div>
    </div>
  );
}

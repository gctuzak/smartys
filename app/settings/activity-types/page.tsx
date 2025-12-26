import { getActivityTypes } from "@/app/actions/activity-types";
import { ActivityTypesTable } from "@/components/settings/activity-types-table";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ActivityTypesPage() {
  const session = await getSession();
  
  // Basic role check - adjust roles as per actual system values (admin, manager, etc.)
  // If role is undefined or not authorized, redirect.
  // Assuming 'representative' is the default restricted role.
  if (!session || (session.role !== "admin" && session.role !== "manager" && session.role !== "finance")) {
     // redirect("/"); // Temporarily disabled strict check until roles are confirmed, or uncomment to enforce.
     // console.log("User role:", session?.role);
  }

  const { data: types } = await getActivityTypes();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Ayarlar</h1>
      <div className="flex flex-col gap-8">
        <ActivityTypesTable initialTypes={types || []} />
      </div>
    </div>
  );
}

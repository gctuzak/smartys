import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import ChangePasswordForm from "./change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", session.userId).single();

  if (!user) {
    // Session valid but user gone?
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Profilim</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <span className="font-semibold">Ad Soyad:</span> {user.first_name} {user.last_name}
             </div>
             <div>
                <span className="font-semibold">E-Posta:</span> {user.email}
             </div>
             <div>
                <span className="font-semibold">Rol:</span> {user.role}
             </div>
          </CardContent>
        </Card>

        <ChangePasswordForm />
      </div>
    </div>
  );
}

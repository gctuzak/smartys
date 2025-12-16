"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(changePasswordAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifre Değiştir</CardTitle>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mevcut Şifre</label>
            <Input name="currentPassword" type="password" required />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">Yeni Şifre</label>
             <Input name="newPassword" type="password" required />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
             <Input name="confirmPassword" type="password" required />
          </div>
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-500">{state.success}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

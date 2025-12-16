"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export default function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Giriş Yap</CardTitle>
        <CardDescription>Devam etmek için e-posta ve şifrenizi girin.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">E-Posta</label>
            <Input id="email" name="email" type="email" placeholder="ornek@sirket.com" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Şifre</label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

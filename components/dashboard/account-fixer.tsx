"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkAndFixAccountAction } from "@/app/actions/fix-account";
import { debugUserStatus } from "@/app/actions/debug-user";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AccountFixer() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'done' | 'error'>('checking');
  const [message, setMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAccount();
  }, []);

  async function checkAccount() {
    try {
      setStatus('checking');
      
      // Run debug check first
      const debugRes = await debugUserStatus();
      setDebugInfo(debugRes);
      
      if (!debugRes.auth) {
         console.warn("No session found on server");
         setStatus('idle'); // Or error?
         return;
      }

      const userEmail = debugRes.auth.email;
      const userId = debugRes.auth.id;

      console.log("Checking account for:", userEmail);
      
      // Only run fix if mismatch is detected or user explicitly asks?
      // For now, let's run it always as it has internal checks.
      const result = await checkAndFixAccountAction(userEmail, userId);

      if (result.success) {
        if (result.migrated) {
          setStatus('done');
          setMessage(result.message || "Hesabınız onarıldı.");
          toast.success("Hesap verileriniz başarıyla eşleştirildi!");
          setTimeout(() => {
             window.location.reload();
          }, 2000);
        } else {
           setStatus('done');
           setMessage(result.message || "Hesap kontrolü tamamlandı.");
        }
      } else {
        setStatus('error');
        setMessage(result.message || result.error || "İşlem başarısız.");
        console.error("Fix failed:", result);
      }
    } catch (e: any) {
      console.error("Account check error:", e);
      setStatus('error');
      setMessage("Beklenmedik hata: " + (e.message || e));
    }
  }

  if (status === 'idle') {
    return (
        <div className="mb-6 p-4 rounded-lg border bg-gray-50 text-gray-900 border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            <div>
                <h5 className="font-medium mb-1">Hesap Kontrolü</h5>
                <p className="text-sm opacity-90">Hesap durumunuz kontrol edilmedi.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={checkAccount}>
            Kontrol Et
          </Button>
        </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Debug Info Panel (Only visible if mismatch) */}
      {debugInfo && debugInfo.mismatch && (
         <div className="p-4 rounded-lg border bg-orange-50 text-orange-900 border-orange-200 text-sm">
            <div className="flex items-start gap-2">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold mb-1">Veri Sahipliği Uyuşmazlığı Tespit Edildi</h4>
                    <p>Giriş yapılan: <strong>{debugInfo.auth?.email}</strong> (ID: {debugInfo.auth?.id?.slice(0,8)}...)</p>
                    <p>Veri sahibi: <strong>{debugInfo.dataOwner?.email}</strong> (ID: {debugInfo.dataOwner?.id?.slice(0,8)}...)</p>
                    <p className="mt-2 text-xs opacity-80">
                        Bu durum verilerinizi görmenizi engelliyor olabilir. Lütfen doğru e-posta ile giriş yaptığınızdan emin olun.
                    </p>
                </div>
            </div>
         </div>
      )}

      {status === 'checking' && (
        <div className="p-4 rounded-lg border bg-blue-50 text-blue-900 border-blue-200 flex items-start gap-3">
          <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
          <div>
            <h5 className="font-medium mb-1">Hesap Kontrolü</h5>
            <p className="text-sm opacity-90">Hesap verileriniz kontrol ediliyor...</p>
          </div>
        </div>
      )}

      {status === 'fixing' && (
        <div className="p-4 rounded-lg border bg-yellow-50 text-yellow-900 border-yellow-200 flex items-start gap-3">
          <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
          <div>
            <h5 className="font-medium mb-1">Onarılıyor</h5>
            <p className="text-sm opacity-90">Eski verileriniz yeni hesabınıza taşınıyor...</p>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="p-4 rounded-lg border bg-green-50 text-green-900 border-green-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5" />
          <div>
            <h5 className="font-medium mb-1">Başarılı</h5>
            <p className="text-sm opacity-90">{message} Sayfa yenileniyor...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 rounded-lg border bg-red-50 text-red-900 border-red-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <h5 className="font-medium mb-1">Onarım Hatası</h5>
            <div className="text-sm opacity-90 flex flex-col gap-2">
              <p>{message}</p>
              <Button size="sm" variant="outline" onClick={checkAccount} className="w-fit bg-white text-black hover:bg-gray-100 border-red-200">
                Tekrar Dene
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

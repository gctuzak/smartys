"use client";

import { useState } from "react";
import { Upload, Loader2, FileUp } from "lucide-react";
import { parseInvoiceAction } from "@/app/actions/parse-invoice";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PurchaseInvoiceUploader() {
  const [parsing, setParsing] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name, file.size);
    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Calling parseInvoiceAction...");
      const result = await parseInvoiceAction(formData);
      console.log("parseInvoiceAction result:", result);
      
      if (result.success && result.data) {
        // Save parsed data to localStorage to pass it to the form
        localStorage.setItem("pendingInvoice", JSON.stringify(result.data));
        toast.success("Fatura başarıyla analiz edildi, form hazırlanıyor...");
        
        // Redirect to new invoice page with source flag
        router.push("/muhasebe/faturalar/yeni?type=ALIS&source=upload");
      } else {
        toast.error(result.error || "Fatura analiz edilemedi.");
        console.error("Analysis failed:", result.error);
      }
    } catch (error) {
      console.error("Parse error in component:", error);
      toast.error("Dosya işlenirken bir hata oluştu.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <input 
        type="file" 
        id="invoice-upload" 
        className="hidden" 
        accept=".pdf" 
        onChange={handleFileUpload}
        disabled={parsing}
      />
      <label 
        htmlFor="invoice-upload" 
        className={`flex items-center px-4 py-2 bg-green-600 text-white rounded-md cursor-pointer hover:bg-green-700 transition-colors shadow-sm ${parsing ? 'opacity-70 pointer-events-none' : ''}`}
      >
        {parsing ? <Loader2 className="animate-spin mr-2" size={18} /> : <FileUp className="mr-2" size={18} />}
        {parsing ? "Analiz Ediliyor..." : "AI ile Fatura Yükle"}
      </label>
    </div>
  );
}

"use client";

import { useState } from "react";
import { UploadZone } from "@/components/proposal-builder/upload-zone";
import { ProposalReview } from "@/components/proposal-builder/proposal-review";
import { ParsingLoader } from "@/components/proposal-builder/parsing-loader";
import { parseExcelAction } from "@/app/actions/parse-excel";
import { ParsedData } from "@/types";
import { toast } from "sonner";

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setOriginalFile(file);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await parseExcelAction(formData);
      setParsedData(result);
      toast.success("Excel başarıyla analiz edildi!");
    } catch (error) {
      console.error(error);
      const msg = (error as Error)?.message || "Dosya analiz edilirken bir hata oluştu.";
      toast.error(msg.includes("OPENAI_API_KEY") ? "AI anahtarı bulunamadı. Lütfen .env.local içine OPENAI_API_KEY ekleyin." : msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-8">
        {!parsedData && !isUploading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Yeni Teklif Oluştur</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Excel formatındaki keşif listesini yükleyin, AI destekli motorumuz saniyeler içinde profesyonel bir teklife dönüştürsün.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} isUploading={isUploading} />
          </div>
        )}

        {isUploading && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Veriler Analiz Ediliyor</h3>
              <p className="text-gray-500">Bu işlem dosya boyutuna göre birkaç saniye sürebilir...</p>
            </div>
            <ParsingLoader />
          </div>
        )}

        {parsedData && (
          <ProposalReview initialData={parsedData} originalFile={originalFile} onSuccess={handleReset} />
        )}
      </div>
    </div>
  );
}

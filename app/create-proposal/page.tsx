"use client";

import { useState } from "react";
import { UploadZone } from "@/components/proposal-builder/upload-zone";
import { ProposalReview } from "@/components/proposal-builder/proposal-review";
import { ManualProposalBuilder } from "@/components/proposal-builder/manual-proposal-builder";
import { ParsingLoader } from "@/components/proposal-builder/parsing-loader";
import { parseExcelAction } from "@/app/actions/parse-excel";
import { parsePdfAction } from "@/app/actions/parse-pdf";
import { ParsedData } from "@/types";
import { toast } from "sonner";
import { FileText, Sparkles, Upload, Keyboard } from "lucide-react";
import Link from "next/link";

export default function CreateProposalPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload");

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setOriginalFile(file);
    const formData = new FormData();
    formData.append("file", file);

    try {
      let result;
      
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        result = await parsePdfAction(formData);
      } else {
        result = await parseExcelAction(formData);
      }
      
      setParsedData(result);
      toast.success("Dosya başarıyla analiz edildi!");
    } catch (error) {
      console.error(error);
      const msg = (error as Error)?.message || "Dosya analiz edilirken bir hata oluştu.";
      toast.error(msg.includes("OPENAI_API_KEY") ? "AI anahtarı bulunamadı. Lütfen .env.local içine OPENAI_API_KEY ekleyin." : msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualComplete = (data: ParsedData) => {
      setParsedData(data);
  };

  const handleReset = () => {
    setParsedData(null);
    setIsUploading(false);
    setOriginalFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Main Content */}
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 1. Initial State: Upload Zone or Manual Builder */}
        {!parsedData && !isUploading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Yeni Teklif Oluştur
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                İster dosya yükleyin, ister Excel'den kopyalayıp yapıştırın.
                AI destekli motorumuz saniyeler içinde profesyonel bir teklife dönüştürsün.
              </p>
            </div>

            <div className="flex justify-center mb-8">
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground bg-gray-200">
                    <button
                        onClick={() => setMode("upload")}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${mode === 'upload' ? 'bg-white text-black shadow-sm' : 'hover:bg-gray-100'}`}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Dosya Yükle (AI)
                    </button>
                    <button
                        onClick={() => setMode("manual")}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${mode === 'manual' ? 'bg-white text-black shadow-sm' : 'hover:bg-gray-100'}`}
                    >
                        <Keyboard className="mr-2 h-4 w-4" />
                        Excel'den Yapıştır
                    </button>
                </div>
            </div>

            {mode === "upload" ? (
                <UploadZone
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                />
            ) : (
                <ManualProposalBuilder 
                    onComplete={handleManualComplete}
                    onCancel={() => setMode("upload")}
                />
            )}
            </div>
          )}

          {/* 2. Loading State */}
          {isUploading && (
            <div className="animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Veriler Analiz Ediliyor
                </h3>
                <p className="text-gray-500">Bu işlem dosya boyutuna göre birkaç saniye sürebilir...</p>
              </div>
              <ParsingLoader />
            </div>
          )}

          {/* 3. Review State */}
          {parsedData && (
            <ProposalReview
              initialData={parsedData}
              originalFile={originalFile}
              onSuccess={handleReset}
            />
          )}
        </div>
    </div>
  );
}

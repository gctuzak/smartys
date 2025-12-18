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
import { FileText, Sparkles, Upload, Keyboard, Wand2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Background */}
      <div className="bg-white border-b border-gray-100 py-12 mb-8">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Yeni Teklif Oluştur
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            İster dosya yükleyin, ister Excel'den kopyalayıp yapıştırın.
            <br />
            <span className="text-blue-600 font-medium">AI destekli motorumuz</span> saniyeler içinde profesyonel bir teklife dönüştürsün.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4">
        
        {/* 1. Initial State: Upload Zone or Manual Builder */}
        {!parsedData && !isUploading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Custom Tab Switcher */}
            <div className="flex justify-center">
              <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm inline-flex">
                <button
                  onClick={() => setMode("upload")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    mode === 'upload' 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Upload className="w-4 h-4" />
                  Dosya Yükle (AI)
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    mode === 'manual' 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Keyboard className="w-4 h-4" />
                  Excel'den Yapıştır
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {mode === "upload" ? (
                    <div className="p-8">
                        <UploadZone
                            onFileSelect={handleFileSelect}
                            isUploading={isUploading}
                        />
                    </div>
                ) : (
                    <div className="p-8">
                        <ManualProposalBuilder 
                            onComplete={handleManualComplete}
                            onCancel={() => setMode("upload")}
                        />
                    </div>
                )}
            </div>
          </div>
        )}

        {/* 2. Loading State */}
        {isUploading && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center animate-in fade-in duration-300 max-w-2xl mx-auto">
              <div className="relative mb-8 inline-block">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25"></div>
                <div className="relative bg-blue-50 p-4 rounded-full">
                  <Wand2 className="w-12 h-12 text-blue-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Veriler Analiz Ediliyor
              </h3>
              <p className="text-gray-500 mb-8">Yapay zeka dosyanızı inceliyor ve yapılandırıyor. Bu işlem birkaç saniye sürebilir...</p>
              <ParsingLoader />
            </div>
        )}

        {/* 3. Review State */}
        {parsedData && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <ProposalReview
              initialData={parsedData}
              originalFile={originalFile}
              onSuccess={handleReset}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import { UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function UploadZone({ onFileSelect, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.name.toLowerCase().endsWith(".xlsx") ||
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          onFileSelect(file);
        } else {
          toast.error("Lütfen Excel (.xlsx) veya PDF dosyası yükleyin.");
        }
      }
    },
    [onFileSelect, isUploading]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative group border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer overflow-hidden bg-white",
        isDragging
          ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-2xl shadow-blue-100 ring-4 ring-blue-50"
          : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50 hover:shadow-xl hover:shadow-blue-50",
        isUploading && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".xlsx,.pdf"
        onChange={handleFileInput}
        disabled={isUploading}
      />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="flex flex-col items-center justify-center gap-8 relative z-10">
        <div className={cn(
          "p-8 rounded-full transition-all duration-500 shadow-sm",
          isDragging ? "bg-blue-100 scale-110 rotate-3" : "bg-blue-50 group-hover:bg-blue-100 group-hover:scale-110 group-hover:-rotate-3"
        )}>
          <UploadCloud className={cn(
            "w-12 h-12 transition-colors duration-300",
            isDragging ? "text-blue-600" : "text-blue-500 group-hover:text-blue-600"
          )} />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors tracking-tight">
            {isUploading ? "Dosya Analiz Ediliyor..." : "Excel veya PDF Dosyasını Yükle"}
          </h3>
          <p className="text-base text-gray-500 max-w-md mx-auto leading-relaxed">
            {isUploading
              ? "Yapay zeka verilerinizi yapılandırırken lütfen bekleyin."
              : "Dosyanızı buraya sürükleyip bırakın veya bilgisayarınızdan seçmek için tıklayın"}
          </p>
        </div>

        {!isUploading && (
          <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span className="bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">.XLSX</span>
            <span className="bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">.PDF</span>
          </div>
        )}
      </div>
    </div>
  );
}

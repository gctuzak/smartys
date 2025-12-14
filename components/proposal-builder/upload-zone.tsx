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
        "border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200 cursor-pointer",
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
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
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 bg-blue-100 rounded-full">
          <UploadCloud className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isUploading ? "Dosya Analiz Ediliyor..." : "Excel veya PDF Dosyasını Yükle"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isUploading
              ? "AI verilerinizi ayıklarken lütfen bekleyin."
              : "Dosyayı buraya sürükleyin veya seçmek için tıklayın"}
          </p>
        </div>
      </div>
    </div>
  );
}

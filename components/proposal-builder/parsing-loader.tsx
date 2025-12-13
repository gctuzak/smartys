import { Skeleton } from "@/components/ui/skeleton";

export function ParsingLoader() {
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-[120px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
        
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-[100px]" />
            <Skeleton className="h-12 w-[100px]" />
          </div>
        ))}
      </div>
      
      <div className="flex justify-end pt-4">
        <Skeleton className="h-10 w-[150px]" />
      </div>
    </div>
  );
}

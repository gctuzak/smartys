import { Skeleton } from "@/components/ui/skeleton";

export function ParsingLoader() {
  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto p-8 border border-gray-100 rounded-3xl bg-white shadow-xl shadow-gray-100/50">
      <div className="flex items-center gap-6 mb-10">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-[250px]" />
          <Skeleton className="h-4 w-[180px]" />
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-[150px] rounded-lg" />
          <Skeleton className="h-10 w-[120px] rounded-lg" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-[120px] rounded-xl" />
              <Skeleton className="h-14 w-[120px] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-8">
        <Skeleton className="h-12 w-[180px] rounded-xl" />
      </div>
    </div>
  );
}

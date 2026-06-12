import { Skeleton } from "@heroui/react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Package } from "lucide-react";

export default function OrdersLoading() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={Package}
        title="Заказы"
        description="Загрузка списка заказов..."
      />

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
           <div className="col-span-1 lg:col-span-2 space-y-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-11 w-full rounded-xl" />
           </div>
           <div className="col-span-1 space-y-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-11 w-full rounded-xl" />
           </div>
           <div className="col-span-1 lg:col-span-2 space-y-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-11 w-full rounded-xl" />
           </div>
           <div className="col-span-1 space-y-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-11 w-full rounded-xl" />
           </div>
           <div className="col-span-1 lg:col-span-2 space-y-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <div className="flex gap-2">
                 <Skeleton className="h-11 w-full rounded-xl" />
                 <Skeleton className="h-11 w-full rounded-xl" />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50">
           <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-0">
           <div className="border-b border-border/50 px-6 py-4 flex gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
           </div>
           {[...Array(10)].map((_, i) => (
             <div key={i} className="border-b border-border/50 px-6 py-5 flex gap-4">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-24" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

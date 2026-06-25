"use client";
import { Skeleton } from "@heroui/react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Activity } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0">
      <AdminPageHeader
        icon={Activity}
        title="Панель управления"
        description="Загрузка аналитики и метрик..."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
             <div className="flex justify-between items-center">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-8 w-8 rounded-xl" />
             </div>
             <Skeleton className="h-8 w-32" />
             <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm lg:col-span-4">
           <Skeleton className="h-6 w-48 mb-6" />
           <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm lg:col-span-3">
           <Skeleton className="h-6 w-48 mb-6" />
           <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </div>
      
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
         <Skeleton className="h-6 w-48 mb-6" />
         <div className="space-y-3">
           {[...Array(5)].map((_, i) => (
             <Skeleton key={i} className="h-12 w-full rounded-xl" />
           ))}
         </div>
      </div>
    </div>
  );
}

import React from "react";
import { Zap, Sparkles } from "lucide-react";
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";

interface TenantLogoProps {
  tenantId?: string;
  className?: string;
  iconClassName?: string;
}

export function TenantLogo({ tenantId, className = "w-8 h-8", iconClassName = "text-sm" }: TenantLogoProps) {
  const isFlux = normalizeTenantId(tenantId) === 'flux';

  if (isFlux) {
    return (
      <div className={`rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/20 select-none shrink-0 ${className}`}>
        <span className={`font-black ${iconClassName}`}>F</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-pink-500 text-white flex items-center justify-center font-black shadow-md shadow-primary/25 select-none shrink-0 ${className}`}>
      <span className={`font-black ${iconClassName}`}>S</span>
    </div>
  );
}

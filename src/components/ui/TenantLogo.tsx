import React from "react";
import { Zap, Sparkles } from "lucide-react";
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";

interface TenantLogoProps {
  tenantId?: string;
  className?: string;
  iconClassName?: string;
}

export function TenantLogo({ tenantId, className = "w-8 h-8", iconClassName = "w-4 h-4" }: TenantLogoProps) {
  const isFlux = normalizeTenantId(tenantId) === 'flux';

  if (isFlux) {
    return (
      <div className={`bg-gradient-to-br from-purple-500/20 via-fuchsia-500/15 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/35 shadow-[0_2px_14px_rgba(168,85,247,0.25)] relative group ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/30 to-pink-500/30 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <Sparkles className={`${iconClassName} text-purple-400 dark:text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] relative z-10`} />
      </div>
    );
  }

  return (
    <div className={`bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_2px_10px] shadow-primary/10 ${className}`}>
      <Zap className={`${iconClassName} text-primary fill-current`} />
    </div>
  );
}

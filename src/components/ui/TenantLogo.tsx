import React from "react";
import { Zap, Heart } from "lucide-react";
import { normalizeTenantId } from "@/lib/tenant-resolver";

interface TenantLogoProps {
  tenantId?: string;
  className?: string;
  iconClassName?: string;
}

export function TenantLogo({ tenantId, className = "w-8 h-8", iconClassName = "w-4 h-4" }: TenantLogoProps) {
  const isFlux = normalizeTenantId(tenantId) === 'flux';

  return (
    <div className={`bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_2px_10px] shadow-primary/10 ${className}`}>
      {isFlux ? (
        <Heart className={`${iconClassName} text-primary fill-current`} />
      ) : (
        <Zap className={`${iconClassName} text-primary fill-current`} />
      )}
    </div>
  );
}

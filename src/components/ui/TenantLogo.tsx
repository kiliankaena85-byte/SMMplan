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
      <div className={`relative flex items-center justify-center select-none shrink-0 ${className}`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(244,63,94,0.35)] transition-transform duration-300 hover:scale-110 active:scale-95"
        >
          <defs>
            {/* Warm Left Wing (Orange -> Coral -> Hot Pink) */}
            <linearGradient id="fluxWingLeft" x1="0%" y1="20%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="35%" stopColor="#F43F5E" />
              <stop offset="80%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>

            {/* Cool Right Wing (Sky Blue -> Indigo -> Purple -> Fuchsia) */}
            <linearGradient id="fluxWingRight" x1="100%" y1="10%" x2="20%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="30%" stopColor="#6366F1" />
              <stop offset="70%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#D946EF" />
            </linearGradient>

            {/* Inner Fluid Fold Shadow */}
            <linearGradient id="fluxInnerFold" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
            </linearGradient>

            {/* Ambient Base Glow Filter */}
            <filter id="fluxHeartAmbient" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#EC4899" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 1. Left Fluid Ribbon Arm */}
          <path
            d="M 60 102
               C 32 82, 10 58, 10 34
               C 10 16, 24 8, 42 8
               C 51 8, 57 12, 60 18
               C 56 32, 48 50, 60 66
               C 60 66, 44 80, 60 102 Z"
            fill="url(#fluxWingLeft)"
            filter="url(#fluxHeartAmbient)"
          />

          {/* 2. Right Fluid Ribbon Arm (Overlapping at Bottom & Top Notch) */}
          <path
            d="M 60 102
               C 88 82, 110 58, 110 34
               C 110 16, 96 8, 78 8
               C 69 8, 63 12, 60 18
               C 64 32, 72 50, 60 66
               C 60 66, 76 80, 60 102 Z"
            fill="url(#fluxWingRight)"
          />

          {/* 3. Central Folded Ribbon Notch Highlight */}
          <path
            d="M 60 22
               C 52 38, 46 54, 60 74
               C 74 54, 68 38, 60 22 Z"
            fill="url(#fluxInnerFold)"
          />

          {/* 4. Top Glass Specular Shine */}
          <path
            d="M 42 12
               C 30 12, 20 18, 18 28
               C 22 20, 32 16, 42 16
               C 47 16, 51 18, 54 22
               C 52 16, 48 12, 42 12 Z"
            fill="#FFFFFF"
            opacity="0.65"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(2,132,199,0.35)] transition-transform duration-200"
      >
        <defs>
          <linearGradient id="planSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <filter id="planLetterGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0369A1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Soft Super-ellipse / Squircle in Brand Light Sky Blue */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="28"
          fill="url(#planSkyGrad)"
        />

        {/* Subtle top specular sheen */}
        <path
          d="M 28 6 Q 50 14 72 6"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Mathematically Centered Bold Vector S (Precision Bounding Box: 46x62 on center 50,50) */}
        <path
          d="M 67 36
             C 67 24, 58 17, 49 17
             C 39 17, 31 24, 31 34
             C 31 43, 39 47, 47 50
             L 52 52
             C 60 55, 67 60, 67 69
             C 67 79, 58 86, 49 86
             C 37 86, 29 78, 29 67
             L 42 67
             C 42 72, 45 75, 49 75
             C 53 75, 56 72, 56 68
             C 56 62, 51 59, 44 56
             L 39 54
             C 30 51, 20 45, 20 34
             C 20 21, 32 12, 49 12
             C 62 12, 76 21, 76 35
             Z"
          fill="#FFFFFF"
          filter="url(#planLetterGlow)"
        />
      </svg>
    </div>
  );
}

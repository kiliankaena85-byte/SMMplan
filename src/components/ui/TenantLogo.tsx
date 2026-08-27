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
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="planSquircleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="45%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <filter id="planLetterShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Super-ellipse / Squircle Badge */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="26"
          fill="url(#planSquircleGrad)"
        />

        {/* Top subtle highlight */}
        <path
          d="M 28 8 Q 50 16 72 8"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Precision Geometric Vector S (Centered at [50, 50], Bounding Box: 48x64) */}
        <path
          d="M 68 36
             C 68 25, 59 18, 50 18
             C 40 18, 32 25, 32 35
             C 32 44, 40 48, 48 51
             L 53 53
             C 61 56, 68 61, 68 70
             C 68 80, 59 87, 50 87
             C 38 87, 30 79, 30 68
             L 43 68
             C 43 73, 46 76, 50 76
             C 54 76, 57 73, 57 69
             C 57 63, 52 60, 45 57
             L 40 55
             C 31 52, 21 46, 21 35
             C 21 22, 33 13, 50 13
             C 63 13, 77 22, 77 36
             Z"
          fill="#FFFFFF"
          filter="url(#planLetterShadow)"
        />
      </svg>
    </div>
  );
}

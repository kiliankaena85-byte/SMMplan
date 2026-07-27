import { getPublicCatalogAction } from "@/actions/order/catalog";

import { SettingsProvider } from "@/lib/settings";
import { headers } from "next/headers";
import { LovableOrderClient } from "@/components/ab-test/LovableOrderClient";

import { Header } from "@/components/landing/Header";
import { LovableTrustBar } from "@/components/ab-test/LovableTrustBar";
import { LovableWhyUs } from "@/components/ab-test/LovableWhyUs";
import { LovableReviews } from "@/components/ab-test/LovableReviews";
import { LovableFAQ } from "@/components/ab-test/LovableFAQ";
import { MegaFooter } from "@/components/landing/MegaFooter";

import { normalizeTenantId } from "@/lib/tenant-resolver";

export const revalidate = 300;

export async function generateMetadata() {
  const reqHeaders = await headers();
  const rawTenantId = reqHeaders.get("x-tenant-id");
  const tenantId = normalizeTenantId(rawTenantId) || "smmplan";
  const settings = await SettingsProvider.getContactAndLegalSettings(tenantId);
  const siteName = settings.SITE_NAME || (tenantId === 'flux' ? "SMMflux" : "SMMplan");
  
  const rawHost = reqHeaders.get("host") || "";
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(rawHost) ? rawHost : "smmflux.ru";
  const baseUrl = `https://${safeHost}`;
  
  return {
    metadataBase: new URL(baseUrl),
    title: `${siteName} | Продвижение социальных сетей`,
    description: `Современная платформа продвижения ${siteName} (Next-Gen AI Growth). Быстрый запуск, автоматизация и гарантия качества.`,
    alternates: {
      canonical: `${baseUrl}/ab-lovable`,
    },
    openGraph: {
      title: `${siteName} | Продвижение социальных сетей`,
      description: `Современная платформа продвижения ${siteName} (Next-Gen AI Growth).`,
      url: `${baseUrl}/ab-lovable`,
      siteName: siteName,
      type: "website",
    },
  };
}

export default async function LovablePage() {
  const catalogResult = await getPublicCatalogAction();
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const reqHeaders = await headers();
  const rawTenantId = reqHeaders.get("x-tenant-id");
  const tenantId = normalizeTenantId(rawTenantId) || "smmplan";

  const settings = await SettingsProvider.getContactAndLegalSettings(tenantId);
  const siteName = settings.SITE_NAME || (tenantId === 'flux' ? "SMMflux" : "SMMplan");



  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      
      {/* ── LOVABLE VIBRANT HERO BACKGROUND (Full Bleed - GPU Optimized Static Layer) ── */}
      <div className="absolute top-0 inset-x-0 h-[2500px] z-0 pointer-events-none overflow-hidden select-none bg-white dark:bg-default-50">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 50% at 10% 0%, rgba(59, 130, 246, 0.25), transparent 60%), ' +
              'radial-gradient(50% 50% at 90% 10%, rgba(56, 189, 248, 0.20), transparent 60%), ' +
              'radial-gradient(60% 50% at 15% 50%, rgba(244, 63, 94, 0.18), transparent 60%), ' +
              'radial-gradient(50% 50% at 85% 60%, rgba(249, 115, 22, 0.18), transparent 60%), ' +
              'radial-gradient(60% 60% at 50% 30%, rgba(217, 70, 239, 0.18), transparent 60%)',
          }}
        />
        <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

        <div className="relative z-10 w-full">
          <Header siteName={siteName} activePath="/ab-lovable" />
        </div>
        
        <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pt-12 md:pt-28 pb-8 md:pb-16 flex flex-col items-center relative z-10">
          {/* Removed old subtle background circles */}

          <LovableOrderClient 
            initialCatalog={catalog} 
          />
        </main>
      <div className="relative z-10 w-full mb-8 md:mb-12">
        <LovableTrustBar />
      </div>

      {/* Solid Underlay for the rest of the page content */}
      <div className="relative z-10 bg-white dark:bg-content1 mx-2 sm:mx-4 lg:mx-6 rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pt-12 pb-16">
        <LovableWhyUs />
        <LovableReviews />
        <LovableFAQ companyName={siteName} />
      </div>
      
      <MegaFooter contactSettings={settings} tenantId={tenantId} />
    </div>
  );

}

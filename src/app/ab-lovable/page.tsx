import { getPublicCatalogAction } from "@/actions/order/catalog";

import { SettingsProvider } from "@/lib/settings";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { LovableOrderClient } from "@/components/ab-test/LovableOrderClient";

import { Header } from "@/components/landing/Header";
import { LovableTrustBar } from "@/components/ab-test/LovableTrustBar";
import { LovableWhyUs } from "@/components/ab-test/LovableWhyUs";
import { LovableReviews } from "@/components/ab-test/LovableReviews";
import { LovableFAQ } from "@/components/ab-test/LovableFAQ";
import { MegaFooter } from "@/components/landing/MegaFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "SMMplan";
  
  return {
    title: `Lovable A/B Test | ${siteName}`,
    description: "Экспериментальный A/B тест нового интерфейса SMMplan (Lovable Edition).",
  };
}

export default async function LovablePage() {
  const catalogResult = await getPublicCatalogAction();
  const catalog = catalogResult.success && catalogResult.data ? catalogResult.data : [];
  
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "SMMplan";

  const session = await verifySession();
  let userEmail: string | undefined = undefined;
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    if (user) {
      userEmail = user.email;
    }
  }

  const reqHeaders = await headers();
  const tenantId = reqHeaders.get("x-tenant-id") || "smmplan";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      
      {/* LOVABLE VIBRANT HERO BACKGROUND (Full Bleed) */}
      <div className="absolute top-0 inset-x-0 h-[2500px] z-0 pointer-events-none overflow-hidden select-none bg-white dark:bg-default-50">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-500/80 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[0%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-300/60 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-rose-500/80 blur-[130px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/80 blur-[140px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-500/70 blur-[150px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute top-[30%] right-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/70 blur-[120px] animate-pulse" style={{ animationDuration: '9s' }} />
        
        {/* Fade to background color at the bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

        <div className="relative z-10 w-full">
          <Header initialEmail={userEmail} siteName={siteName} activePath="/ab-lovable" />
        </div>
        
        <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pt-12 md:pt-28 pb-8 md:pb-16 flex flex-col items-center relative z-10">
          {/* Removed old subtle background circles */}

          <LovableOrderClient 
            initialCatalog={catalog} 
            initialEmail={userEmail} 
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

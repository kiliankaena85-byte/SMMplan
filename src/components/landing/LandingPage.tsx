"use client";

import { PublicNetwork } from "@/actions/order/catalog";
import { OrderEngineSection } from "./OrderEngineSection";
import { TrustBar } from "./TrustBar";
import { WhyUs } from "./WhyUs";
import { FAQ } from "./FAQ";
import { Reviews } from "./Reviews";
import { Header } from "./sections/Header";
import { Footer } from "./sections/Footer";
import { motion, useScroll, useTransform } from "framer-motion";

export function LandingPage({ initialServices }: { initialServices: PublicNetwork[] }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-sky-200 overflow-x-hidden">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-slate-50">
        <motion.div style={{ y, opacity }} className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-sky-200/50 blur-[120px]" />
        <motion.div style={{ y, opacity }} className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 blur-[120px]" />
      </div>

      <div className="relative flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 w-full relative z-10 pt-20 md:pt-32">
          
          {/* Hero Section */}
          <section className="relative z-20 text-center px-4 mb-20 md:mb-32">
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Ускоряем ваши <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">соцсети</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
              Моментальный запуск, гарантия качества и полная автоматизация. 
              <br className="hidden md:block" /> Просто вставьте ссылку и начните рост.
            </p>
          </section>

          {/* Core App */}
          <OrderEngineSection initialCatalog={initialServices} />

          {/* Social Proof */}
          <div className="w-full max-w-6xl mx-auto px-4 mt-20">
            <TrustBar />
            <div className="mt-32"><WhyUs /></div>
            <div className="mt-32"><Reviews /></div>
            <div className="mt-32 mb-32"><FAQ /></div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import { LinkIcon, ArrowRightIcon, ArrowDownIcon } from "lucide-react";
import { Button } from "@heroui/react";

interface Step1LinkProps {
  direction: number;
  link: string;
  setLink: (link: string) => void;
  handleAnalyzeLink: (link: string) => void;
  navigateTo: (step: any) => void;
  slideVariants: any;
}

export function Step1Link({
  direction,
  link,
  setLink,
  handleAnalyzeLink,
  navigateTo,
  slideVariants
}: Step1LinkProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onAnalyze = async () => {
    setIsAnalyzing(true);
    // Add small artificial delay to show button loading state for UX
    await new Promise(r => setTimeout(r, 400)); 
    handleAnalyzeLink(link);
    setIsAnalyzing(false);
  };

  return (
    <motion.div
      key="step-link"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-3xl flex flex-col items-center"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-foreground mb-8 md:mb-10 text-center leading-tight px-2">
        Что хотите <span className="inline-block px-2 sm:px-3 py-1 bg-foreground text-background rounded-[1rem] sm:rounded-2xl rotate-[-2deg] mx-1 shadow-md">продвигать</span> сегодня?
      </h1>
      <div className="relative group w-full max-w-2xl px-2 sm:px-0">
        <motion.div 
          layoutId="hero-input"
          className={`relative w-full group rounded-full transition-all duration-300 select-text ${isAnalyzing ? 'p-[4px] scale-[1.01]' : 'p-[3px] scale-100'}`}
        >
          {/* Shimmer Border */}
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none google-border-shimmer opacity-100"
          />
          
          {/* Soft backdrop blur glow */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-300 pointer-events-none blur-md ${
              isAnalyzing
                ? "google-border-shimmer opacity-80 scale-[1.02]"
                : "google-border-shimmer opacity-40 group-hover:opacity-60"
            }`}
          />
          
          <div
            className="relative flex items-center w-full bg-content1 rounded-full p-1.5 sm:p-2 h-14 sm:h-16 md:h-[68px] z-10"
          >
            <div className="pl-3 sm:pl-5 pr-1.5 sm:pr-2 flex-shrink-0">
              <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              autoFocus
              className="flex-1 text-base sm:text-lg py-2 sm:py-3 px-3 sm:px-4 bg-transparent outline-none w-full font-medium text-foreground placeholder:text-muted-foreground"
              placeholder="Вставьте ссылку..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onFocus={() => setIsAnalyzing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && link) onAnalyze();
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                setTimeout(() => {
                  setIsAnalyzing(true);
                  setTimeout(() => {
                    handleAnalyzeLink(text);
                    setIsAnalyzing(false);
                  }, 400);
                }, 100);
              }}
            />
            <Button 
              className="rounded-full bg-primary text-primary-foreground mr-1 sm:mr-2 w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center p-0 min-w-0 hover:bg-primary/90 transition-all shadow-md"
              isPending={isAnalyzing}
              onPress={onAnalyze}
            >
              {!isAnalyzing && <ArrowRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>
          </div>
        </motion.div>
      </div>
      
      <div className="mt-12 flex justify-center w-full">
        <button 
          onClick={() => navigateTo('network')}
          className="mt-6 sm:mt-8 text-foreground/80 hover:text-foreground bg-background/80 hover:bg-background px-4 sm:px-6 py-2.5 sm:py-3 rounded-full backdrop-blur-md border border-border/40 transition-all font-medium text-sm sm:text-base flex items-center gap-2 sm:gap-3 group shadow-sm hover:shadow-md"
        >
          Или выберите соцсеть вручную
          <div className="bg-background rounded-full p-1 group-hover:bg-background shadow-sm transition-colors">
            <ArrowDownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </button>
      </div>
    </motion.div>
  );
}

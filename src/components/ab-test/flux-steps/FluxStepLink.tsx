'use client';

import React from "react";
import { Button } from "@heroui/react";
import { LinkIcon, ArrowRightIcon, ArrowDownIcon } from "lucide-react";

export interface FluxStepLinkProps {
  link: string;
  setLink: (val: string) => void;
  isAnalyzing: boolean;
  onAnalyzeLink: (url: string) => void;
  onOpenCatalog: () => void;
  linkRef: React.RefObject<HTMLInputElement | null>;
}

export function FluxStepLink({
  link,
  setLink,
  isAnalyzing,
  onAnalyzeLink,
  onOpenCatalog,
  linkRef,
}: FluxStepLinkProps) {
  return (
    <div className="w-full flex flex-col items-center relative z-20">
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-foreground mb-6 md:mb-8 text-center leading-tight px-2">
        Что хотите <span className="inline-block px-2 sm:px-3 py-1 bg-foreground text-background rounded-[1rem] sm:rounded-2xl rotate-[-2deg] mx-1 shadow-md">продвигать</span> сегодня?
      </h1>

      <div className="relative group w-full max-w-xl px-2 sm:px-0">
        <div 
          className={`relative w-full group rounded-[2rem] transition-all duration-500 select-text ${isAnalyzing ? 'p-[3px] scale-[1.01]' : 'p-[2px] scale-100'}`}
        >
          {/* Shimmer Border */}
          <div
            className="absolute inset-0 rounded-[2rem] transition-opacity duration-500 pointer-events-none google-border-shimmer opacity-100 blur-[1px]"
          />
          
          {/* Soft backdrop blur glow */}
          <div
            className={`absolute inset-0 rounded-[2rem] transition-all duration-500 pointer-events-none blur-xl ${
              isAnalyzing
                ? "google-border-shimmer opacity-60 scale-[1.03]"
                : "google-border-shimmer opacity-30 group-hover:opacity-50 scale-[1.01]"
            }`}
          />
          
          <div className="relative flex items-center w-full bg-card rounded-[calc(2rem-1.5px)] p-1.5 sm:p-2 h-14 sm:h-16 md:h-[68px] z-10 shadow-inner border border-border/40">
            <LinkIcon className="text-muted-foreground w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 flex-shrink-0 group-focus-within:text-foreground transition-colors" />
            <input
              ref={linkRef}
              name="link"
              className="flex-1 text-base sm:text-lg py-2 sm:py-3 px-3 sm:px-4 bg-transparent outline-none w-full font-medium text-foreground placeholder:text-muted-foreground/50"
              placeholder="Вставьте ссылку..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && link) onAnalyzeLink(link);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                setTimeout(() => onAnalyzeLink(text), 100);
              }}
            />
            <Button 
              className="rounded-[1rem] sm:rounded-[1.2rem] bg-foreground text-background shadow-md mr-0.5 sm:mr-1 w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 flex items-center justify-center p-0 hover:bg-foreground/90 transition-all hover:-translate-y-0.5 cursor-pointer"
              isPending={isAnalyzing}
              onPress={() => onAnalyzeLink(link)}
            >
              <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-center w-full">
        <button
          type="button"
          data-testid="flux-open-catalog-btn"
          onClick={onOpenCatalog}
          className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/80 hover:bg-card text-foreground/90 hover:text-foreground border border-border/60 hover:border-purple-500/40 shadow-sm hover:shadow-md text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer transform-gpu backdrop-blur-md"
        >
          <span>Или выберите платформу из каталога</span>
          <ArrowDownIcon className="w-4 h-4 text-purple-500 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

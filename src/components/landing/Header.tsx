"use client";

import React from "react";
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Zap, LogIn, LogOut, Menu } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { TenantLogo } from "@/components/ui/TenantLogo";

interface HeaderProps {
  initialEmail?: string;
  siteName: string;
  tenantId?: string;
  activePath?: string;
}

export function Header({ initialEmail, siteName, tenantId, activePath }: HeaderProps) {
  return (
    <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <TenantLogo tenantId={tenantId} className="w-8 h-8" iconClassName="w-4 h-4" />
          <span className="text-base sm:text-xl font-extrabold tracking-normal text-foreground">{siteName}</span>
        </Link>

        <nav className="hidden md:flex gap-8 text-sm font-bold text-muted-foreground">
          <Link 
            href={ROUTES.HOME} 
            className={`transition-colors hover:text-primary ${activePath === ROUTES.HOME ? "text-primary" : ""}`}
          >
            Услуги
          </Link>
          <a 
            href="/api/support/telegram"
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-primary transition-colors flex items-center gap-1.5"
          >
            Поддержка <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </a>
          <Link 
            href={ROUTES.FAQ} 
            className={`transition-colors hover:text-primary ${activePath === ROUTES.FAQ ? "text-primary" : ""}`}
          >
            FAQ
          </Link>
          <Link 
            href="/knowledge" 
            className={`transition-colors hover:text-primary ${activePath === "/knowledge" ? "text-primary" : ""}`}
          >
            База знаний
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {initialEmail ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden lg:inline text-xs text-muted-foreground font-semibold">
                Вы вошли как: <span className="text-foreground font-bold">{initialEmail}</span>
              </span>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-[0_2px_15px] shadow-primary/20 hover:opacity-90 transition-all duration-300"
              >
                <span>Личный кабинет</span>
              </Link>
              <form method="POST" action="/api/auth/logout">
                <button
                  type="submit"
                  className="flex items-center justify-center p-2 sm:p-2.5 rounded-full bg-default-100 hover:bg-default-200 text-muted-foreground hover:text-destructive transition-colors border border-default-200 cursor-pointer"
                  title="Выйти из аккаунта"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-default-100 text-foreground text-xs sm:text-sm font-bold border border-default-200 hover:bg-default-200 transition-all duration-300"
            >
              <LogIn className="w-4 h-4 text-muted-foreground" />
              <span>Войти</span>
            </Link>
          )}

          {/* Mobile Dropdown Trigger */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Открыть меню навигации"
                className="flex items-center justify-center p-2.5 rounded-full bg-default-100 hover:bg-default-200 text-muted-foreground hover:text-foreground border border-default-200 cursor-pointer active:scale-95 transition-all min-h-[44px] min-w-[44px] outline-none"
              >
                <Menu className="w-4.5 h-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 mt-2 rounded-2xl border-border bg-content1 shadow-xl p-1.5 z-[250]">
                <DropdownMenuItem className="p-0">
                  <Link href={ROUTES.HOME} className="flex items-center w-full px-3.5 py-2.5 text-xs font-bold rounded-xl hover:bg-default-100 transition-colors cursor-pointer text-foreground min-h-[44px]">
                    Услуги
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <a 
                    href="/api/support/telegram" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center w-full px-3.5 py-2.5 text-xs font-bold rounded-xl hover:bg-default-100 transition-colors cursor-pointer text-foreground min-h-[44px]"
                  >
                    Поддержка 💬
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link href={ROUTES.FAQ} className="flex items-center w-full px-3.5 py-2.5 text-xs font-bold rounded-xl hover:bg-default-100 transition-colors cursor-pointer text-foreground min-h-[44px]">
                    FAQ
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link href="/knowledge" className="flex items-center w-full px-3.5 py-2.5 text-xs font-bold rounded-xl hover:bg-default-100 transition-colors cursor-pointer text-foreground min-h-[44px]">
                    База знаний
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

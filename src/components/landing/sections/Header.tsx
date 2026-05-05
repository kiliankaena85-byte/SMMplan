"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from "@heroui/react";
import { Menu, Zap } from "lucide-react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Smmplan</span>
          </Link>
          
          {/* Навигация (центр) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Услуги
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/support" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Поддержка
            </Link>
          </nav>
          
          {/* Кнопка входа */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="h-10 px-6 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors min-h-12 min-w-12 flex items-center justify-center"
            >
              Войти
            </Link>
          </div>
          
          {/* Гамбургер (mobile only) */}
          <button 
            className="md:hidden h-12 w-12 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="Открыть меню"
            onClick={openMenu}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      {/* Мобильное выезжающее меню */}
      {/* @ts-ignore HeroUI Drawer type bug */}
      <Drawer placement="bottom" isOpen={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))] bg-background">
          {(onClose) => (
            <>
              <DrawerHeader className="text-foreground">Меню</DrawerHeader>
              <DrawerBody className="flex flex-col gap-4">
                <Link href="#services" onClick={closeMenu} className="text-lg font-medium py-3 text-foreground hover:text-primary transition-colors">
                  Услуги
                </Link>
                <Link href="#faq" onClick={closeMenu} className="text-lg font-medium py-3 text-foreground hover:text-primary transition-colors">
                  FAQ
                </Link>
                <Link href="/support" onClick={closeMenu} className="text-lg font-medium py-3 text-foreground hover:text-primary transition-colors">
                  Поддержка
                </Link>
                <hr className="border-border" />
                <Link 
                  href="/login" 
                  onClick={closeMenu}
                  className="h-12 w-full rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center min-h-12"
                >
                  Войти в кабинет
                </Link>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

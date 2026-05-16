"use client";

import React, { useState } from "react";
import { Card, CardContent, Button, Chip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { getBrandColor } from "@/lib/constants/brandColors";
import { Send, Instagram, Play, Users, Eye, Heart, Zap, CheckCircle2 } from "lucide-react";

// Данные для демо-каталога
const PLATFORMS = [
  { id: "telegram", name: "Telegram", icon: Send },
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "youtube", name: "YouTube", icon: Play },
  { id: "vk", name: "ВКонтакте", icon: Users },
];

const MOCK_SERVICES = [
  { id: 1, platform: "telegram", name: "Премиум Подписчики", type: "Подписчики", price: "от 45 ₽", speed: "Быстрый старт", icon: Users, popular: true },
  { id: 2, platform: "telegram", name: "Умные Просмотры", type: "Просмотры", price: "от 5 ₽", speed: "Мгновенно", icon: Eye, popular: false },
  { id: 3, platform: "telegram", name: "Реакции на посты", type: "Реакции", price: "от 12 ₽", speed: "Плавные", icon: Heart, popular: false },
  { id: 4, platform: "instagram", name: "Живые Подписчики", type: "Подписчики", price: "от 60 ₽", speed: "До 5k/день", icon: Users, popular: true },
  { id: 5, platform: "instagram", name: "Лайки с охватом", type: "Лайки", price: "от 15 ₽", speed: "Высокое качество", icon: Heart, popular: false },
  { id: 6, platform: "youtube", name: "Целевые Просмотры", type: "Просмотры", price: "от 120 ₽", speed: "Удержание 80%", icon: Play, popular: true },
  { id: 7, platform: "vk", name: "Подписчики в группу", type: "Подписчики", price: "от 80 ₽", speed: "С гарантией", icon: Users, popular: false },
];

export function ServiceCatalog() {
  const [selectedPlatform, setSelectedPlatform] = useState("telegram");

  const activeServices = MOCK_SERVICES.filter((s) => s.platform === selectedPlatform);

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto w-full">
      
      {/* Header Section */}
      <div className="flex flex-col items-center text-center space-y-6 mb-16">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-balance text-foreground">
          Прозрачный каталог услуг
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl text-balance">
          Никаких скрытых платежей. Только качественный трафик, гарантия выполнения и скорость, которая помогает вашему бизнесу расти.
        </p>
      </div>

      {/* Platform Tabs (Pillar: Spatial Cognition + Brand Colors) */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const brandColor = getBrandColor(platform.id);
          
          return (
            <Button
              key={platform.id}
              size="lg"
              onPress={() => setSelectedPlatform(platform.id)}
              className={`rounded-full transition-all duration-300 font-medium ${
                isSelected 
                  ? `bg-gradient-to-br ${brandColor.gradient} text-white shadow-lg` 
                  : "bg-card text-foreground border border-border/50 hover:bg-muted"
              }`}
              style={isSelected ? { boxShadow: `0 8px 24px ${brandColor.shadow}` } : {}}
            >
              <span className="flex items-center gap-2">
                <platform.icon className="w-5 h-5" />
                {platform.name}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Services Grid (Pillar: Advanced Motion Physics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {activeServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ 
                type: "spring", 
                bounce: 0.2, 
                duration: 0.6,
                delay: index * 0.05 
              }}
            >
              <Card 
                className="group border border-border/40 bg-background/60 backdrop-blur-xl hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-primary/5 dark:hover:bg-content2/40 hover:-translate-y-1.5 transition-all duration-500 ease-out-expo h-full will-change-transform transform-gpu"
              >
                <CardContent className="p-6 flex flex-col h-full gap-4">
                  {/* Top Row: Icon & Type */}
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <service.icon className="w-6 h-6" />
                    </div>
                    {service.popular && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                        <Zap className="w-3 h-3" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Хит</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Price */}
                  <div className="mt-2">
                    <h3 className="text-xl font-extrabold tracking-tight text-foreground mb-1">
                      {service.name}
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {service.type}
                    </p>
                  </div>

                  {/* Divider (Pillar: No-Line Architecture - using subtle gap instead of border) */}
                  <div className="flex-grow flex flex-col justify-end mt-4">
                    <div className="flex items-center gap-2 mb-6 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                      <span>{service.speed}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black tracking-tighter tabular-nums text-foreground">{service.price}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">/ 1000 шт.</span>
                      </div>
                      
                      <Button 
                        className="rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 active:scale-[0.97] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2" 
                        size="sm"
                      >
                        Заказать
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </section>
  );
}

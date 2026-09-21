'use client';

import * as React from 'react';
import type { SystemSettings } from '@prisma/client';
import { YooKassaSettings, AlfaBankSettings, SmtpSettings, GeminiSettings, WebhookSettings, CryptoBotSettings, RobokassaSettings } from './components/integrations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IntegrationsSettingsProps {
  settings: SystemSettings;
  tenantId?: string;
}

export function IntegrationsSettings({ settings, tenantId = 'smmplan' }: IntegrationsSettingsProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { id: 'payments', label: 'Платежные шлюзы' },
    { id: 'smtp', label: 'Почта (SMTP)' },
    { id: 'gemini', label: 'Gemini AI' },
    { id: 'webhooks', label: 'Webhooks' },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="sticky top-0 z-10 p-2 bg-background/90 backdrop-blur-md border-b shadow-sm flex flex-wrap gap-2 -mx-6 px-6 mb-8">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div id="payments" className="space-y-4">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-bold text-foreground">Платежные шлюзы</h2>
          </div>
          <Tabs defaultValue="yookassa" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="yookassa">YooKassa</TabsTrigger>
              <TabsTrigger value="alfabank">Alfa-Bank</TabsTrigger>
              <TabsTrigger value="robokassa">Robokassa</TabsTrigger>
              <TabsTrigger value="cryptobot">CryptoBot</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="yookassa" className="mt-0">
                <YooKassaSettings settings={settings} />
              </TabsContent>
              <TabsContent value="alfabank" className="mt-0">
                <AlfaBankSettings settings={settings} />
              </TabsContent>
              <TabsContent value="robokassa" className="mt-0">
                <RobokassaSettings settings={settings} />
              </TabsContent>
              <TabsContent value="cryptobot" className="mt-0">
                <CryptoBotSettings settings={settings} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <div className="space-y-8">
          <div id="smtp" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Почта и Рассылки (Критично)</h2>
            <SmtpSettings settings={settings} />
          </div>
          
          <div id="gemini" className="space-y-4">
             <h2 className="text-lg font-bold text-foreground">Дополнительно (Второстепенно)</h2>
             <GeminiSettings settings={settings} />
          </div>

          <div id="webhooks" className="space-y-4">
             <WebhookSettings settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

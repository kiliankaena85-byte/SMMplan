'use client';

import * as React from 'react';
import type { SystemSettings } from '@prisma/client';
import { YooKassaSettings, AlfaBankSettings, SmtpSettings, GeminiSettings, WebhookSettings, CryptoBotSettings, RobokassaSettings } from './components/integrations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IntegrationsSettingsProps {
  settings: SystemSettings;
  tenantId?: string;
}

export function IntegrationsSettings({ settings, tenantId = 'smmplan' }: IntegrationsSettingsProps) {
  const [activePaymentGateway, setActivePaymentGateway] = React.useState('yookassa');

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { id: 'payments', label: 'Платежные шлюзы' },
    { id: 'smtp', label: 'Почта (SMTP)' },
    { id: 'gemini', label: 'ИИ (Gemini)' },
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
             <Select value={activePaymentGateway} onValueChange={(val) => { if (val) setActivePaymentGateway(val); }}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue placeholder="Выберите шлюз" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="yookassa">ЮKassa</SelectItem>
                 <SelectItem value="robokassa">Robokassa</SelectItem>
                 <SelectItem value="alfabank">Альфа-Банк</SelectItem>
                 <SelectItem value="cryptobot">CryptoBot</SelectItem>
               </SelectContent>
             </Select>
          </div>
          
          <div className="mt-4">
            {activePaymentGateway === 'yookassa' && <YooKassaSettings settings={settings} />}
            {activePaymentGateway === 'robokassa' && <RobokassaSettings settings={settings} />}
            {activePaymentGateway === 'alfabank' && <AlfaBankSettings settings={settings} />}
            {activePaymentGateway === 'cryptobot' && <CryptoBotSettings settings={settings} />}
          </div>
        </div>
        
        <div className="space-y-8">
          <div id="smtp" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Почта (SMTP)</h2>
            <SmtpSettings settings={settings} />
          </div>
          
          <div id="gemini" className="space-y-4">
             <h2 className="text-lg font-bold text-foreground">Нейросеть (Gemini)</h2>
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


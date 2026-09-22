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

  return (
    <div className="space-y-6 relative">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Левая колонка: Платежи */}
        <div id="payments" className="space-y-4">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-bold text-foreground">Платежные шлюзы</h2>
             <Select value={activePaymentGateway} onValueChange={(val) => { if (val) setActivePaymentGateway(val); }}>
               <SelectTrigger className="w-[180px] max-w-full">
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
          
          {/* Фиксируем минимальную высоту, чтобы предотвратить прыжки верстки при смене шлюза */}
          <div className="mt-4 min-h-[550px] relative">
            <div className={activePaymentGateway === 'yookassa' ? 'block animate-in fade-in zoom-in-95 duration-200' : 'hidden'}>
              <YooKassaSettings settings={settings} tenantId={tenantId} />
            </div>
            <div className={activePaymentGateway === 'robokassa' ? 'block animate-in fade-in zoom-in-95 duration-200' : 'hidden'}>
              <RobokassaSettings settings={settings} tenantId={tenantId} />
            </div>
            <div className={activePaymentGateway === 'alfabank' ? 'block animate-in fade-in zoom-in-95 duration-200' : 'hidden'}>
              <AlfaBankSettings settings={settings} tenantId={tenantId} />
            </div>
            <div className={activePaymentGateway === 'cryptobot' ? 'block animate-in fade-in zoom-in-95 duration-200' : 'hidden'}>
              <CryptoBotSettings settings={settings} tenantId={tenantId} />
            </div>
          </div>
        </div>
        
        {/* Правая колонка: SMTP, Gemini, Webhooks */}
        <div className="space-y-8">
          <div id="smtp" className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Почта (SMTP)</h2>
            <SmtpSettings settings={settings} tenantId={tenantId} />
          </div>
          
          <div id="gemini" className="space-y-4">
             <h2 className="text-lg font-bold text-foreground">Нейросеть (Gemini)</h2>
             <GeminiSettings settings={settings} tenantId={tenantId} />
          </div>

          <div id="webhooks" className="space-y-4">
             <WebhookSettings settings={settings} tenantId={tenantId} />
          </div>
        </div>
      </div>
    </div>
  );
}

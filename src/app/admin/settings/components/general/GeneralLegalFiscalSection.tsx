'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, ReceiptCent } from 'lucide-react';
import type { GeneralFormState } from './types';

interface GeneralLegalFiscalSectionProps {
  defaultEmail: string;
  defaultPrivacyEmail: string;
  defaultSiteName: string;
  supportEmail: string;
  setSupportEmail: (v: string) => void;
  privacyEmail: string;
  setPrivacyEmail: (v: string) => void;
  telegramChannelDefault: string;
  companyName: string;
  setCompanyName: (v: string) => void;
  companyInn: string;
  setCompanyInn: (v: string) => void;
  companyOgrnip: string;
  setCompanyOgrnip: (v: string) => void;
  companyAddress: string;
  setCompanyAddress: (v: string) => void;
  usnScheme: string;
  handleUsnChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  taxRate: number;
  setTaxRate: (v: number) => void;
  opexMonthly: number;
  setOpexMonthly: (v: number) => void;
  siteName: string;
  formState: GeneralFormState | null;
  tabMode?: 'legal' | 'fiscal' | 'all';
}

export function GeneralLegalFiscalSection({
  defaultEmail,
  defaultPrivacyEmail,
  defaultSiteName,
  supportEmail,
  setSupportEmail,
  privacyEmail,
  setPrivacyEmail,
  telegramChannelDefault,
  companyName,
  setCompanyName,
  companyInn,
  setCompanyInn,
  companyOgrnip,
  setCompanyOgrnip,
  companyAddress,
  setCompanyAddress,
  usnScheme,
  handleUsnChange,
  taxRate,
  setTaxRate,
  opexMonthly,
  setOpexMonthly,
  siteName,
  formState,
  tabMode = 'all',
}: GeneralLegalFiscalSectionProps) {
  return (
    <Card className="rounded-3xl border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl p-6 sm:p-8 space-y-6">
      {tabMode !== 'fiscal' && (
        <>
          <div className="flex items-center gap-3 border-b border-border/50 pb-5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Контакты & Юридические реквизиты (152-ФЗ)</h3>
              <p className="text-xs text-muted-foreground">
                Отображаются в подвале сайта, пользовательском соглашении и платежных документах.
              </p>
            </div>
          </div>
    
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supportEmail" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">Email Поддержки</Label>
              <Input
                id="supportEmail"
                name="contactSupportEmail"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder={defaultEmail}
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="privacyEmail" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                Email для Data Privacy (DPO)
              </Label>
              <Input
                id="privacyEmail"
                name="contactPrivacyEmail"
                value={privacyEmail}
                onChange={(e) => setPrivacyEmail(e.target.value)}
                placeholder={defaultPrivacyEmail}
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="contactTelegramChannel" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                Telegram Новостной Канал (@канал)
              </Label>
              <Input
                id="contactTelegramChannel"
                name="contactTelegramChannel"
                defaultValue={telegramChannelDefault}
                placeholder={telegramChannelDefault}
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">Юр. Лицо ИП / ООО</Label>
              <Input
                id="companyName"
                name="legalCompanyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={defaultSiteName}
              />
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="companyInn" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">ИНН (10 или 12 цифр)</Label>
              <Input
                id="companyInn"
                name="legalCompanyInn"
                value={companyInn}
                onChange={(e) => setCompanyInn(e.target.value)}
                placeholder="ИНН организации"
                className={formState?.errors?.legalCompanyInn ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {formState?.errors?.legalCompanyInn && (
                <p className="text-xs font-bold text-destructive mt-1">{formState.errors.legalCompanyInn[0]}</p>
              )}
            </div>
    
            <div className="space-y-2">
              <Label htmlFor="companyOgrnip" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">ОГРН / ОГРНИП</Label>
              <Input
                id="companyOgrnip"
                name="legalCompanyOgrnip"
                value={companyOgrnip}
                onChange={(e) => setCompanyOgrnip(e.target.value)}
                placeholder="ОГРН организации"
                className={formState?.errors?.legalCompanyOgrnip ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
    
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyAddress" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between cursor-pointer">
                <span>Юридический адрес / Город</span>
                <span className="text-[10px] text-muted-foreground font-normal lowercase">(обязательно для работы по 152-ФЗ)</span>
              </Label>
              <Input
                id="companyAddress"
                name="legalCompanyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="г. Москва (согласно выписке ЕГРЮЛ или паспорту ИП)"
              />
              <p className="text-[10px] text-muted-foreground">
                ЗАПРЕЩЕНО PII: Если вы ИП, пишите ТОЛЬКО &lt;Город&gt; во избежание парсинга домашнего адреса.
              </p>
            </div>
          </div>
        </>
      )}

      {tabMode !== 'legal' && (
        <div className={tabMode === 'all' ? "pt-4 border-t border-border/50" : ""}>
          <div className="flex items-center gap-3 border-b border-border/50 pb-5 mb-5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <ReceiptCent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Налоги & Фискализация (54-ФЗ / 176-ФЗ)</h3>
              <p className="text-xs text-muted-foreground">
                Настройки налоговой ставки для онлайн-касс и автоматического расчета маржи.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usnScheme" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                СНО (Схема налогообложения)
              </Label>
              <select
                id="usnScheme"
                name="usnScheme"
                value={usnScheme}
                onChange={handleUsnChange}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none h-10"
              >
                <option value="INCOME">УСН Доходы (6%)</option>
                <option value="INCOME_EXPENSES">УСН Доходы минус Расходы (15%)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">
                Для правильной передачи в чек ЮKassa
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                Ставка Налога (%)
              </Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Реальная региональная или стандартная ставка
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opexMonthly" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                OPEX в Месяц (₽)
              </Label>
              <Input
                id="opexMonthly"
                name="opexMonthly"
                type="number"
                step="1000"
                min="0"
                value={opexMonthly}
                onChange={(e) => setOpexMonthly(parseFloat(e.target.value) || 0)}
                placeholder="50000"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Постоянные операционные расходы (сервера, з/п)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 LIVE FOOTER & REQUISITES PREVIEW 🚀 */}
      <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3 mt-8">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Предпросмотр данных в интерфейсе
          </span>
        </div>

        <div className="space-y-2.5">
          {tabMode !== 'fiscal' && (
            <div className="p-3.5 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground space-y-1 font-medium">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider">1. Подвал сайта:</div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/40">
                <span className="font-bold text-foreground">© 2026 {siteName || defaultSiteName}. Все права защищены.</span>
                <span className="text-foreground/70">Информационно-аналитическая платформа</span>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground space-y-1.5 font-medium">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider">2. Пользовательское соглашение:</div>
            <div className="text-[11px] text-foreground/80 font-mono grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-border/40">
              {tabMode !== 'fiscal' && (
                <>
                  <div>Исполнитель: <strong>{companyName || defaultSiteName}</strong></div>
                  <div>ИНН: <strong>{companyInn || '-'}</strong></div>
                  <div>ОГРН: <strong>{companyOgrnip || '-'}</strong></div>
                  <div>Адрес: <strong>{companyAddress || '<Город по 152-ФЗ>'}</strong></div>
                  <div>Поддержка: <strong>{supportEmail || defaultEmail}</strong></div>
                  <div>DPO (152-ФЗ): <strong>{privacyEmail || defaultPrivacyEmail}</strong></div>
                </>
              )}
              {tabMode !== 'legal' && (
                <>
                  <div>СНО ЮKassa: <strong>{usnScheme === 'INCOME' ? `УСН Доходы (${taxRate}%)` : `УСН Доходы-Расходы (${taxRate}%)`}</strong></div>
                  <div>OPEX: <strong>{opexMonthly ? `${opexMonthly.toLocaleString('ru-RU')} ₽ / мес` : 'Не задан'}</strong></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

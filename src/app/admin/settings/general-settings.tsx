'use client';

import * as React from 'react';
import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateGlobalSettings } from '@/actions/admin/settings';
import { toggleTenantMaintenanceAction } from '@/actions/admin/tenants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SystemSettings } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GeneralMaintenanceSection,
  GeneralBrandingSection,
  GeneralLegalFiscalSection,
  type GeneralFormState,
} from './components/general';

interface GeneralSettingsProps {
  settings: SystemSettings;
  tenantId?: string;
}

export function GeneralSettings({ settings, tenantId = 'smmplan' }: GeneralSettingsProps) {
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const defaultSiteName = tenantId === 'flux' ? 'SMMflux' : 'SMMplan';
  const defaultEmail = tenantId === 'flux' ? 'support@smmflux.ru' : 'support@smmplan.pro';
  const defaultPrivacyEmail = tenantId === 'flux' ? 'privacy@smmflux.ru' : 'privacy@smmplan.pro';

  const [maintenance, setMaintenance] = useState<boolean>(Boolean(settings.maintenanceMode));
  const [siteName, setSiteName] = useState<string>(settings.siteName || defaultSiteName);
  const [siteDescription, setSiteDescription] = useState<string>(settings.siteDescription || '');
  const [supportEmail, setSupportEmail] = useState<string>(settings.contactSupportEmail || defaultEmail);
  const [privacyEmail, setPrivacyEmail] = useState<string>(settings.contactPrivacyEmail || defaultPrivacyEmail);
  
  const [companyName, setCompanyName] = useState<string>(settings.legalCompanyName || defaultSiteName);
  const [companyInn, setCompanyInn] = useState<string>(settings.legalCompanyInn || '');
  const [companyOgrnip, setCompanyOgrnip] = useState<string>(settings.legalCompanyOgrnip || '');
  const [companyAddress, setCompanyAddress] = useState<string>(settings.legalCompanyAddress || '');

  const [usnScheme, setUsnScheme] = useState<string>(settings.usnScheme || 'INCOME');
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate ?? 6);
  const [opexMonthly, setOpexMonthly] = useState<number>((settings.opexMonthly || 0) / 100);

  const [logoUrl, setLogoUrl] = useState<string | null>(settings.siteLogoUrl);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(settings.siteFaviconUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Скопировано в буфер обмена');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Не удалось скопировать');
    }
  };

  const handleToggleMaintenance = async () => {
    setIsTogglingMaintenance(true);
    try {
      const res = await toggleTenantMaintenanceAction(tenantId, !maintenance);
      if (res.success) {
        setMaintenance(!maintenance);
        toast.success('Режим тех. работ изменен');
      } else {
        toast.error('error' in res ? res.error : 'Ошибка');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsTogglingMaintenance(false);
      setIsMaintenanceModalOpen(false);
    }
  };

  const handleUsnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scheme = e.target.value;
    setUsnScheme(scheme);
    if (scheme === 'INCOME') {
      setTaxRate(6);
    } else if (scheme === 'INCOME_EXPENSES') {
      setTaxRate(15);
    }
  };

  const handleBrandingUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 500 * 1024;
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой.`);
      return;
    }

    const setUploading = type === 'logo' ? setLogoUploading : setFaviconUploading;
    const setUrl = type === 'logo' ? setLogoUrl : setFaviconUrl;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('tenantId', tenantId);

    try {
      const res = await fetch('/api/admin/upload-branding', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setUrl(data.url);
        toast.success(`Файл успешно загружен`);
      } else {
        throw new Error(data.error || 'Ошибка загрузки');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setUploading(false);
    }
  };

  const [state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      try {
        const res = await updateGlobalSettings(formData);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          return res;
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
    null
  );

  const formState = state as GeneralFormState | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success('Настройки успешно сохранены');
    } else if (formState?.error) {
      toast.error(formState.error);
    }
  }, [formState]);

  return (
    <form key={settings.updatedAt?.toString() || 'general'} action={formAction} className="space-y-6 relative pb-24">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="_isGeneralSettings" value="1" />
      <input type="hidden" name="siteLogoUrl" value={logoUrl || ''} />
      <input type="hidden" name="siteFaviconUrl" value={faviconUrl || ''} />

      {/* 1. Maintenance Kill-Switch is always visible at the top */}
      <GeneralMaintenanceSection
        maintenance={maintenance}
        isTogglingMaintenance={isTogglingMaintenance}
        isMaintenanceModalOpen={isMaintenanceModalOpen}
        setIsMaintenanceModalOpen={setIsMaintenanceModalOpen}
        onToggleMaintenance={handleToggleMaintenance}
      />

      {/* Tabs for Branding, Legal, Fiscal */}
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="branding">Брендинг</TabsTrigger>
          <TabsTrigger value="legal">Реквизиты</TabsTrigger>
          <TabsTrigger value="fiscal">Финансы и Налоги</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="branding" className="mt-0">
            <GeneralBrandingSection
              siteName={siteName}
              setSiteName={setSiteName}
              siteDescription={siteDescription}
              setSiteDescription={setSiteDescription}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              faviconUrl={faviconUrl}
              setFaviconUrl={setFaviconUrl}
              logoUploading={logoUploading}
              faviconUploading={faviconUploading}
              handleBrandingUpload={handleBrandingUpload}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
              formState={formState}
              onRemoveBranding={(type) => {
                if (type === 'logo') setLogoUrl(null);
                else setFaviconUrl(null);
              }}
            />
          </TabsContent>

          <TabsContent value="legal" className="mt-0">
            <GeneralLegalFiscalSection
              tabMode="legal"
              defaultEmail={defaultEmail}
              defaultPrivacyEmail={defaultPrivacyEmail}
              defaultSiteName={defaultSiteName}
              supportEmail={supportEmail}
              setSupportEmail={setSupportEmail}
              privacyEmail={privacyEmail}
              setPrivacyEmail={setPrivacyEmail}
              telegramChannelDefault={settings.contactTelegramChannel || (tenantId === 'flux' ? 'smmflux_news' : 'smmplan_news')}
              companyName={companyName}
              setCompanyName={setCompanyName}
              companyInn={companyInn}
              setCompanyInn={setCompanyInn}
              companyOgrnip={companyOgrnip}
              setCompanyOgrnip={setCompanyOgrnip}
              companyAddress={companyAddress}
              setCompanyAddress={setCompanyAddress}
              usnScheme={usnScheme}
              handleUsnChange={handleUsnChange}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              opexMonthly={opexMonthly}
              setOpexMonthly={setOpexMonthly}
              siteName={siteName}
              formState={formState}
            />
          </TabsContent>
          
          <TabsContent value="fiscal" className="mt-0">
            <GeneralLegalFiscalSection
              tabMode="fiscal"
              defaultEmail={defaultEmail}
              defaultPrivacyEmail={defaultPrivacyEmail}
              defaultSiteName={defaultSiteName}
              supportEmail={supportEmail}
              setSupportEmail={setSupportEmail}
              privacyEmail={privacyEmail}
              setPrivacyEmail={setPrivacyEmail}
              telegramChannelDefault={settings.contactTelegramChannel || (tenantId === 'flux' ? 'smmflux_news' : 'smmplan_news')}
              companyName={companyName}
              setCompanyName={setCompanyName}
              companyInn={companyInn}
              setCompanyInn={setCompanyInn}
              companyOgrnip={companyOgrnip}
              setCompanyOgrnip={setCompanyOgrnip}
              companyAddress={companyAddress}
              setCompanyAddress={setCompanyAddress}
              usnScheme={usnScheme}
              handleUsnChange={handleUsnChange}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              opexMonthly={opexMonthly}
              setOpexMonthly={setOpexMonthly}
              siteName={siteName}
              formState={formState}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-6 right-6 left-[300px] z-50 flex items-center justify-end gap-4 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg transition-all">
        <Button
          disabled={isPending}
          type="submit"
          className="font-bold uppercase tracking-widest text-xs h-11 px-8 shadow-md cursor-pointer"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Сохранить изменения
        </Button>
      </div>
    </form>
  );
}

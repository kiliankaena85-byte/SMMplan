'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createProvider, updateProvider } from '@/actions/admin/providers/crud';
import type { ProviderDetailDTO } from '@/services/admin/provider.service';
import { ProviderFormData } from './types';
import { useProviderMappingState } from './useProviderMappingState';
import { useProviderProbeState } from './useProviderProbeState';

export function useProviderFormState(initialData?: ProviderDetailDTO) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState<ProviderFormData>({
    name: initialData?.name || '',
    apiUrl: initialData?.apiUrl || '',
    apiKey: '', // always empty for security
    isActive: initialData?.isActive ?? true,
    balanceCurrency: initialData?.balanceCurrency || 'USD',
    ticketUrl: initialData?.ticketUrl || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name,
        apiUrl: initialData.apiUrl,
        isActive: initialData.isActive,
        balanceCurrency: initialData.balanceCurrency,
        ticketUrl: initialData.ticketUrl || '',
      }));
    }
  }, [initialData]);

  const {
    integrationMode,
    jsonText,
    mapping,
    setJsonText,
    setMapping,
    getMappingPayload,
    handleModeChange,
    handleMappingChange,
  } = useProviderMappingState(initialData);

  function handleUrlBlur() {
    let val = (formData.apiUrl || '').trim().replace(/[\r\n\t]/g, '');
    if (val && !val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;
    val = val.replace(/\/+$/, '');
    if (val !== formData.apiUrl) setFormData(prev => ({ ...prev, apiUrl: val }));
  }

  function handleKeyBlur() {
    const clean = (formData.apiKey || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\r\n\t]/g, '').trim();
    if (clean !== formData.apiKey) setFormData(prev => ({ ...prev, apiKey: clean }));
  }

  const {
    checkLoading,
    inferLoading,
    inferredSchema,
    probeResult,
    isPreviewOpen,
    previewLoading,
    previewServices,
    previewSearch,
    previewTotal,
    setPreviewSearch,
    setIsPreviewOpen,
    handleDeepProbe,
    handleOpenPreview,
    handleInferSchema,
  } = useProviderProbeState(
    initialData,
    formData,
    mapping,
    getMappingPayload,
    setFormData,
    setMapping,
    () => { handleUrlBlur(); handleKeyBlur(); }
  );

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave() {
    setLoading(true);
    setFieldErrors({});

    if (!initialData && !formData.apiKey) {
      setFieldErrors(prev => ({ ...prev, apiKey: ['API Ключ обязателен при создании провайдера.'] }));
      toast.error('Проверьте обязательные поля.');
      setLoading(false);
      return;
    }

    const mappingPayload = getMappingPayload();
    if (integrationMode === 'json' && !mappingPayload) {
      setFieldErrors(prev => ({ ...prev, jsonMapping: ['Неверный JSON формат.'] }));
      toast.error('Неверный JSON формат.');
      setLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      apiUrl: formData.apiUrl,
      apiKey: formData.apiKey,
      isActive: formData.isActive,
      balanceCurrency: formData.balanceCurrency,
      mapping: mappingPayload,
      ticketUrl: formData.ticketUrl,
    };

    try {
      const res = initialData ? await updateProvider(initialData.id, payload) : await createProvider(payload);
      if (res && !res.success) {
        if ('errors' in res && res.errors) {
          setFieldErrors(res.errors as Record<string, string[]>);
          toast.error('Ошибка валидации данных.');
        } else if ('error' in res && res.error) {
          toast.error(res.error);
        }
        return;
      }
      toast.success(initialData ? 'Настройки провайдера сохранены.' : 'Провайдер успешно добавлен.');
      if (initialData) router.refresh();
      else router.push('/admin/providers');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  return {
    router,
    loading,
    checkLoading,
    inferLoading,
    inferredSchema,
    fieldErrors,
    probeResult,
    isPreviewOpen,
    previewLoading,
    previewServices,
    previewSearch,
    previewTotal,
    integrationMode,
    jsonText,
    formData,
    mapping,
    setFormData,
    setJsonText,
    setPreviewSearch,
    setIsPreviewOpen,
    handleModeChange,
    handleFormChange,
    handleMappingChange,
    handleUrlBlur,
    handleKeyBlur,
    handleDeepProbe,
    handleOpenPreview,
    handleInferSchema,
    handleSave,
  };
}

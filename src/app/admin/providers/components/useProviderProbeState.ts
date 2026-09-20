'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  probeProviderAction,
  getProviderCatalogPreviewAction,
  inferProviderSchema,
} from '@/actions/admin/providers/crud';
import type { ApiMappingDTO, ProviderDetailDTO } from '@/services/admin/provider.service';
import type { ProviderProbeResult } from '@/services/admin/provider-diagnostic.service';
import {
  ProviderFormData,
  MappingState,
  InferredSchema,
  PreviewService,
} from './types';

export function useProviderProbeState(
  initialData: ProviderDetailDTO | undefined,
  formData: ProviderFormData,
  mapping: MappingState,
  getMappingPayload: () => ApiMappingDTO | null,
  setFormData: React.Dispatch<React.SetStateAction<ProviderFormData>>,
  setMapping: React.Dispatch<React.SetStateAction<MappingState>>,
  normalizeUrlAndKey: () => void
) {
  const [checkLoading, setCheckLoading] = useState(false);
  const [inferLoading, setInferLoading] = useState(false);
  const [inferredSchema, setInferredSchema] = useState<InferredSchema | null>(null);
  const [probeResult, setProbeResult] = useState<ProviderProbeResult | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewServices, setPreviewServices] = useState<PreviewService[]>([]);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewTotal, setPreviewTotal] = useState(0);

  async function handleDeepProbe() {
    setCheckLoading(true);
    setProbeResult(null);
    normalizeUrlAndKey();

    try {
      const res = await probeProviderAction({
        providerId: initialData?.id,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        mapping: getMappingPayload(),
      });

      if ('error' in res && typeof res.error === 'string') {
        toast.error(res.error || 'Ошибка доступа');
        setProbeResult({
          success: false,
          sanitizedUrl: formData.apiUrl,
          sanitizedKey: formData.apiKey,
          latencyMs: 0,
          balanceSuccess: false,
          servicesSuccess: false,
          errorMessage: res.error,
        });
        return;
      }

      const probeData = res as ProviderProbeResult;
      setProbeResult(probeData);
      if (probeData.success) {
        toast.success(`Соединение успешно! Баланс: ${probeData.balance} ${probeData.detectedCurrency || ''}`);
        if (probeData.detectedCurrency && probeData.detectedCurrency !== formData.balanceCurrency) {
          setFormData(prev => ({ ...prev, balanceCurrency: probeData.detectedCurrency! }));
        }
      } else {
        toast.error(probeData.errorMessage || 'Ошибка подключения');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка проверки');
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleOpenPreview() {
    setIsPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await getProviderCatalogPreviewAction({
        providerId: initialData?.id,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        mapping: getMappingPayload(),
      });
      if (res.success && res.services) {
        setPreviewServices(res.services);
        setPreviewTotal(res.total || res.services.length);
      } else {
        toast.error(res.error || 'Не удалось загрузить каталог');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки каталога');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleInferSchema() {
    if (!formData.apiUrl || (!formData.apiKey && !initialData?.hasApiKey)) {
      toast.error('API URL и API Ключ обязательны для тестирования');
      return;
    }
    setInferLoading(true);
    try {
      const res = await inferProviderSchema(
        formData.apiUrl,
        formData.apiKey,
        mapping.httpMethod,
        mapping.contentType,
        { type: mapping.authType, field: mapping.authField, prefix: mapping.authPrefix },
        initialData?.id
      );
      if (res.success && res.schema) {
        setInferredSchema({
          catalogKeys: res.schema.catalog.keys,
          balanceKeys: res.schema.balance.keys,
          itemsPath: res.schema.catalog.itemsPath,
        });
        setMapping(prev => ({ ...prev, itemsPath: res.schema.catalog.itemsPath }));
        toast.success(`Найдено ${res.schema.catalog.keys.length} полей в каталоге`);
      }
    } catch {
      toast.error('Ошибка анализа структуры');
    } finally {
      setInferLoading(false);
    }
  }

  return {
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
  };
}

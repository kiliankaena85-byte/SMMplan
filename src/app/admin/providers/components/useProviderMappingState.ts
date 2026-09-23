'use client';

import { useState } from 'react';
import type { ApiMappingDTO, ProviderDetailDTO } from '@/services/admin/provider.service';
import { MappingState, IntegrationMode } from './types';

export function useProviderMappingState(initialData?: ProviderDetailDTO) {
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>(
    initialData?.mapping ? 'visual' : 'standard'
  );

  const [jsonText, setJsonText] = useState(
    initialData?.mapping
      ? JSON.stringify(initialData.mapping, null, 2)
      : '{\n  "auth": {\n    "type": "body",\n    "field": "key"\n  },\n  "order": {\n    "serviceField": "service",\n    "linkField": "link",\n    "quantityField": "quantity"\n  },\n  "response": {\n    "orderIdField": "order",\n    "errorField": "error"\n  }\n}'
  );

  const [mapping, setMapping] = useState<MappingState>({
    httpMethod: initialData?.mapping?.httpMethod || 'POST',
    contentType: initialData?.mapping?.contentType || 'form',
    authType: initialData?.mapping?.auth?.type || 'body',
    authField: initialData?.mapping?.auth?.field || 'key',
    authPrefix: initialData?.mapping?.auth?.prefix || '',
    serviceField: initialData?.mapping?.order?.serviceField || 'service',
    linkField: initialData?.mapping?.order?.linkField || 'link',
    quantityField: initialData?.mapping?.order?.quantityField || 'quantity',
    orderIdField: initialData?.mapping?.response?.orderIdField || 'order',
    errorField: initialData?.mapping?.response?.errorField || 'error',
    itemsPath: initialData?.mapping?.catalog?.itemsPath || '$',
    serviceIdField: initialData?.mapping?.catalog?.serviceIdField || 'service',
    nameField: initialData?.mapping?.catalog?.nameField || 'name',
    priceField: initialData?.mapping?.catalog?.priceField || 'rate',
    minField: initialData?.mapping?.catalog?.minField || 'min',
    maxField: initialData?.mapping?.catalog?.maxField || 'max',
    typeField: initialData?.mapping?.catalog?.typeField || 'category',
    descField: initialData?.mapping?.catalog?.descField || 'desc',
    balancePath: initialData?.mapping?.balance?.balancePath || 'balance',
    currencyPath: initialData?.mapping?.balance?.currencyPath || 'currency',
  });

  function getVisualPayload(): ApiMappingDTO {
    return {
      httpMethod: mapping.httpMethod,
      contentType: mapping.contentType,
      auth: { type: mapping.authType, field: mapping.authField, prefix: mapping.authPrefix || undefined },
      order: { serviceField: mapping.serviceField, linkField: mapping.linkField, quantityField: mapping.quantityField },
      response: { orderIdField: mapping.orderIdField, errorField: mapping.errorField },
      catalog: {
        itemsPath: mapping.itemsPath,
        serviceIdField: mapping.serviceField,
        nameField: mapping.nameField,
        priceField: mapping.priceField,
        minField: mapping.minField,
        maxField: mapping.maxField,
        typeField: mapping.typeField,
        descField: mapping.descField,
      },
      balance: { balancePath: mapping.balancePath, currencyPath: mapping.currencyPath },
    };
  }

  function getMappingPayload(): ApiMappingDTO | null {
    if (integrationMode === 'visual') return getVisualPayload();
    if (integrationMode === 'json') {
      try {
        return JSON.parse(jsonText);
      } catch {
        return null;
      }
    }
    return null;
  }

  function handleModeChange(mode: IntegrationMode) {
    if (mode === 'json' && integrationMode === 'visual') {
      setJsonText(JSON.stringify(getVisualPayload(), null, 2));
    } else if (mode === 'visual' && integrationMode === 'json') {
      try {
        const p = JSON.parse(jsonText);
        setMapping(prev => ({
          ...prev,
          httpMethod: p?.httpMethod || prev.httpMethod,
          contentType: p?.contentType || prev.contentType,
          authType: p?.auth?.type || prev.authType,
          authField: p?.auth?.field || prev.authField,
          authPrefix: p?.auth?.prefix || '',
          serviceField: p?.order?.serviceField || prev.serviceField,
          linkField: p?.order?.linkField || prev.linkField,
          quantityField: p?.order?.quantityField || prev.quantityField,
          orderIdField: p?.response?.orderIdField || prev.orderIdField,
          errorField: p?.response?.errorField || prev.errorField,
        }));
      } catch {
        // invalid JSON ignored
      }
    }
    setIntegrationMode(mode);
  }

  function handleMappingChange(field: keyof MappingState, value: string) {
    setMapping(prev => ({ ...prev, [field]: value }));
  }

  return {
    integrationMode,
    jsonText,
    mapping,
    setJsonText,
    setMapping,
    getMappingPayload,
    handleModeChange,
    handleMappingChange,
  };
}

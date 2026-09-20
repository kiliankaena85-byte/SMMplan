'use client';

import React from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { ProviderFormProps } from './types';
import { ProviderCredentialsSection } from './sub/ProviderCredentialsSection';
import { ProviderMappingSection } from './sub/ProviderMappingSection';
import { ProviderPricingSection } from './sub/ProviderPricingSection';
import { ProviderCatalogPreviewModal } from './sub/ProviderCatalogPreviewModal';
import { useProviderFormState } from './useProviderFormState';

export function ProviderForm({ initialData }: ProviderFormProps) {
  const {
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
  } = useProviderFormState(initialData);

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">
            {initialData ? `Редактирование: ${initialData.name}` : 'Новое подключение'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Конфигурация интеграции внешнего провайдера услуг
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={previewLoading || !formData.apiUrl || (!formData.apiKey && !initialData?.hasApiKey)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-all duration-200 disabled:opacity-40 flex items-center gap-2"
          >
            {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            <span>Предпросмотр каталога</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/providers')}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать подключение'}
          </button>
        </div>
      </div>

      {/* Modular CDD Sections (all <= 200 lines) */}
      <ProviderCredentialsSection
        formData={formData}
        isEditMode={!!initialData}
        hasApiKey={initialData?.hasApiKey}
        checkLoading={checkLoading}
        probeResult={probeResult}
        fieldErrors={fieldErrors}
        onChange={handleFormChange}
        onUrlBlur={handleUrlBlur}
        onKeyBlur={handleKeyBlur}
        onDeepProbe={handleDeepProbe}
        onApplySuggestedUrl={(url) => setFormData(prev => ({ ...prev, apiUrl: url }))}
      />

      <ProviderMappingSection
        integrationMode={integrationMode}
        mapping={mapping}
        jsonText={jsonText}
        inferLoading={inferLoading}
        inferredSchema={inferredSchema}
        onModeChange={handleModeChange}
        onMappingChange={handleMappingChange}
        onJsonChange={setJsonText}
        onInferSchema={handleInferSchema}
        onApplyCatalogKey={(field, k) => handleMappingChange(field, k)}
      />

      <ProviderPricingSection
        formData={formData}
        onChange={handleFormChange}
      />

      <ProviderCatalogPreviewModal
        isOpen={isPreviewOpen}
        loading={previewLoading}
        services={previewServices}
        total={previewTotal}
        search={previewSearch}
        currency={formData.balanceCurrency}
        onSearchChange={setPreviewSearch}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}

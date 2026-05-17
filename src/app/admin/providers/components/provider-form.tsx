'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createProvider,
  updateProvider,
  checkProviderConnection,
  inferProviderSchema,
} from '@/actions/admin/providers/crud';
import type { ProviderDetailDTO } from '@/services/admin/provider.service';

interface ProviderFormProps {
  /** If provided — edit mode. DTO-safe: never includes raw apiKey. */
  initialData?: ProviderDetailDTO;
}

// Input classes reused across all form controls
const inputCls =
  'block w-full rounded-lg border border-border bg-background text-foreground ' +
  'text-sm p-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
  'placeholder:text-muted-foreground transition-all duration-200';

const labelCls = 'block text-sm font-medium text-foreground mb-1';

export function ProviderForm({ initialData }: ProviderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [inferLoading, setInferLoading] = useState(false);
  const [inferredSchema, setInferredSchema] = useState<{ catalogKeys: string[]; balanceKeys: string[]; itemsPath: string; } | null>(null);

  const isInitiallyCustom = !!initialData?.mapping;

  const [integrationMode, setIntegrationMode] = useState<'standard' | 'visual' | 'json'>(
     isInitiallyCustom ? 'visual' : 'standard'
  );
  
  const [jsonText, setJsonText] = useState(
     initialData?.mapping ? JSON.stringify(initialData.mapping, null, 2) : '{\n  "auth": {\n    "type": "body",\n    "field": "key"\n  },\n  "order": {\n    "serviceField": "service",\n    "linkField": "link",\n    "quantityField": "quantity"\n  },\n  "response": {\n    "orderIdField": "order",\n    "errorField": "error"\n  }\n}'
  );

  const [formData, setFormData] = useState({
    name:            initialData?.name           || '',
    apiUrl:          initialData?.apiUrl          || '',
    apiKey:          '',   // always empty — only set when explicitly changing
    isActive:        initialData?.isActive        ?? true,
    balanceCurrency: initialData?.balanceCurrency || 'USD',
  });

  const [mapping, setMapping] = useState({
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
    // Data-Driven fields
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

  function handleModeChange(mode: 'standard' | 'visual' | 'json') {
     if (mode === 'json' && integrationMode === 'visual') {
        const payload = {
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
            descField: mapping.descField
          },
          balance: {
            balancePath: mapping.balancePath,
            currencyPath: mapping.currencyPath
          }
        };
        setJsonText(JSON.stringify(payload, null, 2));
     } else if (mode === 'visual' && integrationMode === 'json') {
        try {
           const parsed = JSON.parse(jsonText);
           setMapping({
             httpMethod: parsed?.httpMethod || 'POST',
             contentType: parsed?.contentType || 'form',
             authType: parsed?.auth?.type || 'body',
             authField: parsed?.auth?.field || 'key',
             authPrefix: parsed?.auth?.prefix || '',
             serviceField: parsed?.order?.serviceField || 'service',
             linkField: parsed?.order?.linkField || 'link',
             quantityField: parsed?.order?.quantityField || 'quantity',
             orderIdField: parsed?.response?.orderIdField || 'order',
             errorField: parsed?.response?.errorField || 'error',
             itemsPath: parsed?.catalog?.itemsPath || '$',
             serviceIdField: parsed?.catalog?.serviceIdField || 'service',
             nameField: parsed?.catalog?.nameField || 'name',
             priceField: parsed?.catalog?.priceField || 'rate',
             minField: parsed?.catalog?.minField || 'min',
             maxField: parsed?.catalog?.maxField || 'max',
             typeField: parsed?.catalog?.typeField || 'category',
             descField: parsed?.catalog?.descField || 'desc',
             balancePath: parsed?.balance?.balancePath || 'balance',
             currencyPath: parsed?.balance?.currencyPath || 'currency',
           });
        } catch(e) {
           // Invalid JSON, ignore
        }
     }
     setIntegrationMode(mode);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave() {
    try {
      setLoading(true);


      if (!initialData && !formData.apiKey) {
        throw new Error('API Ключ обязателен при создании провайдера.');
      }

      let mappingPayload = null;
      if (integrationMode === 'visual') {
        mappingPayload = {
          httpMethod: mapping.httpMethod,
          contentType: mapping.contentType,
          auth: {
            type: mapping.authType,
            field: mapping.authField,
            prefix: mapping.authPrefix || undefined
          },
          order: {
            serviceField: mapping.serviceField,
            linkField: mapping.linkField,
            quantityField: mapping.quantityField
          },
          response: {
            orderIdField: mapping.orderIdField,
            errorField: mapping.errorField
          },
          catalog: {
            itemsPath: mapping.itemsPath,
            serviceIdField: mapping.serviceField,
            nameField: mapping.nameField,
            priceField: mapping.priceField,
            minField: mapping.minField,
            maxField: mapping.maxField,
            typeField: mapping.typeField,
            descField: mapping.descField
          },
          balance: {
            balancePath: mapping.balancePath,
            currencyPath: mapping.currencyPath
          }
        };
      } else if (integrationMode === 'json') {
        try {
           mappingPayload = JSON.parse(jsonText);
        } catch {
           throw new Error("JSON маппинг имеет неверный формат. Проверьте синтаксис.");
        }
      }

      const payload = {
        name:            formData.name,
        apiUrl:          formData.apiUrl,
        apiKey:          formData.apiKey,
        isActive:        formData.isActive,
        balanceCurrency: formData.balanceCurrency,
        mapping:         mappingPayload
      };

      if (initialData) {
        await updateProvider(initialData.id, payload);
        toast.success('Настройки провайдера сохранены.');
      } else {
        await createProvider(payload);
        toast.success('Провайдер успешно добавлен.');
        router.push('/admin/providers');
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    if (!initialData) return;
    setCheckLoading(true);
    try {
      const res = await checkProviderConnection(initialData.id);
      if (res.success && res.balance !== undefined) {
        toast.success(`Успешно! Баланс: ${String(res.balance)} ${res.currency}`);
      } else {
        toast.error(`Ошибка: ${(res as { error?: string }).error || 'Нет ответа от сервера'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка соединения';
      toast.error(msg);
    } finally {
      setCheckLoading(false);
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
           mapping.httpMethod as any, 
           mapping.contentType as any, 
           { type: mapping.authType, field: mapping.authField, prefix: mapping.authPrefix },
           initialData?.id
       );
       if (res.success && res.schema) {
          setInferredSchema({
             catalogKeys: res.schema.catalog.keys,
             balanceKeys: res.schema.balance.keys,
             itemsPath: res.schema.catalog.itemsPath
          });
          
          const keys = res.schema.catalog.keys as string[];
          const bestMatch = (possible: string[]) => keys.find(k => possible.includes(k.toLowerCase())) || '';
          
          setMapping(prev => ({ 
             ...prev, 
             itemsPath: res.schema.catalog.itemsPath,
             serviceIdField: bestMatch(['service', 'package_id', 'id']) || prev.serviceIdField,
             nameField: bestMatch(['name', 'title']) || prev.nameField,
             priceField: bestMatch(['rate', 'price', 'cost']) || prev.priceField,
             minField: bestMatch(['min', 'minimum']) || prev.minField,
             maxField: bestMatch(['max', 'maximum']) || prev.maxField,
             typeField: bestMatch(['category', 'type']) || prev.typeField,
             descField: bestMatch(['desc', 'description']) || prev.descField,
          }));
          
          toast.success('Схема успешно получена! Поля автозаполнены.');
       } else {
          toast.error(`Ошибка: ${res.error || 'Не удалось получить схему'}`);
       }
    } catch(e: any) {
       toast.error(`Ошибка: ${e.message}`);
    } finally {
       setInferLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      {inferredSchema && (
        <>
          <datalist id="catalog-keys">
            {inferredSchema.catalogKeys.map(k => <option key={k} value={k} />)}
          </datalist>
          <datalist id="balance-keys">
            {inferredSchema.balanceKeys.map(k => <option key={k} value={k} />)}
          </datalist>
        </>
      )}

      {/* Mode Toggle */}
      <div className="flex bg-muted/50 p-1 rounded-lg w-full max-w-lg mb-6 border border-border/50">
        <button
          type="button"
          onClick={() => handleModeChange('standard')}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all duration-200 ${
            integrationMode === 'standard' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Perfect Panel API (Стандарт)
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('visual')}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all duration-200 ${
            integrationMode === 'visual' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Визуальный Билдер
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('json')}
          className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all duration-200 ${
            integrationMode === 'json' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          JSON (Oldschool)
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">

          {/* Name */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-name">
              Название панели
            </label>
            <input
              id="provider-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: VexBoost"
              className={inputCls}
              aria-label="Название провайдера"
            />
          </div>

          {/* Currency */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-currency">
              Валюта баланса
            </label>
            <select
              id="provider-currency"
              name="balanceCurrency"
              value={formData.balanceCurrency}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="USD">USD ($)</option>
              <option value="RUB">RUB (₽)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          {/* API URL */}
          <div className="sm:col-span-6">
            <label className={labelCls} htmlFor="provider-url">API URL</label>
            <input
              id="provider-url"
              type="url"
              name="apiUrl"
              placeholder="https://example.com/api/v2"
              value={formData.apiUrl}
              onChange={handleChange}
              className={`${inputCls} font-mono`}
              aria-label="API URL провайдера"
            />
          </div>

          {/* API Key */}
          <div className="sm:col-span-6 bg-warning/10/60 border border-amber-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-amber-900 mb-1" htmlFor="provider-key">
              API Key / Secret
            </label>
            <p className="text-xs text-amber-700 mb-2">
              Ключ шифруется (AES-256-GCM) до сохранения в БД.
              {initialData?.hasApiKey && (
                <span className="ml-1 text-emerald-700 font-semibold">Текущий ключ установлен — оставьте поле пустым чтобы не менять.</span>
              )}
            </p>
            <input
              id="provider-key"
              type="password"
              name="apiKey"
              placeholder={initialData?.hasApiKey ? '******** (Скрыто)' : 'Введите API ключ...'}
              value={formData.apiKey}
              onChange={handleChange}
              autoComplete="new-password"
              className={`${inputCls} font-mono border-amber-300 bg-background/80`}
              aria-label="API ключ провайдера"
            />
          </div>

          {/* Technical Settings Section - Conditionally rendered */}
          {integrationMode === 'visual' && (
            <div className="sm:col-span-6 space-y-6 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="border-t border-border pt-4 flex flex-col md:flex-row gap-4 items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Визуальный API Билдер</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Инструмент для подключения "нестандартных" провайдеров. Откройте API документацию нужного провайдера (раздел "Add order") и перенесите названия полей оттуда в эти ячейки.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Левая колонка - Форма */}
                <div className="xl:col-span-2 space-y-6">

                  {/* STEP 0: FETCH SCHEMA */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="bg-primary/20 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">🪄</span>
                          Умный маппинг (Auto-Discovery)
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Заполните URL, Ключ и блок <b>Авторизации (Шаг 1)</b>. Затем нажмите кнопку, чтобы вытянуть реальные поля от провайдера.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleInferSchema}
                        disabled={inferLoading}
                        className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm ${
                          inferredSchema 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {inferLoading ? 'Загрузка...' : inferredSchema ? '✅ Обновить схему' : '🪄 Получить схему'}
                      </button>
                    </div>
                    
                    {inferredSchema && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md animate-in slide-in-from-top-2">
                        <p className="text-xs text-emerald-800 font-medium mb-1">✅ Мы нашли следующие поля в API:</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {inferredSchema.catalogKeys.slice(0, 15).map(k => (
                              <span key={k} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-900 rounded text-[10px] font-mono border border-emerald-500/20">
                                {k}
                              </span>
                          ))}
                          {inferredSchema.catalogKeys.length > 15 && (
                            <span className="text-[10px] text-emerald-800 self-center">и еще {inferredSchema.catalogKeys.length - 15}...</span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-2 font-medium">Я автоматически заполнил наиболее подходящие поля ниже.</p>
                      </div>
                    )}
                  </div>

                  {/* HTTP CONFIG */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Метод и Формат запроса
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>HTTP Метод</label>
                        <select
                          className={inputCls}
                          value={mapping.httpMethod}
                          onChange={(e) => setMapping({...mapping, httpMethod: e.target.value as any})}
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Формат данных</label>
                        <select
                          className={inputCls}
                          value={mapping.contentType}
                          onChange={(e) => setMapping({...mapping, contentType: e.target.value as any})}
                          disabled={mapping.httpMethod === 'GET'}
                        >
                          <option value="form">x-www-form-urlencoded (Стандарт)</option>
                          <option value="json">application/json</option>
                        </select>
                        {mapping.httpMethod === 'GET' && <p className="text-[10px] text-muted-foreground mt-1">Для GET запросов параметры передаются в URL.</p>}
                      </div>
                    </div>
                  </div>

                  {/* STEP 1: AUTH */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                      Авторизация (Как мы передаем API ключ?)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Метод передачи</label>
                        <select
                          className={inputCls}
                          value={mapping.authType}
                          onChange={(e) => setMapping({...mapping, authType: e.target.value as any})}
                        >
                          <option value="body">В теле запроса (Body / POST)</option>
                          <option value="query">В адресе (Query ?key=...)</option>
                          <option value="header">В HTTP заголовке (Headers)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Название параметра</label>
                        <input
                          className={inputCls}
                          value={mapping.authField}
                          onChange={(e) => setMapping({...mapping, authField: e.target.value})}
                          placeholder="key"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Обычно `key` или `api_token`</p>
                      </div>
                      {mapping.authType === 'header' && (
                        <div>
                          <label className={labelCls}>Префикс ключа (опц.)</label>
                          <input
                            className={inputCls}
                            value={mapping.authPrefix}
                            onChange={(e) => setMapping({...mapping, authPrefix: e.target.value})}
                            placeholder="Bearer "
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: CATALOG MAPPING */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
                      Каталог услуг (Чтение /services)
                    </h4>
                    <p className="text-xs text-muted-foreground">Где лежат услуги и как называются поля? {inferredSchema && <span className="text-emerald-600 font-semibold">(Доступны подсказки из схемы)</span>}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Путь к массиву услуг (Items Path)</label>
                        <input className={inputCls} value={mapping.itemsPath} onChange={e => setMapping({...mapping, itemsPath: e.target.value})} placeholder="$" />
                        <p className="text-[10px] text-muted-foreground mt-1">$ значит корень. Если услуги лежат в data.services, введите data.services</p>
                      </div>
                      <div>
                        <label className={labelCls}>Поле "ID Услуги"</label>
                        <input className={inputCls} list="catalog-keys" value={mapping.serviceIdField} onChange={e => setMapping({...mapping, serviceIdField: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Название"</label>
                        <input className={inputCls} list="catalog-keys" value={mapping.nameField} onChange={e => setMapping({...mapping, nameField: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Цена" (за 1000)</label>
                        <input className={inputCls} list="catalog-keys" value={mapping.priceField} onChange={e => setMapping({...mapping, priceField: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Категория"</label>
                        <input className={inputCls} list="catalog-keys" value={mapping.typeField} onChange={e => setMapping({...mapping, typeField: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: ORDER CREATION */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">3</span>
                      Создание заказа (Отправка)
                    </h4>
                    <p className="text-xs text-muted-foreground">Как провайдер ждет заказ?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Поле "ID Услуги"</label>
                        <input
                          className={inputCls}
                          value={mapping.serviceField}
                          onChange={(e) => setMapping({...mapping, serviceField: e.target.value})}
                          placeholder="service"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Ссылка"</label>
                        <input
                          className={inputCls}
                          value={mapping.linkField}
                          onChange={(e) => setMapping({...mapping, linkField: e.target.value})}
                          placeholder="link"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Количество"</label>
                        <input
                          className={inputCls}
                          value={mapping.quantityField}
                          onChange={(e) => setMapping({...mapping, quantityField: e.target.value})}
                          placeholder="quantity"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 4: RESPONSE PARSING */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">4</span>
                      Чтение ответа & Баланса
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Ответ: "Номер заказа"</label>
                        <input className={inputCls} value={mapping.orderIdField} onChange={(e) => setMapping({...mapping, orderIdField: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Ответ: "Текст ошибки"</label>
                        <input className={inputCls} value={mapping.errorField} onChange={(e) => setMapping({...mapping, errorField: e.target.value})} />
                      </div>
                      <div className="sm:col-span-2 border-t border-border/50 pt-3 mt-1">
                        <p className="text-xs font-semibold mb-2">Чтение баланса (Чтение /balance)</p>
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Баланс"</label>
                        <input className={inputCls} list="balance-keys" value={mapping.balancePath} onChange={(e) => setMapping({...mapping, balancePath: e.target.value})} placeholder="balance" />
                      </div>
                      <div>
                        <label className={labelCls}>Поле "Валюта"</label>
                        <input className={inputCls} list="balance-keys" value={mapping.currencyPath} onChange={(e) => setMapping({...mapping, currencyPath: e.target.value})} placeholder="currency" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Правая колонка - Live Preview */}
                <div className="xl:col-span-1">
                  <div className="bg-[#1e1e1e] rounded-xl border border-border overflow-hidden sticky top-6">
                    <div className="bg-[#2d2d2d] px-4 py-2 border-b border-border flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-400 font-mono ml-2">Live Preview: {mapping.httpMethod} /api</span>
                    </div>
                    <div className="p-4 text-xs font-mono text-blue-300 leading-relaxed overflow-x-auto">
                      <span className="text-gray-400">// То, что уйдет провайдеру:</span>
                      <br/>
                      {mapping.authType === 'header' && (
                        <>
                          <span className="text-[#ce9178]">"{mapping.authField}"</span>: <span className="text-[#b5cea8]">"{mapping.authPrefix}ВАШ_КЛЮЧ"</span>
                          <br/><br/>
                        </>
                      )}

                      {mapping.httpMethod === 'GET' ? (
                        <div className="break-all whitespace-pre-wrap">
                          <span className="text-[#569cd6]">URL:</span> ?action=add&{mapping.authType === 'query' || mapping.authType === 'body' ? `${mapping.authField}=ВАШ_КЛЮЧ&` : ''}{mapping.serviceField || 'service'}=123&{mapping.linkField || 'link'}=https://t.me/durov&{mapping.quantityField || 'quantity'}=1000
                        </div>
                      ) : (
                        <>
                          {mapping.contentType === 'json' ? (
                            <span className="text-[#569cd6]">{"{"}</span>
                          ) : (
                            <span className="text-[#569cd6]">Body (Form Data):</span>
                          )}
                          <div className={mapping.contentType === 'json' ? "pl-4" : "pl-0"}>
                            <span className="text-[#ce9178]">"action"</span>: <span className="text-[#ce9178]">"add"</span>,<br/>
                            {(mapping.authType === 'body' || mapping.authType === 'query') && (
                              <><span className="text-[#ce9178]">"{mapping.authField}"</span>: <span className="text-[#b5cea8]">"ВАШ_КЛЮЧ"</span>,<br/></>
                            )}
                            <span className="text-[#ce9178]">"{mapping.serviceField || 'service'}"</span>: <span className="text-[#b5cea8]">123</span>,<br/>
                            <span className="text-[#ce9178]">"{mapping.linkField || 'link'}"</span>: <span className="text-[#ce9178]">"https://t.me/durov"</span>,<br/>
                            <span className="text-[#ce9178]">"{mapping.quantityField || 'quantity'}"</span>: <span className="text-[#b5cea8]">1000</span>
                          </div>
                          {mapping.contentType === 'json' && <span className="text-[#569cd6]">{"}"}</span>}
                        </>
                      )}
                      
                      <br/><br/>
                      <span className="text-gray-400">// То, что мы ждем в ответ:</span>
                      <br/>
                      <span className="text-[#569cd6]">{"{"}</span>
                      <div className="pl-4">
                        <span className="text-[#ce9178]">"{mapping.orderIdField || 'order'}"</span>: <span className="text-[#b5cea8]">9876543</span>
                      </div>
                      <span className="text-[#569cd6]">{"}"}</span>
                    </div>
                  </div>
                </div>
              </div>



            </div>
          )}

          {integrationMode === 'json' && (
            <div className="sm:col-span-6 space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-border">
              <h3 className="text-base font-semibold text-foreground">Продвинутый JSON маппинг</h3>
              <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                Настройте маппинг вручную. Отлично подходит для копирования готовых конфигураций (Oldschool стиль).
              </p>
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={15}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="{\n  ... \n}"
              />
            </div>
          )}

          {/* isActive toggle */}
          <div className="sm:col-span-6 flex items-center gap-3 pt-2">
            <input
              id="provider-active"
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
            />
            <label htmlFor="provider-active" className="text-sm text-foreground cursor-pointer select-none">
              Включить провайдера: принимать заказы и разрешить синхронизацию каталога
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-5 border-t border-border flex justify-between items-center">
          {/* Test connection */}
          <div>
            {initialData && (
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkLoading}
                aria-label="Протестировать API соединение"
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50"
              >
                {checkLoading ? '⟳ Проверка...' : '🔌 Тест соединения'}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/providers')}
              aria-label="Отменить изменения"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              aria-label={initialData ? 'Сохранить изменения провайдера' : 'Создать провайдера'}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать подключение'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

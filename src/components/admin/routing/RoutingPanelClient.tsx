'use client';

import { useState } from 'react';
import { Card, Button, Modal, ModalHeader, ModalBody, ModalFooter, Checkbox, Chip, Table, Alert } from '@heroui/react';
import { previewHotSwap, executeHotSwap } from '@/actions/admin/routing.actions';

export function RoutingPanelClient({ service, routes, auditLogs }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const onOpenChange = (open: boolean) => setIsOpen(open);
  
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const primaryRoute = routes.find((r: any) => r.isPrimary) || routes[0];
  const fallbackRoutes = routes.filter((r: any) => !r.isPrimary);

  const handleOpenSwap = async (route: any) => {
    setSelectedRoute(route);
    setPreviewData(null);
    setReason("");
    setUnderstood(false);
    setError("");
    onOpen();

    try {
      const res = await previewHotSwap(service.id, route.id);
      if (res.success) {
        setPreviewData(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmSwap = async (onClose: () => void) => {
    if (!reason || reason.length < 5) {
      setError("Причина должна содержать минимум 5 символов");
      return;
    }
    if (!understood) {
      setError("Вы должны подтвердить понимание риска");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await executeHotSwap({
        serviceId: service.id,
        newRouteId: selectedRoute.id,
        reason,
        understandRisk: understood
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Current Status & Fallbacks */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Active Node */}
        <Card className="p-6 border-l-4 border-l-primary bg-background shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Current Primary Route</p>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {primaryRoute?.provider?.name || "Unknown"}
                <Chip color="success" size="sm" variant="soft">ACTIVE NODE</Chip>
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Provider Service ID</span>
                  <span className="font-mono">{primaryRoute?.providerServiceId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Failover Mode</span>
                  <span className="capitalize font-semibold">{primaryRoute?.failoverMode || "Manual"}</span>
                </div>
              </div>
            </div>
            
            {service.cooldownUntil && new Date(service.cooldownUntil) > new Date() && (
              <div className="bg-warning-50 text-warning-800 p-3 rounded-lg text-sm border border-warning-200">
                <p className="font-bold">⚠️ В карантине</p>
                <p>Услуга отключена для новых покупок.</p>
                <p>До: {new Date(service.cooldownUntil).toLocaleString()}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Fallback Nodes */}
        <Card className="shadow-sm">
          <div className="p-4 border-b border-divider">
            <h3 className="text-lg font-bold">Fallback Routes</h3>
            <p className="text-sm text-muted-foreground">Резервные провайдеры для этой услуги</p>
          </div>
          
          <Table aria-label="Fallback routes table">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column id="provider">PROVIDER</Table.Column>
                  <Table.Column id="external_id">EXTERNAL ID</Table.Column>
                  <Table.Column id="priority">PRIORITY</Table.Column>
                  <Table.Column id="status">STATUS</Table.Column>
                  <Table.Column id="actions">ACTIONS</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={() => "Нет резервных маршрутов"}>
                  {fallbackRoutes.map((route: any) => (
                    <Table.Row key={route.id} id={route.id}>
                      <Table.Cell className="font-semibold">{route.provider.name}</Table.Cell>
                      <Table.Cell className="font-mono text-sm">{route.providerServiceId}</Table.Cell>
                      <Table.Cell>{route.priority}</Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" color={route.isActive ? "success" : "default"} variant="soft">
                          {route.isActive ? "Active" : "Disabled"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Button 
                          size="sm" 
                          variant="tertiary" 
                          isDisabled={!route.isActive}
                          onPress={() => handleOpenSwap(route)}
                        >
                          Switch Traffic
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
      </div>

      {/* RIGHT COLUMN: Audit Log */}
      <div className="space-y-6">
        <Card className="shadow-sm h-full">
          <div className="p-4 border-b border-divider">
            <h3 className="text-lg font-bold">Audit Trail</h3>
            <p className="text-sm text-muted-foreground">История изменений маршрутизации</p>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">Нет записей</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-muted-foreground">{log.reason}</p>
                  <div className="mt-1 flex gap-1 text-xs font-mono bg-default-100 px-2 py-1 rounded inline-block">
                    <span>{log.fromProviderId?.slice(0,8)}</span>
                    <span className="text-primary">→</span>
                    <span>{log.toProviderId?.slice(0,8)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* MODAL: Switch Traffic Preview */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        {/* We will just use standard DOM layout or standard Modal parts without ModalContent since it might not be exported */}
        <div className="bg-background rounded-large shadow-large">
          <div className="p-6">
            <>
              <ModalHeader className="flex flex-col gap-1">
                Конфигурация Hot-Swap
              </ModalHeader>
              <ModalBody>
                {previewData ? (
                  <div className="space-y-4">
                    <Alert color="warning" title="Осторожно! Вы меняете маршрут живого трафика.">
                      Это действие мгновенно перенаправит все **новые** заказы.
                    </Alert>

                    <div className="grid grid-cols-2 gap-4 bg-default-50 p-4 rounded-xl border border-default-200">
                      <div>
                        <p className="text-sm text-muted-foreground">Текущий провайдер</p>
                        <p className="font-bold text-danger">{previewData.currentProvider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Целевой провайдер (Новый)</p>
                        <p className="font-bold text-success">{previewData.targetProvider}</p>
                      </div>
                    </div>

                    <div className="bg-background border border-divider p-4 rounded-xl space-y-2">
                      <h4 className="font-bold">Dry-Run Аналитика:</h4>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li>
                          🔹 <b>{previewData.unaffectedExistingOrders}</b> существующих заказов (IN_PROGRESS) <span className="text-primary font-semibold">продолжат работу через старого провайдера</span>. Легаси данные в безопасности.
                        </li>
                        <li>
                          🔹 Ожидается <b>~{previewData.estimatedDailyOrders}</b> новых заказов/день через целевого провайдера.
                        </li>
                        <li className="text-warning-600">
                          ⚠️ {previewData.warning}
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-divider flex flex-col">
                      <label className="text-sm font-medium">Причина переключения (Audit Log)</label>
                      <textarea 
                        className="w-full bg-default-100 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                        placeholder="Например: Провайдер А задерживает выполнение, переключаю на резерв"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        rows={3}
                      />
                      
                      <Checkbox isSelected={understood} onChange={setUnderstood}>
                        Я понимаю, что переключаю боевой трафик, и проверил лимиты нового провайдера
                      </Checkbox>

                      {error && <p className="text-danger text-sm">{error}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Загрузка аналитики Dry-Run...
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onClose}>
                  Отмена
                </Button>
                <Button 
                  variant="danger" 
                  onPress={() => confirmSwap(onClose)}
                  isPending={isLoading}
                  isDisabled={!previewData}
                >
                  Confirm Traffic Swap
                </Button>
              </ModalFooter>
            </>
          </div>
        </div>
      </Modal>

    </div>
  );
}

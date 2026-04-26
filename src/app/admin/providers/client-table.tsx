'use client';

import { Table, Chip } from '@heroui/react';
import Link from 'next/link';
import type { ProviderListDTO } from '@/services/admin/provider.service';

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  return (
    <Table className="rounded-2xl border border-border overflow-hidden bg-card">
      <Table.ScrollContainer>
        <Table.Content aria-label="Провайдеры API" className="border-none shadow-none">
          <Table.Header className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
            <Table.Column isRowHeader className="py-3.5 px-4 font-bold">
              Название / API
            </Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold">Услуги</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold">Валюта</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold">Статус</Table.Column>
            <Table.Column className="py-3.5 px-4 font-bold text-right">Действия</Table.Column>
          </Table.Header>

          <Table.Body
            renderEmptyState={() => (
              <div className="py-12 text-center">
                <p className="text-muted-foreground font-medium mb-3">
                  Нет добавленных провайдеров.
                </p>
                <Link
                  href="/admin/providers/new"
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  Подключить первую панель →
                </Link>
              </div>
            )}
          >
            {providers.map((provider) => (
              <Table.Row
                key={provider.id}
                className="border-b border-border hover:bg-muted/30 transition-all duration-200 last:border-0 group"
              >
                {/* Name / URL */}
                <Table.Cell className="py-3.5 px-4">
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                    {provider.name}
                  </div>
                  <div
                    className="text-muted-foreground font-mono text-xs mt-0.5 truncate max-w-xs"
                    title={provider.apiUrl}
                  >
                    {provider.apiUrl}
                  </div>
                </Table.Cell>

                {/* Service count */}
                <Table.Cell className="py-3.5 px-4">
                  <div className="font-bold text-foreground tabular-nums">
                    {provider.serviceCount.toLocaleString('ru-RU')}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    связано
                  </div>
                </Table.Cell>

                {/* Currency */}
                <Table.Cell className="py-3.5 px-4">
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {provider.balanceCurrency}
                  </span>
                </Table.Cell>

                {/* Status */}
                <Table.Cell className="py-3.5 px-4">
                  <Chip
                    color={provider.isActive ? 'success' : 'danger'}
                    size="sm"
                    variant="soft"
                    className="font-bold text-[10px] uppercase tracking-widest"
                  >
                    {provider.isActive ? 'Активен' : 'Отключен'}
                  </Chip>
                </Table.Cell>

                {/* Actions */}
                <Table.Cell className="py-3.5 px-4">
                  <div className="flex justify-end">
                    <Link
                      href={`/admin/providers/${provider.id}`}
                      aria-label={`Настроить провайдер ${provider.name}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200 shadow-sm"
                    >
                      Настроить
                    </Link>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

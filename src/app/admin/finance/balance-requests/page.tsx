"use client";

import React, { useState, useEffect } from "react";
import { getBalanceAdjustmentsAction } from "@/actions/admin/balance-adjustments";
import { BalanceAdjustmentDrawer, BalanceAdjustmentItem } from "@/components/admin/balance/BalanceAdjustmentDrawer";
import Link from "next/link";

export default function BalanceRequestsPage() {
  const [items, setItems] = useState<BalanceAdjustmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<BalanceAdjustmentItem | null>(null);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (statusFilter) formData.append("status", statusFilter);
      if (directionFilter) formData.append("direction", directionFilter);
      formData.append("page", page.toString());
      formData.append("pageSize", "20");

      const res = await getBalanceAdjustmentsAction(formData);
      if (res.success && res.items) {
        setItems(res.items as BalanceAdjustmentItem[]);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load balance requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [page, statusFilter, directionFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Заявки на корректировку баланса</h1>
          <p className="text-sm text-muted-foreground">
            Входящие заявки от службы поддержки на начисление и списание средств
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/finance/balance-requests/stats"
            className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg text-xs transition-colors"
          >
            📊 Аналитика и отчёты
          </Link>
          <Link
            href="/admin/settings/balance-policies"
            className="py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-xs hover:opacity-90 transition-opacity"
          >
            ⚙️ Настройка политик
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-4 rounded-xl shadow-xs">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Статус:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
          >
            <option value="">Все статусы</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Тип:</label>
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
          >
            <option value="">Все типы</option>
            <option value="CREDIT">Начисление (+)</option>
            <option value="DEBIT">Списание (-)</option>
          </select>
        </div>

        <button
          onClick={fetchAdjustments}
          className="mt-5 px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium"
        >
          Обновить
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Загрузка заявок...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Заявки не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-3">ID / Дата</th>
                  <th className="p-3">Клиент</th>
                  <th className="p-3">Оператор</th>
                  <th className="p-3">Тип / Причина</th>
                  <th className="p-3">Сумма (₽)</th>
                  <th className="p-3">Тикет</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const rub = (Number(item.amount) / 100).toFixed(2);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-semibold">#{item.id.slice(-6)}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{item.user?.email || item.userId}</td>
                      <td className="p-3 text-muted-foreground">{item.requester?.email || item.requestedBy}</td>
                      <td className="p-3">
                        <span className={`font-semibold ${item.direction === 'CREDIT' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.direction === 'CREDIT' ? '+ CREDIT' : '- DEBIT'}
                        </span>
                        <div className="text-[10px] text-muted-foreground">{item.reasonCode}</div>
                      </td>
                      <td className="p-3 font-bold text-foreground">{rub} ₽</td>
                      <td className="p-3 font-mono text-[11px] text-primary">{item.ticketId || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === 'EXECUTED' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-500' :
                          item.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="py-1 px-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded text-[11px]"
                        >
                          Детали
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="p-4 border-t border-border flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Показано {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} из {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >
                Назад
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
              >
                Вперед
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <BalanceAdjustmentDrawer
          adjustment={selectedItem}
          onClose={() => setSelectedItem(null)}
          onActionComplete={fetchAdjustments}
        />
      )}
    </div>
  );
}

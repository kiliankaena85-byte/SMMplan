"use client";

import React, { useState, useEffect } from "react";
import { getBalanceAdjustmentStatsAction } from "@/actions/admin/balance-adjustments";
import Link from "next/link";

interface StatsData {
  summary: {
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    executedCount: number;
    creditSum: string;
    debitSum: string;
    netSum: string;
  };
  byStaff: { id: string; email: string; count: number; creditSum: string; debitSum: string }[];
  byReason: { code: string; count: number; creditSum: string; debitSum: string }[];
  byDay: { day: string; count: number; creditSum: string; debitSum: string }[];
}

export default function BalanceAdjustmentStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getBalanceAdjustmentStatsAction(new FormData());
      if (res.success && res.summary) {
        setStats(res as unknown as StatsData);
      }
    } catch (err) {
      console.error("Failed to fetch balance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground text-sm">Загрузка статистики...</div>;
  }

  if (!stats) {
    return <div className="p-12 text-center text-muted-foreground text-sm">Не удалось загрузить данные</div>;
  }

  const creditRub = (Number(stats.summary.creditSum) / 100).toFixed(2);
  const debitRub = (Number(stats.summary.debitSum) / 100).toFixed(2);
  const netRub = (Number(stats.summary.netSum) / 100).toFixed(2);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Статистика и отчёты по заявкам</h1>
          <p className="text-sm text-muted-foreground">
            Сводные финансовые показатели корректировок баланса и лимитов
          </p>
        </div>

        <Link
          href="/admin/finance/balance-requests"
          className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg text-xs"
        >
          ← Назад к заявкам
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl shadow-xs">
          <span className="text-xs text-muted-foreground">Всего заявок</span>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.summary.totalCount}</div>
          <div className="text-xs text-amber-500 mt-1 font-medium">{stats.summary.pendingCount} на утверждении</div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs">
          <span className="text-xs text-muted-foreground">Начислено (CREDIT)</span>
          <div className="text-2xl font-bold text-emerald-500 mt-1">+{creditRub} ₽</div>
          <div className="text-xs text-muted-foreground mt-1">{stats.summary.executedCount} исполнено</div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs">
          <span className="text-xs text-muted-foreground">Списано (DEBIT)</span>
          <div className="text-2xl font-bold text-red-500 mt-1">-{debitRub} ₽</div>
          <div className="text-xs text-muted-foreground mt-1">{stats.summary.rejectedCount} отклонено</div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs">
          <span className="text-xs text-muted-foreground">Чистый баланс (NET)</span>
          <div className={`text-2xl font-bold mt-1 ${Number(stats.summary.netSum) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {Number(stats.summary.netSum) >= 0 ? `+${netRub}` : `${netRub}`} ₽
          </div>
          <div className="text-xs text-muted-foreground mt-1">Итоговое сальдо</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Staff Table */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Статистика по операторам (Staff)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-2">Оператор</th>
                  <th className="p-2">Заявок</th>
                  <th className="p-2">Начислено</th>
                  <th className="p-2">Списано</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.byStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td className="p-2 font-medium">{staff.email}</td>
                    <td className="p-2">{staff.count}</td>
                    <td className="p-2 text-emerald-500 font-medium">+{(Number(staff.creditSum) / 100).toFixed(2)} ₽</td>
                    <td className="p-2 text-red-500 font-medium">-{(Number(staff.debitSum) / 100).toFixed(2)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Reason Table */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Статистика по причинам (Reason Code)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-2">Код причины</th>
                  <th className="p-2">Заявок</th>
                  <th className="p-2">Сумма начислений</th>
                  <th className="p-2">Сумма списаний</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.byReason.map((reason) => (
                  <tr key={reason.code}>
                    <td className="p-2 font-mono font-medium">{reason.code}</td>
                    <td className="p-2">{reason.count}</td>
                    <td className="p-2 text-emerald-500 font-medium">+{(Number(reason.creditSum) / 100).toFixed(2)} ₽</td>
                    <td className="p-2 text-red-500 font-medium">-{(Number(reason.debitSum) / 100).toFixed(2)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

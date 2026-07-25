"use client";

import React, { useState, useEffect } from "react";
import { getBalancePoliciesAction, upsertBalancePolicyAction } from "@/actions/admin/balance-policy";
import Link from "next/link";
import { BALANCE_ADJUSTMENT_REASONS } from "@/constants/balance-adjustments";

interface PolicyItem {
  id: string;
  scopeType: "GLOBAL" | "ROLE" | "USER";
  staffRoleId?: string | null;
  userId?: string | null;
  isActive: boolean;
  enabled: boolean;
  canRequestCredit: boolean;
  canRequestDebit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canViewAll: boolean;
  canViewStats: boolean;
  maxCreditPerRequest: string;
  maxDebitPerRequest: string;
  maxCreditPerDay: string;
  maxDebitPerDay: string;
  maxTotalPerDay: string;
  maxApprovalPerRequest: string;
  allowedCreditReasonCodes: string;
  allowedDebitReasonCodes: string;
  allowedTargetRoles: string;
  requireTicket: boolean;
  requireOrderForDebit: boolean;
  blockBannedTargets: boolean;
  blockDeletedTargets: boolean;
  autoExecuteBelow: string;
}

export default function BalancePoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State for Global Policy
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [canCredit, setCanCredit] = useState(true);
  const [canDebit, setCanDebit] = useState(true);
  const [canApprove, setCanApprove] = useState(true);
  const [maxCreditPerReqRub, setMaxCreditPerReqRub] = useState("5000");
  const [maxDebitPerReqRub, setMaxDebitPerReqRub] = useState("5000");
  const [maxCreditPerDayRub, setMaxCreditPerDayRub] = useState("20000");
  const [maxDebitPerDayRub, setMaxDebitPerDayRub] = useState("20000");
  const [maxApprovalRub, setMaxApprovalRub] = useState("50000");
  const [requireTicket, setRequireTicket] = useState(true);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await getBalancePoliciesAction();
      if (res.success && res.policies) {
        setPolicies(res.policies as unknown as PolicyItem[]);
        const globalPol = res.policies.find((p) => p.scopeType === "GLOBAL");
        if (globalPol) {
          setGlobalEnabled(globalPol.enabled);
          setCanCredit(globalPol.canRequestCredit);
          setCanDebit(globalPol.canRequestDebit);
          setCanApprove(globalPol.canApprove);
          setMaxCreditPerReqRub((Number(globalPol.maxCreditPerRequest) / 100).toString());
          setMaxDebitPerReqRub((Number(globalPol.maxDebitPerRequest) / 100).toString());
          setMaxCreditPerDayRub((Number(globalPol.maxCreditPerDay) / 100).toString());
          setMaxDebitPerDayRub((Number(globalPol.maxDebitPerDay) / 100).toString());
          setMaxApprovalRub((Number(globalPol.maxApprovalPerRequest) / 100).toString());
          setRequireTicket(globalPol.requireTicket);
        }
      }
    } catch (err) {
      console.error("Failed to load policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);

    const existingGlobal = policies.find((p) => p.scopeType === "GLOBAL");

    const formData = new FormData();
    if (existingGlobal) formData.append("id", existingGlobal.id);
    formData.append("scopeType", "GLOBAL");
    formData.append("enabled", globalEnabled ? "true" : "false");
    formData.append("isActive", "true");
    formData.append("canRequestCredit", canCredit ? "true" : "false");
    formData.append("canRequestDebit", canDebit ? "true" : "false");
    formData.append("canApprove", canApprove ? "true" : "false");
    formData.append("canReject", "true");
    formData.append("canViewAll", "true");
    formData.append("canViewStats", "true");
    formData.append("maxCreditPerRequest", (BigInt(Math.round(parseFloat(maxCreditPerReqRub || "0") * 100))).toString());
    formData.append("maxDebitPerRequest", (BigInt(Math.round(parseFloat(maxDebitPerReqRub || "0") * 100))).toString());
    formData.append("maxCreditPerDay", (BigInt(Math.round(parseFloat(maxCreditPerDayRub || "0") * 100))).toString());
    formData.append("maxDebitPerDay", (BigInt(Math.round(parseFloat(maxDebitPerDayRub || "0") * 100))).toString());
    formData.append("maxApprovalPerRequest", (BigInt(Math.round(parseFloat(maxApprovalRub || "0") * 100))).toString());
    formData.append("requireTicket", requireTicket ? "true" : "false");
    formData.append("blockBannedTargets", "true");
    formData.append("blockDeletedTargets", "true");

    BALANCE_ADJUSTMENT_REASONS.CREDIT.forEach((r) => formData.append("allowedCreditReasonCodes", r));
    BALANCE_ADJUSTMENT_REASONS.DEBIT.forEach((r) => formData.append("allowedDebitReasonCodes", r));
    ["USER", "SUPPORT", "MANAGER"].forEach((r) => formData.append("allowedTargetRoles", r));

    try {
      const res = await upsertBalancePolicyAction(formData);
      if (res.success) {
        setMsg("Глобальная политика успешно сохранена!");
        fetchPolicies();
      } else {
        setError(res.error || "Не удалось сохранить политику");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка системы");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Политики корректировки баланса</h1>
          <p className="text-sm text-muted-foreground">
            Глобальные лимиты, роли и персональные переопределения заявок
          </p>
        </div>

        <Link
          href="/admin/finance/balance-requests"
          className="py-2 px-4 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-xs font-medium"
        >
          ← Назад к заявкам
        </Link>
      </div>

      {msg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm">{msg}</div>}
      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">{error}</div>}

      {/* Global Policy Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Глобальная политика (GLOBAL)</h2>
            <p className="text-xs text-muted-foreground">Применяется ко всем сотрудникам, если не задана персональная политика</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={globalEnabled}
              onChange={(e) => setGlobalEnabled(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Включена</span>
          </label>
        </div>

        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={canCredit}
                onChange={(e) => setCanCredit(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-xs font-medium text-foreground">Разрешить запрашивать CREDIT (+)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={canDebit}
                onChange={(e) => setCanDebit(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-xs font-medium text-foreground">Разрешить запрашивать DEBIT (-)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={canApprove}
                onChange={(e) => setCanApprove(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-xs font-medium text-foreground">Разрешить утверждать заявки</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Макс. разовое начисление (₽)
              </label>
              <input
                type="number"
                value={maxCreditPerReqRub}
                onChange={(e) => setMaxCreditPerReqRub(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Макс. разовое списание (₽)
              </label>
              <input
                type="number"
                value={maxDebitPerReqRub}
                onChange={(e) => setMaxDebitPerReqRub(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Дневной лимит начислений (₽)
              </label>
              <input
                type="number"
                value={maxCreditPerDayRub}
                onChange={(e) => setMaxCreditPerDayRub(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Дневной лимит списаний (₽)
              </label>
              <input
                type="number"
                value={maxDebitPerDayRub}
                onChange={(e) => setMaxDebitPerDayRub(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Лимит утверждения за раз (0 = безлимит для OWNER)
              </label>
              <input
                type="number"
                value={maxApprovalRub}
                onChange={(e) => setMaxApprovalRub(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requireTicket}
                  onChange={(e) => setRequireTicket(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-xs font-medium text-foreground">Обязательно требовать Ticket ID</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить глобальные политики"}
          </button>
        </form>
      </div>
    </div>
  );
}

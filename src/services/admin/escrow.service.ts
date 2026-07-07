import { db } from '@/lib/db';
import { runSerializableTransaction } from '@/lib/transactions';
import { WalletOps } from '../financial/wallet-ops';
import { auditAdmin } from '@/lib/admin-audit';
import { sendAdminAlert } from '@/lib/notifications';
import { getClientIp } from '@/utils/ip';

interface AdminContext {
  id: string;
  email: string;
  role: string;
  supportLimitCents: number;
}

/**
 * Returns the start of today in Moscow timezone (UTC+3).
 * All daily trust budget calculations anchor to 00:00 MSK.
 */
export function getMSKMidnightUTC(): Date {
  const now = new Date();
  // Current MSK time components
  const mskOffsetMs = 3 * 60 * 60 * 1000;
  const mskNow = new Date(now.getTime() + mskOffsetMs);
  // Midnight MSK in UTC = today's MSK date at 00:00 minus the offset
  return new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate()) - mskOffsetMs);
}

export class EscrowService {
  /**
   * Evaluates if a manual balance adjustment should be approved immediately 
   * or placed into Escrow Quarantine, based on the Admin's RBAC role and limits.
   * 
   * Business rules:
   * - OWNER/ADMIN: bypass all limits, always APPROVED
   * - Negative amounts (refunds/chargebacks): bypass limits, always APPROVED with logging
   * - SUPPORT/MANAGER positive amounts: checked against daily Trust Budget (supportLimitCents)
   *   - Daily window resets at 00:00 MSK
   */
  async evaluateBalanceAdjustment(
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const isOwnerOrAdmin = admin.role === 'OWNER' || admin.role === 'ADMIN';

    // 2. Owners and Admins bypass all Escrow trust limits except for extreme anomalies (e.g. > 100k RUB)
    if (isOwnerOrAdmin) {
      const ANOMALOUS_LIMIT_CENTS = 10000000; // 100,000 RUB
      if (amountCents > ANOMALOUS_LIMIT_CENTS) {
        await db.$transaction(async (tx) => {
          await this.executeQuarantineAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
        });

        // Trigger critical alert for Owner/Admin anomalous action
        try {
          sendAdminAlert(
            `🚨 [ANOMALY DETECTED] Администратор ${admin.email} (${admin.role}) попытался вручную начислить крупную сумму: ${(amountCents/100).toFixed(2)} ₽.\n` +
            `Операция заблокирована и отправлена в карантин на согласование!`,
            'CRITICAL'
          );
        } catch { /* ignore */ }

        return { status: 'QUARANTINE' as const };
      }

      await this.executeApprovedAdjustment(targetUserId, amountCents, reason, admin);
      return { status: 'APPROVED' as const };
    }

    const todayMSK = getMSKMidnightUTC();

    // 3. Отрицательные корректировки (списание баланса)
    if (amountCents < 0) {
      const absAmount = Math.abs(amountCents);
      const LARGE_DEDUCTION_THRESHOLD = 1000000; // 10,000 RUB в копейках

      if (absAmount > LARGE_DEDUCTION_THRESHOLD) {
        return await runSerializableTransaction(async (tx) => {
          const largeDeductionsToday = await tx.ledgerEntry.count({
            where: {
              adminId: admin.id,
              createdAt: { gte: todayMSK },
              amount: { lte: -LARGE_DEDUCTION_THRESHOLD } // Отрицательные суммы <= -1000000
            }
          });

          if (largeDeductionsToday >= 3) {
            const alertMsg = `🚨 [Escrow Guard] Сотрудник ${admin.email} пытался провести более 3 крупных списаний за день. Операция списания на ${(absAmount/100).toFixed(2)} ₽ заблокирована.`;
            sendAdminAlert(alertMsg, 'CRITICAL');
            throw new Error("Превышен дневной лимит крупных списаний. Операция заблокирована.");
          }

          // Отправляем крупное списание в Карантин (требует аппрува Владельца)
          await this.executeQuarantineAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
          return { status: 'QUARANTINE' as const };
        });
      }

      // Небольшие списания (до 10,000 руб) одобряются автоматически
      await this.executeApprovedAdjustment(targetUserId, amountCents, reason, admin);
      return { status: 'APPROVED' as const };
    }


    // 3. To prevent state-bypass (race conditions), we must evaluate and execute 
    // the trust budget check atomically using Serializable isolation.
    return await runSerializableTransaction(async (tx) => {
      const dailyAdjustments = await tx.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: {
          adminId: admin.id,
          createdAt: { gte: todayMSK },
          amount: { gt: 0 } 
        },
      });

      const totalVolumeToday = Number(dailyAdjustments._sum.amount || 0);

      if (totalVolumeToday + amountCents > admin.supportLimitCents) {
        await this.executeQuarantineAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
        return { status: 'QUARANTINE' as const };
      }

      await this.executeApprovedAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
      return { status: 'APPROVED' as const };
    });
  }

  private async executeApprovedAdjustment(
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    return runSerializableTransaction(async (tx) => {
      return await this.executeApprovedAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
    });
  }

  private async executeApprovedAdjustmentTx(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: targetUserId } });
    const oldBalance = Number(user.balance);
    const newBalance = oldBalance + amountCents;

    // Warn if balance goes negative
    if (newBalance < 0) {
      sendAdminAlert(`⚠️ Внимание: Баланс клиента ${user.email} уйдёт в минус (${(newBalance / 100).toFixed(2)} ₽) после операции на ${(amountCents / 100).toFixed(2)} ₽.`, 'WARNING');
    }

    await WalletOps.adminAdjust(tx, targetUserId, amountCents, reason, { adminId: admin.id });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_CHANGE',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance, delta: amountCents, reason, status: 'AUTO_APPROVED' },
    });
  }

  private async executeQuarantineAdjustmentTx(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: targetUserId } });

    // Add absolute funds to the quarantine bubble instead of main balance
    await tx.user.update({
      where: { id: targetUserId },
      data: { quarantineBalance: { increment: Math.abs(amountCents) } },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: targetUserId,
        adminId: admin.id,
        amount: amountCents,
        reason,
        status: 'QUARANTINE',
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_QUARANTINED',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { quarantineBalance: user.quarantineBalance },
      newValue: { 
        quarantineBalance: Number(user.quarantineBalance) + Math.abs(amountCents), 
        delta: amountCents, 
        reason, 
        status: 'QUARANTINE' 
      },
    });

    // Alert Owner
    const formatMoney = (c: number) => (c / 100).toFixed(2);
    sendAdminAlert(
      `Сработал лимит Escrow Guard.\n\nСотрудник: ${admin.email}\nСумма: ${formatMoney(amountCents)} ₽\nКому: ${user.email}\nПричина: ${reason}\n\nТребуется подтверждение Владельца.`,
      'CRITICAL'
    );
  }

  /**
   * Fetch all pending quarantine transactions for the dashboard
   */
  async getQuarantineEntries() {
    const entries = await db.ledgerEntry.findMany({
      where: { status: 'QUARANTINE' },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = Array.from(new Set(entries.map(e => e.userId)));
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    
    const userMap = new Map(users.map(u => [u.id, u.email]));

    return entries.map(entry => ({
      ...entry,
      amount: Number(entry.amount),
      userEmail: userMap.get(entry.userId) || entry.userId,
    }));
  }

  /**
   * Resolve a quarantined transaction (Owner/Admin only).
   * Uses atomic WHERE clause to prevent double-resolve race condition.
   */
  async resolveQuarantine(
    entryId: string,
    resolution: 'APPROVE' | 'REJECT',
    owner: { id: string; email: string },
    ipAddress?: string
  ) {
    const ip = ipAddress || (await getClientIp('unknown'));
    // Atomic check-and-update: only proceed if status is still QUARANTINE.
    // This prevents the race condition where two Owners click Approve simultaneously.
    await runSerializableTransaction(async (tx) => {
      const updatedEntries = await tx.ledgerEntry.updateMany({
        where: { id: entryId, status: 'QUARANTINE' },
        data: { status: resolution },
      });

      if (updatedEntries.count === 0) {
        throw new Error('Entry already resolved or not found');
      }

      const entry = await tx.ledgerEntry.findUniqueOrThrow({ where: { id: entryId } });
      const user = await tx.user.findUniqueOrThrow({ where: { id: entry.userId } });

      const absAmount = Math.abs(Number(entry.amount));

      const qUpdate = await tx.user.updateMany({
        where: { id: entry.userId, quarantineBalance: { gte: absAmount } },
        data: { quarantineBalance: { decrement: absAmount } },
      });
      if (qUpdate.count === 0) {
        // Quarantine balance already drained (edge case) — force to 0
        await tx.user.update({
          where: { id: entry.userId },
          data: { quarantineBalance: 0 },
        });
      }

      if (resolution === 'APPROVE') {
        const amount = Number(entry.amount);
        await WalletOps.adminAdjust(
          tx,
          entry.userId,
          amount,
          `Разблокировка средств из карантина: ${entry.reason}`,
          { idempotencyKey: `approve_quarantine_${entryId}`, adminId: owner.id }
        );
      }

      await tx.adminAuditLog.create({
        data: {
          adminId: owner.id,
          adminEmail: owner.email,
          action: `QUARANTINE_${resolution}`,
          target: entry.id,
          targetType: 'LEDGER',
          oldValue: JSON.stringify({ status: 'QUARANTINE', userQuarantine: user.quarantineBalance.toString(), userBalance: user.balance.toString() }),
          newValue: JSON.stringify({
            status: resolution,
            userQuarantine: (user.quarantineBalance - BigInt(absAmount)).toString(),
            userBalance: resolution === 'APPROVE' ? (user.balance + BigInt(entry.amount)).toString() : user.balance.toString(),
          }),
          ipAddress: ip
        }
      });
    });
  }
}

export const escrowService = new EscrowService();

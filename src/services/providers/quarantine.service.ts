import { db } from '@/lib/db';
import { sendAdminAlert } from '@/lib/notifications';

export class QuarantineService {
    /**
     * Trigger B: Delayed Cancellation (Silent Failure)
     * Evaluates if a service should be quarantined based on recent cancellations.
     * Rule: In the last 12 hours of order creation, >= 5 CANCELED orders from >= 3 distinct users,
     * AND Cancel Rate > 30%.
     */
    static async evaluateTriggerB(serviceId: string) {
        try {
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

            // Fetch all orders for this service created in the last 12 hours
            const recentOrders = await db.order.findMany({
                where: {
                    serviceId,
                    createdAt: { gte: twelveHoursAgo }
                },
                select: { id: true, userId: true, status: true }
            });

            if (recentOrders.length === 0) return;

            const canceledOrders = recentOrders.filter(o => o.status === 'CANCELED');
            const totalOrdersCount = recentOrders.length;
            const canceledCount = canceledOrders.length;

            if (canceledCount >= 5) {
                const uniqueUsers = new Set(canceledOrders.map(o => o.userId));
                
                if (uniqueUsers.size >= 3) {
                    const cancelRate = canceledCount / totalOrdersCount;
                    
                    if (cancelRate > 0.3) {
                        // TRIGGER B ACTIVATED!
                        const service = await db.service.findUnique({ where: { id: serviceId } });
                        if (service && (!service.cooldownUntil || service.cooldownUntil < new Date())) {
                            let cooldownHours = 0.5; // default 30 mins
                            if (service.cooldownReason === 'DELAYED_CANCEL_STRIKE_1') cooldownHours = 2;
                            else if (service.cooldownReason === 'DELAYED_CANCEL_STRIKE_2') cooldownHours = 12;

                            const newReason = cooldownHours === 0.5 ? 'DELAYED_CANCEL_STRIKE_1' : (cooldownHours === 2 ? 'DELAYED_CANCEL_STRIKE_2' : 'DELAYED_CANCEL_STRIKE_3');
                            const newCooldown = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);

                            await db.service.update({
                                where: { id: service.id },
                                data: {
                                    cooldownUntil: newCooldown,
                                    cooldownReason: newReason
                                }
                            });

                            console.warn(`[ElasticQuarantine] Trigger B fired for Service ${service.id}. Cancel rate: ${(cancelRate*100).toFixed(1)}%. Cooldown until ${newCooldown.toISOString()}`);
                            await sendAdminAlert(`🚨 [Quarantine] Услуга ${service.id} ушла в карантин (Тихая отмена). Отмен за 12ч: ${canceledCount}/${totalOrdersCount} (${(cancelRate*100).toFixed(1)}%) от ${uniqueUsers.size} юзеров.`);
                        }
                    }
                }
            }

        } catch (error) {
            console.error(`[QuarantineService] Failed to evaluate Trigger B for ${serviceId}:`, error);
        }
    }

    /**
     * Restore Expired Quarantines (Cron Job)
     * Automatically clears cooldownUntil for services whose backoff period has expired.
     */
    static async restoreExpiredQuarantines() {
        try {
            const expired = await db.service.findMany({
                where: {
                    cooldownUntil: { lt: new Date() }
                },
                select: { id: true, name: true }
            });

            if (expired.length === 0) return;

            const ids = expired.map(s => s.id);

            await db.service.updateMany({
                where: { id: { in: ids } },
                data: {
                    cooldownUntil: null
                    // Note: We deliberately leave cooldownReason intact so we remember what strike level they were at,
                    // allowing us to escalate properly (e.g. STRIKE_2 -> STRIKE_3) if they fail again.
                }
            });

            console.log(`[ElasticQuarantine] Restored ${expired.length} expired quarantined services: ${ids.join(', ')}`);
            await sendAdminAlert(`✅ [Quarantine] Карантин снят с ${expired.length} услуг. Они снова доступны для заказа.\n${expired.map(s => `- ${s.name}`).join('\n')}`, 'INFO');

        } catch (error) {
            console.error('[QuarantineService] Failed to restore expired quarantines:', error);
        }
    }
}

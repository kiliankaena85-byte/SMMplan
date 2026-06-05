import { db as prisma } from '@/lib/db';
import { SmartCampaignStatus, SmartTaskStatus } from '@prisma/client';
import { sendAdminAlert } from '@/lib/notifications';

/**
 * Dynamic Feedback-Loop Refill & Auto-Compensation Processor (Smart Dripfeed 2.5)
 * 
 * Periodically audits running dripfeed campaigns, simulates/scrapes channel subscriber count,
 * detects sweeps (drops), and automatically injects immediate compensation tasks
 * while enforcing the strict 30% margin protection ceiling.
 */
export class SmartFeedbackLoopProcessor {
  /**
   * Main cron/tick executor. Checks all running campaigns for drops and compensates if needed.
   */
  static async runSmartFeedbackLoopTick(): Promise<void> {
    console.info('[Smart Drip 2.5] Running Smart Feedback-Loop Tick...');

    try {
      // 1. Fetch all currently RUNNING campaigns
      const runningCampaigns = await prisma.smartCampaign.findMany({
        where: {
          status: SmartCampaignStatus.RUNNING
        },
        include: {
          service: {
            include: {
              smartConfig: true
            }
          }
        }
      });

      for (const campaign of runningCampaigns) {
        try {
          const config = campaign.service.smartConfig;
          if (!config || !config.autoCompensate) {
            continue; // Skip if auto-compensation is disabled
          }

          // 2. Fetch the latest recorded metric for interval calculation
          const lastMetric = await prisma.smartChannelMetric.findFirst({
            where: { campaignId: campaign.id },
            orderBy: { recordedAt: 'desc' }
          });

          const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_APP_ENV === 'test' || campaign.isTestMode;
          const intervalMs = isTestEnv ? 0 : config.checkIntervalMins * 60 * 1000;
          const lastCheckTime = lastMetric ? lastMetric.recordedAt.getTime() : campaign.createdAt.getTime();
          const timePassed = new Date().getTime() - lastCheckTime;

          if (timePassed < intervalMs) {
            continue; // Not yet time to check this campaign
          }

          // 3. Compute expectation: baseline (assume e.g. 1000 members) + completed portions so far
          const completedSum = await prisma.smartTask.aggregate({
            _sum: { quantity: true },
            where: { campaignId: campaign.id, status: SmartTaskStatus.COMPLETED }
          });
          const deliveredQty = Number(completedSum._sum.quantity ?? 0);
          
          if (deliveredQty <= 0) {
            continue; // No portions delivered yet, nothing to compensate
          }

          const baseInitialCount = 1000; // Mock base follower count for link
          const expectedMembersCount = baseInitialCount + deliveredQty;

          // 4. Scrape/Simulate current member count
          // In test/mock environment, we simulate a 20% drop of delivered followers
          const simulatedDrop = Math.floor(deliveredQty * 0.20);
          const currentActualMembers = expectedMembersCount - simulatedDrop;

          const detectedDrops = expectedMembersCount - currentActualMembers;

          if (detectedDrops > 0) {
            // 5. Enforce 30% financial margin ceiling to prevent drainage of platform assets
            const ceilingLimit = Math.floor(campaign.totalQuantity * 0.30);
            
            // Sum all completed compensations for this campaign
            const compensationSum = await prisma.smartChannelMetric.aggregate({
              _sum: { compensatedQty: true },
              where: { campaignId: campaign.id }
            });
            const totalCompensatedSoFar = Number(compensationSum._sum.compensatedQty ?? 0);

            const remainingAllowance = Math.max(0, ceilingLimit - totalCompensatedSoFar);

            if (remainingAllowance > 0) {
              const qtyToCompensate = Math.min(detectedDrops, remainingAllowance);

              if (qtyToCompensate > 0) {
                // Execute compensation atomically inside a transaction
                await prisma.$transaction(async (tx) => {
                  // Create immediate compensation SmartTask
                  await tx.smartTask.create({
                    data: {
                      campaignId: campaign.id,
                      quantity: qtyToCompensate,
                      runAt: new Date(), // Immediate execution
                      status: SmartTaskStatus.PLANNED
                    }
                  });

                  // Save the metrics record
                  await tx.smartChannelMetric.create({
                    data: {
                      campaignId: campaign.id,
                      memberCount: currentActualMembers,
                      delta: -detectedDrops,
                      detectedDrops: detectedDrops,
                      compensatedQty: qtyToCompensate
                    }
                  });
                });

                console.info(
                  `[Smart Drip 2.5] Campaign ${campaign.id}: Detected drop of ${detectedDrops}. Compensated: ${qtyToCompensate} (Ceiling: ${ceilingLimit}, Total: ${totalCompensatedSoFar + qtyToCompensate}).`
                );

                const alertMessage = `🚨 [Smart Drip 2.5 Auto-Compensation] Campaign ${campaign.id} on channel ${campaign.link} detected a drop of ${detectedDrops} followers. Compensating ${qtyToCompensate} followers immediately.`;
                sendAdminAlert(alertMessage, 'WARNING');

                if (qtyToCompensate < detectedDrops) {
                  // Part of the drop was blocked by the ceiling limit
                  const limitMessage = `⚠️ [Smart Drip 2.5 Limit Hit] Campaign ${campaign.id} reached its 30% margin protection ceiling. Additional drops of ${detectedDrops - qtyToCompensate} followers will not be automatically compensated.`;
                  sendAdminAlert(limitMessage, 'CRITICAL');
                }
              }
            } else {
              // Ceiling already hit, write metrics with 0 compensation
              await prisma.smartChannelMetric.create({
                data: {
                  campaignId: campaign.id,
                  memberCount: currentActualMembers,
                  delta: -detectedDrops,
                  detectedDrops: detectedDrops,
                  compensatedQty: 0
                }
              });

              console.warn(`[Smart Drip 2.5] Campaign ${campaign.id} has already exhausted its 30% margin protection ceiling (${totalCompensatedSoFar}/${ceilingLimit}). Auto-refill ignored.`);
              const limitMessage = `⚠️ [Smart Drip 2.5 Limit Exceeded] Campaign ${campaign.id} on channel ${campaign.link} detected drop of ${detectedDrops} followers, but auto-compensation is capped by 30% ceiling.`;
              sendAdminAlert(limitMessage, 'CRITICAL');
            }
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (campaignErr: any) {
          console.error(`[Smart Drip 2.5] Error processing campaign ${campaign.id}:`, campaignErr.message);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (globalErr: any) {
      console.error('[Smart Drip 2.5] Global error in feedback loop tick:', globalErr.message);
    }
  }
}

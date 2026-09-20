export const dynamic = 'force-dynamic';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { ApiDashboardClient } from '@/components/dashboard/settings/api/ApiDashboardClient';

export const metadata = {
  title: 'API и вебхуки | Настройки | SMMplan',
  description: 'Управление API-ключом, вебхуками и интеграционная документация API v2.',
};

export default async function ApiSettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      apiKeyHash: true,
      apiConfig: {
        select: {
          webhookUrl: true,
          webhookSecret: true,
          isWebhookActive: true,
        },
      },
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ApiDashboardClient
        hasKey={!!user.apiKeyHash}
        webhookInitialData={
          user.apiConfig
            ? {
                webhookUrl: user.apiConfig.webhookUrl,
                webhookSecret: user.apiConfig.webhookSecret,
                isWebhookActive: user.apiConfig.isWebhookActive,
              }
            : undefined
        }
      />
    </div>
  );
}

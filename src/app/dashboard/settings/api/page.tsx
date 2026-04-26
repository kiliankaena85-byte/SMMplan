export const dynamic = 'force-dynamic';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ApiKeyManager from './ApiKeyManager';

export const metadata = {
  title: 'API-ключ | Smmplan',
};

export default async function ApiSettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/login'); // P0.2 fix: was '/auth' → 404

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { apiKey: true },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API-доступ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Управляйте API-ключом для интеграции с внешними системами
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">B2B Reseller API</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Используйте API-ключ для заказа услуг Smmplan из ваших собственных систем
          </p>
        </div>
        <div className="p-5">
          <ApiKeyManager currentKey={user.apiKey} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Документация</h3>
        </div>
        <div className="p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Endpoint:</span>{' '}
            <code className="bg-muted px-2 py-0.5 rounded-lg text-xs font-mono">
              POST /api/v2
            </code>
          </p>
          <p>
            <span className="font-semibold text-foreground">Заголовок:</span>{' '}
            <code className="bg-muted px-2 py-0.5 rounded-lg text-xs font-mono">
              X-API-Key: {'<ваш ключ>'}
            </code>
          </p>
          <div className="bg-muted rounded-xl p-4 font-mono text-xs leading-relaxed">
            {`curl -X POST /api/v2 \\
  -H "X-API-Key: <key>" \\
  -d "action=services"`}
          </div>
        </div>
      </div>
    </div>
  );
}

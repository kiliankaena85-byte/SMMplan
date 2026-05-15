import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PagesTable } from './client-table';

export const dynamic = 'force-dynamic';

export default async function AdminPagesList() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CMS Pages</h1>
          <p className="text-muted-foreground">Manage textual content for the public website.</p>
        </div>
        <Link href="/admin/pages/new" className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
          Create New Page
        </Link>
      </div>

      <div className="rounded-2xl shadow-sm bg-card overflow-hidden">
        <PagesTable pages={pages as any} />
      </div>
    </div>
  );
}


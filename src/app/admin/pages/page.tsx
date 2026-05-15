import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';

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
        <Table aria-label="CMS Pages">
          <TableHeader>
            <TableColumn>TITLE</TableColumn>
            <TableColumn>SLUG</TableColumn>
            <TableColumn>UPDATED AT</TableColumn>
            <TableColumn className="text-right">ACTION</TableColumn>
          </TableHeader>
          <TableBody renderEmptyState={() => "No pages found. Click 'Create New Page'."}>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell>
                  <span className="font-bold text-foreground">{page.title}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-muted-foreground text-xs">/{page.slug}</span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {page.updatedAt.toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/p/${page.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      Preview
                    </Link>
                    <Link href={`/admin/pages/${page.slug}`} className="text-primary hover:underline transition-colors font-medium text-sm">
                      Edit
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


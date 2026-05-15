'use client';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import Link from 'next/link';

type PageType = {
  id: string;
  title: string;
  slug: string;
  updatedAt: Date;
};

export function PagesTable({ pages }: { pages: PageType[] }) {
  return (
    <>
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
                  {new Date(page.updatedAt).toLocaleDateString()}
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
    </>
  );
}

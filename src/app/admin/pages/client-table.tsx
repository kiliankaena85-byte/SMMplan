'use client';

import { Table } from '@/components/admin/hero-ui';
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
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="CMS Pages">
            <Table.Header>
              <Table.Column>TITLE</Table.Column>
              <Table.Column>SLUG</Table.Column>
              <Table.Column>UPDATED AT</Table.Column>
              <Table.Column className="text-right">ACTION</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => "No pages found. Click 'Create New Page'."}>
              {pages.map((page) => (
                <Table.Row key={page.id}>
                  <Table.Cell>
                    <span className="font-bold text-foreground">{page.title}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-mono text-muted-foreground text-xs">/{page.slug}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/p/${page.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                        Preview
                      </Link>
                      <Link href={`/admin/pages/${page.slug}`} className="text-primary hover:underline transition-colors font-medium text-sm">
                        Edit
                      </Link>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </>
  );
}
